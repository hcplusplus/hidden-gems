import requests
import json
import osmnx as ox
import pandas as pd
import geopandas as gpd
from pprint import pprint

def download_osm_data(min_lat, min_lon, max_lat, max_lon, tags=None):
    """
    Download OpenStreetMap data within a bounding box using the Overpass API.
    
    Parameters:
    -----------
    min_lat, min_lon: float
        The latitude and longitude of the southwest corner of the bounding box.
    max_lat, max_lon: float
        The latitude and longitude of the northeast corner of the bounding box.
    tags: dict, optional
        A dictionary of OSM tags to filter by (e.g., {"amenity": "restaurant"}).
        If None, all elements will be downloaded.
    
    Returns:
    --------
    data: dict
        The raw OSM data as returned by the Overpass API.
    """
    # Overpass API endpoint
    overpass_url = "https://overpass-api.de/api/interpreter"
    
    # Construct the query
    if tags:
        # Create tag filter
        tag_filters = []
        for key, value in tags.items():
            if value is None:
                tag_filters.append(f'["{key}"]')
            else:
                tag_filters.append(f'["{key}"="{value}"]')
        
        tag_filter_str = ''.join(tag_filters)
        
        query = f"""
        [out:json][timeout:25];
        (
          node{tag_filter_str}({min_lat},{min_lon},{max_lat},{max_lon});
          way{tag_filter_str}({min_lat},{min_lon},{max_lat},{max_lon});
          relation{tag_filter_str}({min_lat},{min_lon},{max_lat},{max_lon});
        );
        out body;
        >;
        out skel qt;
        """
    else:
        # Get all elements
        query = f"""
        [out:json][timeout:25];
        (
          node({min_lat},{min_lon},{max_lat},{max_lon});
          way({min_lat},{min_lon},{max_lat},{max_lon});
          relation({min_lat},{min_lon},{max_lat},{max_lon});
        );
        out body;
        >;
        out skel qt;
        """
    
    # Make the request
    print(f"Downloading OSM data for bounding box ({min_lat},{min_lon},{max_lat},{max_lon})...")
    response = requests.post(overpass_url, data={'data': query})
    response.raise_for_status()
    
    # Parse the response
    data = response.json()
    print(f"Downloaded {len(data.get('elements', []))} elements")
    
    return data

def download_osm_amenities(area_name, amenity_type=None):
    """
    Download specific amenities for a named area using OSMnx.
    
    Parameters:
    -----------
    area_name: str
        The name of the area to download data for (e.g., "Seattle, Washington").
    amenity_type: str, optional
        The type of amenity to download (e.g., "restaurant", "cafe").
        If None, all amenities will be downloaded.
    
    Returns:
    --------
    gdf: GeoDataFrame
        A GeoDataFrame containing the downloaded amenities.
    """
    # Configure OSMnx
    ox.config(use_cache=True, log_console=True)
    
    # Define tags to download
    tags = {"amenity": amenity_type} if amenity_type else {"amenity": True}
    
    # Download the data
    print(f"Downloading {amenity_type or 'all amenities'} for {area_name}...")
    gdf = ox.geometries_from_place(area_name, tags=tags)
    
    print(f"Downloaded {len(gdf)} elements")
    return gdf

def download_osm_network(area_name, network_type='drive'):
    """
    Download a street network for a named area using OSMnx.
    
    Parameters:
    -----------
    area_name: str
        The name of the area to download data for (e.g., "Seattle, Washington").
    network_type: str
        The type of network to download ('drive', 'bike', 'walk', 'all').
    
    Returns:
    --------
    G: networkx.MultiDiGraph
        A NetworkX graph representing the street network.
    """
    # Download the network
    print(f"Downloading {network_type} network for {area_name}...")
    G = ox.graph_from_place(area_name, network_type=network_type)
    
    print(f"Downloaded network with {len(G.nodes)} nodes and {len(G.edges)} edges")
    return G

def inspect_osm_data(data):
    """
    Inspect the structure of raw OSM data.
    
    Parameters:
    -----------
    data: dict
        The raw OSM data as returned by the Overpass API.
    """
    # Print general info
    print("\n=== OSM Data Overview ===")
    print(f"Total elements: {len(data.get('elements', []))}")
    
    # Count element types
    element_types = {}
    for element in data.get('elements', []):
        element_type = element.get('type')
        element_types[element_type] = element_types.get(element_type, 0) + 1
    
    print("\nElement Types:")
    for element_type, count in element_types.items():
        print(f"  {element_type}: {count}")
    
    # Sample one of each element type
    print("\n=== Sample Elements ===")
    samples = {}
    for element in data.get('elements', []):
        element_type = element.get('type')
        if element_type not in samples:
            samples[element_type] = element
    
    for element_type, sample in samples.items():
        print(f"\nSample {element_type}:")
        pprint(sample)
    
    # Analyze tags
    all_tags = set()
    tag_counts = {}
    
    for element in data.get('elements', []):
        if 'tags' in element:
            for tag in element['tags']:
                all_tags.add(tag)
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    print("\n=== Common Tags ===")
    most_common_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:20]
    for tag, count in most_common_tags:
        print(f"  {tag}: {count}")

