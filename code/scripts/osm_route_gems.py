# osm_route_gems.py
import requests
import json
import geopandas as gpd
from shapely.geometry import Point, LineString, Polygon, box
import random
import warnings
import numpy as np
import pandas as pd
from geocoder import geocode_place
import os
from math import radians, cos, sin, asin, sqrt

# Suppress warnings
warnings.filterwarnings("ignore", message="Passing a SingleBlockManager to Series is deprecated")

def haversine(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    
    # Haversine formula
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a)) 
    r = 6371  # Radius of earth in kilometers
    return c * r

def create_route_buffer(origin_coords, destination_coords, buffer_distance_km=30):
    """
    Create a buffer around the direct line between origin and destination.
    
    Parameters:
    -----------
    origin_coords: [lon, lat]
    destination_coords: [lon, lat]
    buffer_distance_km: float, distance in kilometers
    
    Returns:
    --------
    buffer_polygon: Polygon
    bounding_box: tuple (min_lat, min_lon, max_lat, max_lon)
    """
    # Create LineString for the route
    route_line = LineString([origin_coords, destination_coords])
    
    # Create buffer (degrees of longitude/latitude approximately)
    # This is a rough approximation - 1 degree is about 111 km
    buffer_distance_deg = buffer_distance_km / 111
    
    # Create buffer
    buffer_polygon = route_line.buffer(buffer_distance_deg)
    
    # Get bounding box
    min_lon, min_lat, max_lon, max_lat = buffer_polygon.bounds
    
    return buffer_polygon, (min_lat, min_lon, max_lat, max_lon)

def download_osm_along_route(origin_coords, destination_coords, buffer_distance_km=30, tags=None):
    """
    Download OpenStreetMap data along a route.
    
    Parameters:
    -----------
    origin_coords: [lon, lat]
    destination_coords: [lon, lat]
    buffer_distance_km: float, distance in kilometers
    tags: dict, optional
        A dictionary of OSM tags to filter by
    
    Returns:
    --------
    data: dict
        The raw OSM data as returned by the Overpass API.
    """
    # Create route buffer
    buffer_polygon, bbox = create_route_buffer(origin_coords, destination_coords, buffer_distance_km)
    
    # Download data within the bbox
    return download_osm_data(bbox, tags)

def download_osm_data(bbox, tags=None):
    """
    Download OpenStreetMap data within a bounding box using the Overpass API.
    
    Parameters:
    -----------
    bbox: tuple
        Bounding box as (min_lat, min_lon, max_lat, max_lon).
    tags: dict, optional
        A dictionary of OSM tags to filter by (e.g., {"amenity": "restaurant"}).
        If None, all elements will be downloaded.
    
    Returns:
    --------
    data: dict
        The raw OSM data as returned by the Overpass API.
    """
    min_lat, min_lon, max_lat, max_lon = bbox
    
    # Overpass API endpoint
    overpass_url = "https://overpass-api.de/api/interpreter"
    
    # Construct the query
    if tags:
        # Create tag filter
        tag_parts = []
        for key, value in tags.items():
            if value is None:
                # Search for any feature with this tag key
                node_query = f'node["{key}"]({min_lat},{min_lon},{max_lat},{max_lon});'
                way_query = f'way["{key}"]({min_lat},{min_lon},{max_lat},{max_lon});'
                relation_query = f'relation["{key}"]({min_lat},{min_lon},{max_lat},{max_lon});'
            else:
                # Search for feature with this specific tag:value
                node_query = f'node["{key}"="{value}"]({min_lat},{min_lon},{max_lat},{max_lon});'
                way_query = f'way["{key}"="{value}"]({min_lat},{min_lon},{max_lat},{max_lon});'
                relation_query = f'relation["{key}"="{value}"]({min_lat},{min_lon},{max_lat},{max_lon});'
            
            tag_parts.append(node_query)
            tag_parts.append(way_query)
            tag_parts.append(relation_query)
        
        # Join all tag parts
        elements_query = ''.join(tag_parts)
        
        query = f"""
        [out:json][timeout:60];
        (
          {elements_query}
        );
        out body;
        """
    else:
        # Get all elements
        query = f"""
        [out:json][timeout:60];
        (
          node({min_lat},{min_lon},{max_lat},{max_lon});
          way({min_lat},{min_lon},{max_lat},{max_lon});
          relation({min_lat},{min_lon},{max_lat},{max_lon});
        );
        out body;
        """
    
    # Make the request
    print(f"Downloading OSM data for bounding box ({min_lat},{min_lon},{max_lat},{max_lon})...")
    
    response = requests.post(overpass_url, data={'data': query})
    
    # Check for errors
    if response.status_code != 200:
        print(f"Error: Status code {response.status_code}")
        print(f"Response: {response.text}")
        return {"elements": []}
    
    # Parse the response
    try:
        data = response.json()
        print(f"Downloaded {len(data.get('elements', []))} elements")
        return data
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response: {e}")
        print(f"Response text: {response.text[:200]}...")  # Print first 200 chars of response
        return {"elements": []}

