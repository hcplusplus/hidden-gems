import json, random, requests, time
import osmnx as ox
import pandas as pd
import geopandas as gpd
from pprint import pprint
from typing import Dict, List, Optional, Union

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
            'park',              # Urban parks
            'garden',            # Gardens
            'nature_reserve',    # Protected areas
            'pitch',             # Sports fields
            'sports_centre',     # Sports facilities
            'swimming_pool',     # Swimming pools
            'track',             # Running/cycling tracks
            'fitness_station',   # Outdoor exercise equipment
    
            'bird_hide',         # Wildlife observation
            'fishing',           # Fishing spots
            'firepit',           # Fire pits
            'swimming_area'     # Swimming areas (not pools)
        ],
        'amenity': [
            # Food & Drink
            'restaurant',        # Restaurants
            'cafe',              # Cafes
            
            # Education & Culture
            'library',           # Libraries
            'museum',            # Museums
            'theatre',           # Theaters
            'arts_centre',       # Arts centers
            'community_centre',  # Community centers
        
            
            # Transportation
            'parking',           # Parking lots
            'bicycle_parking',   # Bike parking
            'bicycle_rental',    # Bike rentals
            'charging_station',  # EV charging
            'fuel',              # Gas stations
            'bus_station',       # Bus stations
            
            # Utilities & Services
            'post_office',       # Post offices
            'bank',              # Banks
            'atm',               # ATMs
            'toilets',           # Public toilets
            'shower',            # Showers
            'drinking_water',    # Drinking fountains
            'recycling',         # Recycling centers
            'marketplace'       # Markets
            
        ],
        'natural': [
            'beach',             # Beaches
            'water',             # Water bodies
            'wood',              # Wooded areas
            'tree',              # Individual trees
            'cliff',             # Cliffs
            'cave_entrance',     # Cave entrances
            'peak',              # Mountain peaks
            'volcano',           # Volcanoes
            'bay',               # Bays
            'spring',            # Springs
            'hot_spring',        # Hot springs
            'waterfall',         # Waterfalls
            'glacier',           # Glaciers
            'wetland',           # Wetlands
            'sand',              # Sandy areas
            'scrub',             # Scrubland
            'heath',             # Heathland
            'grassland',         # Grassland
            'fell',              # Fells/moors
            'rock',              # Rock features
            'stone',             # Stones/boulders
            'sinkhole'           # Sinkholes
        ],
        'historic': [
            'monument',          # Monuments
            'memorial',          # Memorials
            'archaeological_site', # Archaeological sites
            'ruins',             # Ruins
            'castle',            # Castles
            'fort',              # Forts
            'battlefield',       # Battlefields
            'wreck',             # Shipwrecks
            'aircraft_wreck',    # Aircraft wrecks
            'wayside_cross',     # Wayside crosses
            'wayside_shrine',    # Wayside shrines
            'building',          # Historic buildings
            'church'             # Historic churches
        ]
    }

def get_popular_amenities_in_area(area_name: str, limit: int = 10) -> Dict[str, List[str]]:
    """
    Discover the most common amenity and leisure types in a specific area.
    This helps to make more targeted queries.
    
    Parameters:
    -----------
    area_name: str
        The name of the area to analyze (e.g., "Berkeley, CA").
    limit: int
        Number of most common types to return per category.
        
    Returns:
    --------
    Dict[str, List[str]]:
        Dictionary with categories as keys and lists of common types as values.
    """
    # Configure OSMnx
    ox.config(use_cache=True, log_console=True)
    
    # Categories to check
    categories = ['amenity', 'leisure', 'natural', 'historic']
    results = {}
    
    try:
        print(f"Analyzing common feature types in {area_name}...")
        
        for category in categories:
            # Get all features of this category type
            try:
                print(f"  Checking {category} types...")
                tags = {category: True}
                gdf = ox.geometries_from_place(area_name, tags=tags)
                
                if not gdf.empty and category in gdf.columns:
                    # Count occurrences of each type
                    type_counts = gdf[category].value_counts()
                    
                    # Get the most common types
                    common_types = type_counts.head(limit).index.tolist()
                    results[category] = common_types
                    
                    print(f"  Found {len(common_types)} common {category} types")
                    for type_name, count in zip(type_counts.head(limit).index, type_counts.head(limit).values):
                        print(f"    {type_name}: {count} instances")
                else:
                    print(f"  No {category} features found")
                    results[category] = []
                    
            except Exception as e:
                print(f"  Error analyzing {category}: {e}")
                results[category] = []
            
            # Add a small delay to avoid overloading the API
            time.sleep(1)
    
    except Exception as e:
        print(f"Error analyzing area: {e}")
    
    return results
