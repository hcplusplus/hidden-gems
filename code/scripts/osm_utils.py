# osm_utils.py
# Utility functions for OSM data handling

import requests
import json
import geopandas as gpd
import pandas as pd
from shapely.geometry import Point, LineString, Polygon
import random
import warnings
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

def download_osm_data(bbox, tags=None):
    """
    Download OpenStreetMap data within a bounding box using the Overpass API.
    Reused from download_berkeley_osm.py
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
    """
    Returns dictionary of common OSM tag groups with their common values.
    Reused from download_berkeley_osm.py
    """
    # Common tag values compiled from OSM Wiki
    return {
        'leisure': [
            'park', 'garden', 'nature_reserve', 'playground',
            'sports_centre', 'swimming_pool',
            'fitness_station', 'picnic_table', 'marina',
            'slipway', 'bird_hide', 'beach_resort', 'fishing', 'firepit',
            'outdoor_seating', 'swimming_area', 'recreation_ground'
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

def convert_osm_to_geodataframe(data, keep_tags=None):
    """
    Convert raw OSM data to a GeoDataFrame for easier analysis.
    Reused from download_berkeley_osm.py
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

def filter_for_hidden_gems(gdf, popularity_threshold=30, categories=None, required_properties=None):
    """
    Filter the GeoDataFrame to find potential hidden gems.
    Reused from download_berkeley_osm.py
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

def save_hidden_gems_with_custom_schema(gdf, output_file):
    """
    Save hidden gems with a custom schema as JSON
    """
    print(f"Saving hidden gems with custom schema to: {output_file}")
    
    # Initialize list to hold gems with custom schema
    custom_gems = []
    
    # Process each gem
    for idx, gem in gdf.iterrows():
        # Determine rarity and color based on popularity score
        if gem.get('popularity_score') is None or gem.get('popularity_score') == 0:
            rarity = "most hidden"
            color = "purple"
        elif gem.get('popularity_score', 0) < 30:
            rarity = "moderately hidden"
            color = "blue"
        else:
            rarity = "least hidden"
            color = "red"
        
        # Generate random time (30-360 minutes in 30 minute intervals)
        time = random.choice([30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360])
        
        # Function to handle NaN values
        def nan_to_needs_polishing(value, default="gem needs polishing"):
            if pd.isna(value):
                return default
            return value
        
        def name_polish(value, default="Unnamed location"):
            if pd.isna(value):
                return default
            return value
        
        # Create gem with custom schema
        custom_gem = {
            "name": name_polish(gem.get('name')),
            "coordinates": [float(gem.geometry.x), float(gem.geometry.y)],
            "natural": nan_to_needs_polishing(gem.get('natural')),
            "amenity": nan_to_needs_polishing(gem.get('amenity')),
            "historic": nan_to_needs_polishing(gem.get('historic')),
            "leisure": nan_to_needs_polishing(gem.get('leisure')),
            "popularity_score": 0 if pd.isna(gem.get('popularity_score')) else gem.get('popularity_score'),
            "rarity": rarity,
            "color": color,
            "time": time
        }
        
        custom_gems.append(custom_gem)
    
    # Save to JSON file
    with open(output_file, 'w') as f:
        json.dump(custom_gems, f, indent=2)
    
    print(f"Saved {len(custom_gems)} gems with custom schema to {output_file}")
    return custom_gems