def get_common_osm_tags():
    """Returns dictionary of common OSM tag groups with their common values."""
    return {
        'leisure': [
            'park', 'garden', 'nature_reserve', 
          
            'bird_hide'
          
        ],
        'amenity': [
            # Food & Drink
            'restaurant', 'cafe',
            
            # Education & Culture
            'library', 'museum', 'theatre', 'arts_centre',
            'community_centre',
            
            # Recreation
            'picnic_site', 'viewpoint'
        ],
        'natural': [
            'beach','cave_entrance', 'peak',
            'hot_spring', 'waterfall', 'glacier'
        ],
        'historic': [
            'monument', 'memorial', 'archaeological_site', 'ruins', 'castle',
            'fort', 'battlefield', 'wreck', 'aircraft_wreck', 'wayside_cross',
            'wayside_shrine', 'building', 'church'
        ]
    }

def filter_for_hidden_gems(gdf, popularity_threshold=30, categories=None, required_properties=None):
    """
    Filter the GeoDataFrame to find potential hidden gems.
    
    Parameters:
    -----------
    gdf: GeoDataFrame
        A GeoDataFrame containing OSM data.
    popularity_threshold: int
        Maximum popularity score for hidden gems.
    categories: dict, optional
        Dictionary with keys as category tags and values as lists of types to keep.
    required_properties: list, optional
        List of properties that must be present for a gem to be included.
        
    Returns:
    --------
    hidden_gems: GeoDataFrame
        A GeoDataFrame containing potential hidden gems.
    """
    if gdf.empty:
        return gdf
    
    # Copy the DataFrame to avoid modifying the original
    filtered_gdf = gdf.copy()
    
    # Filter out places missing required properties
    if required_properties:
        for prop in required_properties:
            filtered_gdf = filtered_gdf[filtered_gdf[prop].notna() & (filtered_gdf[prop] != '')]
    
    # Add popularity scores
    if 'popularity_score' not in filtered_gdf.columns:
        filtered_gdf['popularity_score'] = [
            random.randint(1, 100) if random.random() > 0.2 else None 
            for _ in range(len(filtered_gdf))
        ]
    
    # Filter by popularity threshold
    mask = (filtered_gdf['popularity_score'] < popularity_threshold) | filtered_gdf['popularity_score'].isna()
    filtered_gdf = filtered_gdf[mask]
    
    # Filter by specified categories
    if categories:
        category_masks = []
        for category, values in categories.items():
            if values:
                # Keep places with this category and the specified values
                category_masks.append(filtered_gdf[category].isin(values))
            else:
                # Keep all places with this category
                category_masks.append(pd.notna(filtered_gdf[category]))
        
        if category_masks:
            # Combine all category masks with OR
            combined_mask = category_masks[0]
            for mask in category_masks[1:]:
                combined_mask = combined_mask | mask
            
            filtered_gdf = filtered_gdf[combined_mask]
    
    return filtered_gdf