def download_multiple_osm_features(
    area_name: str, 
    tag_groups: Optional[Dict[str, Union[List[str], None]]] = None,
    popularity_threshold: Optional[int] = None,
    limit_per_type: Optional[int] = None,
    exclude_tourism: bool = True
) -> gpd.GeoDataFrame:
    """
    Download OSM data for multiple specific feature types efficiently.
    
    Parameters:
    -----------
    area_name: str
        The name of the area to download data for (e.g., "Berkeley, CA").
    tag_groups: Dict[str, Union[List[str], None]], optional
        Dictionary where keys are OSM primary tags and values are lists of subtypes.
        Example: {'leisure': ['park', 'garden'], 'amenity': ['cafe', 'library']}
        If a value is None, all subtypes for that primary tag will be downloaded.
    popularity_threshold: int, optional
        If set, filters results to include places with either:
        1) a popularity score below this value, OR
        2) no popularity score at all (likely undiscovered places)
    limit_per_type: int, optional
        Maximum number of features to return per subtype.
    exclude_tourism: bool
        Whether to exclude tourism-tagged places (useful for hidden gems app).
        
    Returns:
    --------
    gdf: GeoDataFrame
        A GeoDataFrame containing the combined downloaded elements.
    """
    # Configure OSMnx

    import warnings
    warnings.filterwarnings("ignore", message=".*Passing a SingleBlockManager to Series is deprecated.*")
    
    ox.config(use_cache=True, log_console=True)
    
    # Default tag groups if none specified
    if tag_groups is None:
        tag_groups = {
            'leisure': ['park', 'garden', 'playground', 'nature_reserve'],
            'amenity': ['cafe', 'restaurant', 'library', 'community_centre']
        }
    
    # Exclude tourism if requested
    if exclude_tourism and 'tourism' in tag_groups:
        del tag_groups['tourism']
    
    all_results = []
    
    # Process each tag group
    for primary_tag, subtypes in tag_groups.items():
        print(f"Processing {primary_tag} with subtypes: {subtypes or 'ALL'}")
        
        if subtypes:
            # Download each subtype individually and combine
            for subtype in subtypes:
                try:
                    print(f"  Downloading {primary_tag}={subtype} for {area_name}...")
                    tags = {primary_tag: subtype}
                    gdf = ox.geometries_from_place(area_name, tags=tags)
                    
                    if not gdf.empty:
                        # Add source tag identification
                        gdf['source_tag'] = f"{primary_tag}={subtype}"
                        
                        # Check for existing popularity_score column or related fields
                        has_popularity = False
                        for col in gdf.columns:
                            if 'popular' in col.lower() or 'visit' in col.lower() or 'rating' in col.lower():
                                has_popularity = True
                                # Normalize values to 0-100 range if needed
                                if gdf[col].max() > 0:
                                    gdf['popularity_score'] = (gdf[col] / gdf[col].max()) * 100
                                break
                        
                        # Add a simulated popularity score only if no existing metrics
                        if not has_popularity:
                            # For places without popularity metrics, assign scores
                            # 80% get random scores, 20% get NaN (truly undiscovered)
                            random_scores = [
                                random.randint(1, 100) if random.random() > 0.2 else None 
                                for _ in range(len(gdf))
                            ]
                            gdf['popularity_score'] = random_scores
                        
                        # Limit number of features if requested
                        if limit_per_type and len(gdf) > limit_per_type:
                            gdf = gdf.sample(limit_per_type)
                        
                        # Filter by popularity threshold if set
                        # Include places with low scores OR missing scores
                        if popularity_threshold is not None:
                            mask = (gdf['popularity_score'] < popularity_threshold) | gdf['popularity_score'].isna()
                            gdf = gdf[mask]
                        
                        all_results.append(gdf)
                        print(f"  Found {len(gdf)} {subtype} elements")
                    else:
                        print(f"  No {subtype} elements found")
                        
                except Exception as e:
                    print(f"  Error downloading {primary_tag}={subtype}: {e}")
        else:
            # Download all subtypes for this primary tag
            try:
                print(f"  Downloading all {primary_tag} types for {area_name}...")
                tags = {primary_tag: True}
                gdf = ox.geometries_from_place(area_name, tags=tags)
                
                if not gdf.empty:
                    # Add source tag identification
                    gdf['source_tag'] = primary_tag
                    
                    # Check for existing popularity_score column or related fields
                    has_popularity = False
                    for col in gdf.columns:
                        if 'popular' in col.lower() or 'visit' in col.lower() or 'rating' in col.lower():
                            has_popularity = True
                            # Normalize values to 0-100 range if needed
                            if gdf[col].max() > 0:
                                gdf['popularity_score'] = (gdf[col] / gdf[col].max()) * 100
                            break
                    
                    # Add a simulated popularity score only if no existing metrics
                    if not has_popularity:
                        # For places without popularity metrics, assign scores
                        # 80% get random scores, 20% get NaN (truly undiscovered)
                        random_scores = [
                            random.randint(1, 100) if random.random() > 0.2 else None 
                            for _ in range(len(gdf))
                        ]
                        gdf['popularity_score'] = random_scores
                    
                    # Filter by popularity threshold if set
                    # Include places with low scores OR missing scores
                    if popularity_threshold is not None:
                        mask = (gdf['popularity_score'] < popularity_threshold) | gdf['popularity_score'].isna()
                        gdf = gdf[mask]
                    
                    all_results.append(gdf)
                    print(f"  Found {len(gdf)} {primary_tag} elements")
                else:
                    print(f"  No {primary_tag} elements found")
                    
            except Exception as e:
                print(f"  Error downloading {primary_tag}: {e}")
    
    # Combine all results
    if all_results:
        combined_gdf = pd.concat(all_results, ignore_index=True)
        print(f"Total combined elements: {len(combined_gdf)}")
        return combined_gdf
    else:
        print("No elements found for the specified tags")
        return gpd.GeoDataFrame()





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
    # Example 1: Get a list of common tag values
    common_tags = get_common_osm_tags()
    print("Available leisure tags:", common_tags['leisure'])
    
    # Example 2: Find out what's popular in the area before downloading
    popular_types = get_popular_amenities_in_area("Berkeley, CA", limit=10)
    
    # Example 3: Download specific types based on popularity analysis
    tag_dict = {
        'leisure': popular_types['leisure'][:5],  # Top 5 leisure types
        'amenity': ['cafe', 'restaurant', 'library'],
        'natural': ['water', 'tree', 'wood'],
        'historic': popular_types.get('historic', [])[:3]  # Top 3 historic if any
    }
    
    # Download with a focus on hidden gems (low popularity)
    results = download_multiple_osm_features(
        "Berkeley, CA", 
        tag_dict,
        popularity_threshold=30,  # Only places with popularity score < 30
        limit_per_type=20,        # At most 20 places per type
        exclude_tourism=True      # Skip tourism-tagged places
    )
    
    # Example 4: Post-processing to find specific features
    if not results.empty:
        # Find accessible places
        accessible = results[results.get('wheelchair', 'no') == 'yes']
        print(f"Found {len(accessible)} wheelchair accessible places")
        
        # Find places with names containing specific terms
        parks = results[
            (results.get('leisure') == 'park') & 
            results['name'].str.contains('Regional|Community', case=False, na=False)
        ]
        print(f"Found {len(parks)} parks with Regional/Community in the name")