def inspect_osmnx_amenities(gdf):
    """
    Inspect the structure of amenities data from OSMnx.
    
    Parameters:
    -----------
    gdf: GeoDataFrame
        A GeoDataFrame containing amenities data from OSMnx.
    """
    print("\n=== OSMnx Amenities Overview ===")
    print(f"Total amenities: {len(gdf)}")
    
    # Print the columns
    print("\nColumns:")
    for col in gdf.columns:
        print(f"  {col}")
    
    # Print geometry types
    geom_types = gdf.geometry.geom_type.value_counts()
    print("\nGeometry Types:")
    for geom_type, count in geom_types.items():
        print(f"  {geom_type}: {count}")
    
    # Sample different amenity types
    if 'amenity' in gdf.columns:
        amenity_counts = gdf['amenity'].value_counts()
        print("\nAmenity Types:")
        for amenity, count in amenity_counts.head(10).items():
            print(f"  {amenity}: {count}")
    
    # Print a sample record
    print("\nSample Record:")
    if len(gdf) > 0:
        sample = gdf.iloc[0]
        for col in gdf.columns:
            value = sample[col]
            print(f"  {col}: {value}")

def inspect_osmnx_network(G):
    """
    Inspect the structure of a street network from OSMnx.
    
    Parameters:
    -----------
    G: networkx.MultiDiGraph
        A NetworkX graph representing a street network from OSMnx.
    """
    print("\n=== OSMnx Network Overview ===")
    print(f"Nodes: {len(G.nodes)}")
    print(f"Edges: {len(G.edges)}")
    
    # Print node attributes
    if len(G.nodes) > 0:
        print("\nNode Attributes:")
        sample_node = list(G.nodes(data=True))[0]
        for key, value in sample_node[1].items():
            print(f"  {key}: {value}")
    
    # Print edge attributes
    if len(G.edges) > 0:
        print("\nEdge Attributes:")
        sample_edge = list(G.edges(data=True))[0]
        for key, value in sample_edge[2].items():
            print(f"  {key}: {value}")

     # Get stats on street types - more robust approach
    print("\nStreet Types:")
    highway_types = {}
    
    # Count highway types directly from edges
    for _, _, edge_data in G.edges(data=True):
        if 'highway' in edge_data:
            highway_type = edge_data['highway']
            if isinstance(highway_type, list):
                highway_type = highway_type[0]  # Take first if it's a list
            highway_types[highway_type] = highway_types.get(highway_type, 0) + 1
    
    # Print highway types
    if highway_types:
        for highway_type, count in sorted(highway_types.items(), key=lambda x: x[1], reverse=True):
            print(f"  {highway_type}: {count}")
    else:
        print("  No highway attributes found in the network")
    
    # Add this to the inspect_osmnx_network function
    print("\nGraph Metadata:")
    for key in G.graph:
        if isinstance(G.graph[key], (str, int, float, bool)) or G.graph[key] is None:
            print(f"  {key}: {G.graph[key]}")
        else:
            print(f"  {key}: {type(G.graph[key])}")

    print("\nBounding Box:")
    if hasattr(G, 'nodes'):
        nodes = list(G.nodes(data=True))
        lats = [node[1]['y'] for node in nodes]
        lons = [node[1]['x'] for node in nodes]
        if lats and lons:
            print(f"  North: {max(lats)}")
            print(f"  South: {min(lats)}")
            print(f"  East: {max(lons)}")
            print(f"  West: {min(lons)}")

# Example usage
if __name__ == "__main__":
    # Example 1: Download raw OSM data for a small area and inspect it
    #print("\n=== EXAMPLE 1: Raw OSM Data via Overpass API ===")
    ## Bounding box for a part of berkeley
    #min_lat = 37.85
    #min_lon = -122.267
    #max_lat = 37.86
    #max_lon = -122.25
    #
    ## Download all data in the bounding box
    #data = download_osm_data(min_lat, min_lon, max_lat, max_lon)
    #
    ## Save the raw data to a file (useful for further inspection)
    #with open('south_berkeley_sample.json', 'w') as f:
    #    json.dump(data, f)
    #print("Raw data saved to south_berkeley_sample.json")
    #
    ## Inspect the raw data
    #inspect_osm_data(data)
    #
    ## Example 2: Download specific amenities (restaurants) and inspect them
    #print("\n=== EXAMPLE 2: Amenities via OSMnx ===")
    #try:
    #    # Download all restaurants in a small area
    #    restaurants_gdf = download_osm_amenities("Bishop, California", "restaurant")
    #    
    #    # Save to file
    #    restaurants_gdf.to_file("bishop_restaurants.geojson", driver="GeoJSON")
    #    print("Restaurant data saved to bishop_restaurants.geojson")
    #    
    #    # Inspect the amenities data
    #    inspect_osmnx_amenities(restaurants_gdf)
    #except Exception as e:
    #    print(f"Error with OSMnx amenities example: {e}")
    
    # Example 3: Download a street network and inspect it
    print("\n=== EXAMPLE 3: Street Network via OSMnx ===")
    try:
        # Download walking network
        G = download_osm_network("Berkeley, California", network_type='drive')
        
        # Save to file (GraphML format can be opened in tools like Gephi)
        ox.save_graphml(G, "berkeley_driving.graphml")
        print("Network saved to berkeley_driving.graphml")
        
        # Also save as GeoJSON for easier inspection
        nodes, edges = ox.graph_to_gdfs(G)
        nodes.to_file("berkeley_driving_nodes.geojson", driver="GeoJSON")
        edges.to_file("berkeley_driving_edges.geojson", driver="GeoJSON")
        print("Network saved as GeoJSON (nodes and edges)")
        
        # Inspect the network
        inspect_osmnx_network(G)
    except Exception as e:
        print(f"Error with OSMnx network example: {e}")