def convert_osm_to_geodataframe(data, keep_tags=None):
    """
    Convert raw OSM data to a GeoDataFrame for easier analysis.
    
    Parameters:
    -----------
    data: dict
        The raw OSM data as returned by the Overpass API.
    keep_tags: list, optional
        List of tag keys to keep (e.g., ['amenity', 'leisure']).
        If None, all tags will be kept.
        
    Returns:
    --------
    gdf: GeoDataFrame
        A GeoDataFrame containing the OSM data.
    """
    elements = data.get('elements', [])
    
    print(f"Processing {len(elements)} elements from raw OSM data")
    
    # Extract nodes (points)
    features = []
    
    # First, build a dictionary of all nodes for reference
    nodes = {}
    for element in elements:
        if element['type'] == 'node':
            nodes[element['id']] = {
                'lat': element['lat'],
                'lon': element['lon']
            }
    
    # Process all elements
    for element in elements:
        # Skip nodes without tags
        if element['type'] == 'node' and 'tags' not in element:
            continue
        
        # Get tags
        tags = element.get('tags', {})
        
        # Filter tags if requested
        filtered_tags = {}
        if keep_tags:
            for k, v in tags.items():
                if k in keep_tags or k == 'name':
                    filtered_tags[k] = v
            
            # Skip elements that don't have any of our requested tags
            if not any(k in keep_tags for k in tags.keys()):
                continue
        else:
            filtered_tags = tags
        
        # Create feature properties
        properties = {
            'id': element['id'],
            'type': element['type'],
            **filtered_tags  # Use filtered tags here
        }
        
        # Create geometry
        if element['type'] == 'node':
            geometry = Point(element['lon'], element['lat'])
            features.append({
                'geometry': geometry,
                'properties': properties
            })
        elif element['type'] == 'way' and 'nodes' in element:
            # For ways, we'll just use the first node's location for simplicity
            # A more complex implementation would create LineString or Polygon geometries
            if element['nodes']:
                first_node_id = element['nodes'][0]
                if first_node_id in nodes:
                    node = nodes[first_node_id]
                    geometry = Point(node['lon'], node['lat'])
                    features.append({
                        'geometry': geometry,
                        'properties': properties
                    })
    
    print(f"Created features for {len(features)} elements after filtering")
    
    # Create GeoDataFrame
    if features:
        geometries = [f['geometry'] for f in features]
        properties = [f['properties'] for f in features]
        
        gdf = gpd.GeoDataFrame(properties, geometry=geometries)
        return gdf
    else:
        return gpd.GeoDataFrame()

def get_gems_along_route(origin_coords, destination_coords, buffer_distance_km=30, 
                        popularity_threshold=30, max_gems=20, user_preferences=None):
    """
    Get hidden gems along a route.
    
    Parameters:
    -----------
    origin_coords: [lon, lat]
    destination_coords: [lon, lat]
    buffer_distance_km: float, distance in kilometers
    popularity_threshold: int, maximum popularity score for hidden gems
    max_gems: int, maximum number of gems to return
    user_preferences: dict, user preferences to filter gems
    
    Returns:
    --------
    gems: list of dict, list of gems
    """
    # Get common OSM tags
    common_tags = get_common_osm_tags()
    
    # Define categories to search
    category_tags = {
        'leisure': None,
        'amenity': None,
        'natural': None,
        'historic': None
    }
    
    # Download OSM data along route
    data = download_osm_along_route(
        origin_coords, destination_coords, 
        buffer_distance_km, 
        tags=category_tags
    )
    
    # Convert to GeoDataFrame
    keep_tags = list(category_tags.keys()) + ['name', 'wheelchair', 'opening_hours']
    gdf = convert_osm_to_geodataframe(data, keep_tags=keep_tags)
    
    # Filter for hidden gems
    hidden_gems = filter_for_hidden_gems(
        gdf,
        popularity_threshold=popularity_threshold,
        categories=common_tags
    )
    
    # Add distance to route
    route_line = LineString([origin_coords, destination_coords])
    hidden_gems['distance_to_route'] = hidden_gems.geometry.apply(
        lambda geom: route_line.distance(geom) * 111  # Rough conversion to km
    )
    
    # Filter by user preferences if provided
    if user_preferences:
        # Here we would implement filtering based on user preferences
        # For example, filtering by activity types, accessibility, etc.
        pass
    
    # Sort by distance to route
    hidden_gems = hidden_gems.sort_values('distance_to_route')
    
    # Convert to list of dictionaries for easy JSON serialization
    gems = []
    for idx, gem in hidden_gems.head(max_gems).iterrows():
        # Format subcategory
        category = None
        subcategory = None
        
        if pd.notna(gem.get('leisure')):
            category = 'leisure'
            subcategory = gem['leisure']
        elif pd.notna(gem.get('amenity')):
            category = 'amenity'
            subcategory = gem['amenity']
        elif pd.notna(gem.get('natural')):
            category = 'natural'
            subcategory = gem['natural']
        elif pd.notna(gem.get('historic')):
            category = 'historic'
            subcategory = gem['historic']
        
        # Format subcategory string
        formatted_subcategory = ' '.join(word.capitalize() for word in subcategory.split('_')) if subcategory else 'Unknown'
        
        # Calculate detour time (rough estimate)
        detour_minutes = int(gem['distance_to_route'] * 2)  # 2 minutes per km as a rough estimate
        
        # Create gem object
        gem_obj = {
            'id': f"gem-{idx}",
            'title': gem.get('name', f"Unnamed {formatted_subcategory}"),
            'address': f"Near route, {gem['distance_to_route']:.1f} km from direct path",
            'hours': gem.get('opening_hours', "Unknown hours"),
            'category': category,
            'subcategory': subcategory,
            'formatted_subcategory': formatted_subcategory,
            'coordinates': [float(gem.geometry.x), float(gem.geometry.y)],
            'description': generate_description(category, subcategory, gem),
            'detourTime': f"{detour_minutes} mins",
            'popularity': gem.get('popularity_score', 0),
            'tags': generate_tags(category, subcategory, gem),
            'accessibility': {
                'wheelchair': gem.get('wheelchair', 'unknown'),
                'has_facilities': gem.get('toilets') == 'yes'
            }
        }
        
        gems.append(gem_obj)
    
    return gems

