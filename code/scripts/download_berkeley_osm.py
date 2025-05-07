import requests
import json
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point, Polygon
import random
import warnings

# Suppress the pandas deprecation warning
warnings.filterwarnings("ignore", message="Passing a SingleBlockManager to Series is deprecated")

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
    print(f"Query: {query}")  # Print query for debugging
    
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
    """
    Returns dictionary of common OSM tag groups with their common values.
    This helps in making informed choices before querying OSM.
    
    Returns:
    --------
    Dict: Dictionary with common OSM tag groups and their values
    """
    # Common tag values compiled from OSM Wiki
    return {
        'leisure': [
            'park', 'garden', 'nature_reserve', 'playground', 'pitch',
            'sports_centre', 'swimming_pool', 'track', 'dog_park',
            'fitness_station', 'common', 'picnic_table', 'marina',
            'slipway', 'bird_hide', 'beach_resort', 'fishing', 'firepit',
            'outdoor_seating', 'swimming_area', 'recreation_ground'
        ],
        'amenity': [
            # Food & Drink
            'restaurant', 'cafe', 'pub', 'bar', 'fast_food', 'food_court', 'ice_cream',
            
            # Education & Culture
            'library', 'school', 'university', 'college', 'museum', 'theatre', 'arts_centre',
            'community_centre',
            
            # Health & Emergency
            'hospital', 'doctors', 'dentist', 'pharmacy', 'veterinary', 'fire_station', 'police',
            
            # Transportation
            'parking', 'bicycle_parking', 'bicycle_rental', 'charging_station', 'fuel', 
            'bus_station',
            
            # Utilities & Services
            'post_office', 'bank', 'atm', 'toilets', 'shower', 'drinking_water', 'recycling',
            'marketplace',
            
            # Recreation
            'bbq', 'bench', 'picnic_site', 'viewpoint'
        ],
        'natural': [
            'beach', 'water', 'wood', 'tree', 'cliff', 'cave_entrance', 'peak',
            'volcano', 'bay', 'spring', 'hot_spring', 'waterfall', 'glacier',
            'wetland', 'sand', 'scrub', 'heath', 'grassland', 'fell', 'rock',
            'stone', 'sinkhole'
        ],
        'historic': [
            'monument', 'memorial', 'archaeological_site', 'ruins', 'castle',
            'fort', 'battlefield', 'wreck', 'aircraft_wreck', 'wayside_cross',
            'wayside_shrine', 'building', 'church'
        ]
    }

def analyze_osm_data(data):
    """
    Analyze the OSM data to identify what types of tags are available.
    
    Parameters:
    -----------
    data: dict
        The raw OSM data as returned by the Overpass API.
        
    Returns:
    --------
    tag_analysis: dict
        A dictionary with statistics about available tags.
    """
    elements = data.get('elements', [])
    
    # Count tag keys and their values
    tag_counts = {}
    
    for element in elements:
        tags = element.get('tags', {})
        for key, value in tags.items():
            if key not in tag_counts:
                tag_counts[key] = {}
            
            if value not in tag_counts[key]:
                tag_counts[key][value] = 0
            
            tag_counts[key][value] += 1
    
    # Organize results
    tag_analysis = {
        'total_elements': len(elements),
        'tag_keys': list(tag_counts.keys()),
        'tags_by_count': {k: dict(sorted(v.items(), key=lambda item: item[1], reverse=True)) 
                         for k, v in tag_counts.items()}
    }
    
    return tag_analysis

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

def filter_for_hidden_gems(gdf, popularity_threshold=30, categories=None):
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
        Example: {'leisure': ['park', 'garden'], 'amenity': ['cafe', 'library']}
        
    Returns:
    --------
    hidden_gems: GeoDataFrame
        A GeoDataFrame containing potential hidden gems.
    """
    if gdf.empty:
        return gdf
    
    # Copy the DataFrame to avoid modifying the original
    filtered_gdf = gdf.copy()
    
    # Add a popularity score if it doesn't exist
    if 'popularity_score' not in filtered_gdf.columns:
        # 80% get random scores, 20% get NaN (truly undiscovered)
        filtered_gdf['popularity_score'] = [
            random.randint(1, 100) if random.random() > 0.2 else None 
            for _ in range(len(filtered_gdf))
        ]

    print(len(filtered_gdf), "places before filtering")
    
    # Filter by popularity threshold
    # Include places with low scores OR missing scores
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

def download_area_hidden_gems(area_bbox, category_tags=None, popularity_threshold=30):
    """
    Download and filter data for an area to find hidden gems.
    
    Parameters:
    -----------
    area_bbox: tuple
        Bounding box as (min_lat, min_lon, max_lat, max_lon).
    category_tags: dict, optional
        Dictionary with category tags to focus on.
        Example: {'amenity': None, 'leisure': None}
    popularity_threshold: int
        Maximum popularity score for hidden gems.
        
    Returns:
    --------
    hidden_gems: GeoDataFrame
        A GeoDataFrame containing potential hidden gems.
    tag_analysis: dict
        Analysis of available tags in the area.
    """
    # Download the data
    data = download_osm_data(area_bbox, tags=category_tags)
    
    # Analyze what's in the data
    tag_analysis = analyze_osm_data(data)
    
    # Convert to GeoDataFrame
    if category_tags:
        keep_tags = list(category_tags.keys()) + ['name']
    else:
        keep_tags = ['amenity', 'leisure', 'natural', 'historic', 'name']
    
    gdf = convert_osm_to_geodataframe(data, keep_tags=keep_tags)
    
    # Filter to find hidden gems
    # Get common OSM tags for reference
    common_tags = get_common_osm_tags()
    
    # Create category filters using common tag values
    categories = {}
    for tag in keep_tags:
        if tag in common_tags:
            categories[tag] = common_tags[tag]

    print(len(gdf), "places found in the area")
    
    hidden_gems = filter_for_hidden_gems(gdf, 
                                        popularity_threshold=popularity_threshold,
                                        categories=categories)
    
    # Filter out tourism-tagged places if requested
    if 'tourism' in keep_tags:
        hidden_gems = hidden_gems[hidden_gems['tourism'].isna()]
    
    return hidden_gems, tag_analysis

# Example of how to use these functions
if __name__ == "__main__":
    # Bounding box for Berkeley
    berkeley_bbox = (37.85, -122.27, 37.88, -122.22)
    
    # Tags to focus on
    category_tags = {'amenity': None, 'leisure': None, 'natural': None, 'historic': None}
    
    # Download and find hidden gems
    hidden_gems, tag_analysis = download_area_hidden_gems(
        berkeley_bbox, 
        category_tags=category_tags,
        popularity_threshold=30
    )
    
    # Print tag analysis
    print("\nTag analysis:")
    for tag in category_tags.keys():
        if tag in tag_analysis['tags_by_count']:
            print(f"\nTop 5 {tag} types in the area:")
            for value, count in list(tag_analysis['tags_by_count'][tag].items())[:5]:
                print(f"  {value}: {count}")
    
    # Print hidden gem stats
    print(f"\nFound {len(hidden_gems)} potential hidden gems")
    
    # Example: Save the hidden gems to a file
    if not hidden_gems.empty:
        hidden_gems.to_file("berkeley_hidden_gems.geojson", driver="GeoJSON")
        print("Hidden gems saved to berkeley_hidden_gems.geojson")