def generate_description(category, subcategory, props):
    """Generate a description for a gem based on its attributes."""
    # Default description parts
    parts = []
    
    # Determine if it's undiscovered
    is_unnamed = not props.get('name') or props.get('name') == ''
    is_undiscovered = is_unnamed or props.get('popularity_score') == 0 or props.get('popularity_score') is None
    
    # Add discovery status
    if is_undiscovered:
        parts.append("An undiscovered local secret")
    else:
        parts.append("A hidden gem known to few locals")
    
    # Add category-specific descriptions
    if category == 'leisure':
        if subcategory == 'park':
            parts.append("A peaceful park space perfect for unwinding")
        elif subcategory == 'garden':
            parts.append("A charming garden with various plant species")
        elif subcategory in ['swimming_pool', 'swimming_area']:
            parts.append("A refreshing spot for swimming away from the crowds")
        elif subcategory == 'picnic_site':
            parts.append("An ideal location for a relaxing picnic")
    elif category == 'natural':
        if subcategory == 'beach':
            parts.append("A secluded beach area off the usual tourist path")
        elif subcategory == 'peak':
            parts.append("Offers panoramic views of the surrounding landscape")
        elif subcategory in ['water', 'waterfall']:
            parts.append("A serene water feature in a natural setting")
        elif subcategory == 'tree':
            parts.append("A remarkable tree with special characteristics")
        else:
            parts.append("A natural feature worth exploring")
    elif category == 'historic':
        if subcategory in ['monument', 'memorial']:
            parts.append("A historical monument with local significance")
        elif subcategory == 'archaeological_site':
            parts.append("An archeological site with historical importance")
        elif subcategory == 'ruins':
            parts.append("Interesting ruins from a bygone era")
        else:
            parts.append("A piece of history waiting to be discovered")
    elif category == 'amenity':
        if subcategory == 'cafe':
            parts.append("A cozy cafe with character and charm")
        elif subcategory == 'restaurant':
            parts.append("A local eatery off the beaten path")
        elif subcategory == 'viewpoint':
            parts.append("Offers spectacular views worth the visit")
        else:
            parts.append("A local amenity that tourists often miss")
    
    # Add accessibility information
    if props.get('wheelchair') == 'yes':
        parts.append("Wheelchair accessible")
    elif props.get('wheelchair') == 'limited':
        parts.append("Limited wheelchair accessibility")
    
    return parts[0] + ". " + parts[1] + "."

def generate_tags(category, subcategory, props):
    """Generate tags for a gem based on its category and subcategory."""
    tags = []
    
    # Activity tags
    if category == 'leisure':
        if subcategory in ['park', 'garden']:
            tags.extend(['nature', 'relaxing'])
        elif subcategory in ['swimming_pool', 'swimming_area']:
            tags.append('swimming')
        elif subcategory in ['picnic_site', 'picnic_table']:
            tags.append('picnic')
    elif category == 'natural':
        tags.append('nature')
        if subcategory == 'beach':
            tags.append('swimming')
        elif subcategory in ['peak', 'viewpoint']:
            tags.extend(['views', 'photography'])
        elif subcategory in ['water', 'waterfall']:
            tags.append('photography')
    elif category == 'historic':
        tags.append('history')
        if subcategory in ['monument', 'memorial']:
            tags.append('photography')
    elif category == 'amenity':
        if subcategory == 'cafe':
            tags.append('coffee')
        elif subcategory == 'restaurant':
            tags.append('food')
        elif subcategory == 'viewpoint':
            tags.extend(['views', 'photography'])
    
    # Accessibility tags
    if props.get('wheelchair') == 'yes':
        tags.append('wheelchair')
    
    # Effort level tag
    tags.append('easy-trails')  # Default to easy, can be modified based on data
    
    return list(set(tags))  # Remove duplicates

# Add this function to osm_route_gems.py
def load_featured_gems_json(json_path):
    """
    Load featured gems from a JSON file
    
    Parameters:
    -----------
    json_path: str
        Path to the JSON file
        
    Returns:
    --------
    featured_gems: list
        List of featured gems
    """
    try:
        with open(json_path, 'r') as f:
            featured_gems = json.load(f)
        return featured_gems
    except Exception as e:
        print(f"Error loading featured gems: {e}")
        return []
    


if __name__ == "__main__":
    # Example usage
    origin = [-122.2, 37.8]  # Example: Berkeley
    destination = [-121.8, 37.6]  # Example: Pleasanton
    
    gems = get_gems_along_route(origin, destination, buffer_distance_km=20)
    
    # Print result
    print(f"Found {len(gems)} hidden gems along the route")
    for gem in gems:
        print(f"- {gem['title']} ({gem['formatted_subcategory']}): {gem['description']}")
    
    # Save as JSON
    with open('route_hidden_gems.json', 'w') as f:
        json.dump(gems, f, indent=2)

def generate_hidden_gems_between_locations(origin_name, destination_name, output_file=None, max_gems=50):
    """
    Generate hidden gems between two locations
    
    Parameters:
    -----------
    origin_name: str
        Name of the origin location
    destination_name: str
        Name of the destination location
    output_file: str, optional
        Path to output file, if None, a default name will be generated
    max_gems: int
        Maximum number of gems to include
        
    Returns:
    --------
    list: List of hidden gems
    """
    print(f"Generating hidden gems between {origin_name} and {destination_name}")
    
    # Geocode locations
    origin_coords = geocode_place(origin_name)
    destination_coords = geocode_place(destination_name)
    
    if not origin_coords or not destination_coords:
        print("Error: Failed to geocode one or both locations")
        return []
    
    # Default output file if none provided
    if not output_file:
        # Clean location names for filename
        origin_clean = origin_name.lower().replace(' ', '_').replace(',', '')
        dest_clean = destination_name.lower().replace(' ', '_').replace(',', '')
        output_file = f"{origin_clean}_{dest_clean}_hidden_gems_custom_schema.json"
    
    # Create route buffer
    buffer_polygon, bbox = create_route_buffer(origin_coords, destination_coords, buffer_km=30)
    
    # Define categories to search
    category_tags = {
        'leisure': None,
        'amenity': None,
        'natural': None,
        'historic': None
    }
    
    # Download OSM data
    osm_data = download_osm_data(bbox, tags=category_tags)
    
    # Convert to GeoDataFrame
    keep_tags = list(category_tags.keys()) + ['name', 'wheelchair', 'opening_hours']
    gdf = convert_osm_to_geodataframe(osm_data, keep_tags=keep_tags)
    
    # Filter for hidden gems
    common_tags = get_common_osm_tags()
    hidden_gems = filter_for_hidden_gems(
        gdf,
        popularity_threshold=30,
        categories=common_tags
    )
    
    # Limit number of gems if needed
    if len(hidden_gems) > max_gems:
        hidden_gems = hidden_gems.sample(max_gems, random_state=42)
    
    # Save to custom schema JSON
    custom_gems = save_hidden_gems_with_custom_schema(hidden_gems, output_file)
    
    print(f"Generated {len(custom_gems)} hidden gems between {origin_name} and {destination_name}")
    print(f"Results saved to: {output_file}")
    
    return custom_gems