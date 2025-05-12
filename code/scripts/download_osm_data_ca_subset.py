#!/usr/bin/env python3
"""
Grid-Based OpenStreetMap Sampler for Northern California Hidden Gems

This module downloads and processes OpenStreetMap data to find hidden gems
in Northern California. It uses a grid-based sampling approach to ensure even
distribution of places across the region, while filtering out chains and franchises.
"""

import os
import json
import random
import time
import math
from datetime import datetime
from math import radians, cos, sin, asin, sqrt
from collections import defaultdict, Counter
from tqdm import tqdm
import requests
import numpy as np

# Import custom modules
from chain_filter import is_chain_establishment, is_unnamed_place
from content_generator import format_place_to_schema

# Configuration
OUTPUT_FILE = "hidden_gems.json"
CACHE_DIR = "osm_cache"
MIN_PLACES_PER_QUADRANT = 100
GRID_SIZE = 16  # Number of cells per dimension (16x16 grid = 256 cells)
PLACES_PER_CELL_TARGET = 10  # Aim for this many places per cell
MAX_RETRIES = 3
OVERPASS_TIMEOUT = 60  # seconds

# Define the Northern California bounding box (Using corrected coordinates)
# Format: [min_lat, min_lon, max_lat, max_lon]
NORCAL_BBOX = [
    37.336962631031504, -124.1095344585807,  # Min lat (San Jose), Min lon (Crescent City)
    41.74746217345373, -118.28222302824624,  # Max lat (Crescent City), Max lon (Bishop)
]

# Common OSM tags for places of interest - using your updated list
OSM_POI_TAGS = {
    'leisure': [
        'park', 'garden', 'wildlife_hide', 'bird_hide', 'picnic_site',
        'playground'
    ],
    'amenity': [
        'restaurant', 'cafe', 'food_court',
        'library', 'museum', 'theatre', 'arts_centre', 'marketplace', 'community_centre',
        'fountain', 'viewpoint', 'social_centre', 'stage'
    ],
    'historic': [
        'monument', 'memorial', 'ruins', 'castle',
        'fort', 'wreck', 'wayside_cross', 'wayside_shrine', 
        'milestone'
    ],
    'tourism': [
        'attraction', 'viewpoint', 'artwork', 
        'gallery', 'museum'
    ]
}

# Major place categories to ensure balance
MAJOR_PLACE_TYPES = ['leisure', 'amenity', 'historic', 'tourism']

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

def get_grid_cells(bbox, grid_size):
    """
    Divide the bounding box into a grid of cells.
    
    Parameters:
    -----------
    bbox: list [min_lat, min_lon, max_lat, max_lon]
        The bounding box to divide
    grid_size: int
        Number of cells per dimension
        
    Returns:
    --------
    cells: list of list [min_lat, min_lon, max_lat, max_lon]
        List of cell bounding boxes
    """
    min_lat, min_lon, max_lat, max_lon = bbox
    
    # Calculate width and height of each cell
    lat_step = (max_lat - min_lat) / grid_size
    lon_step = (max_lon - min_lon) / grid_size
    
    cells = []
    for i in range(grid_size):
        for j in range(grid_size):
            cell_min_lat = min_lat + i * lat_step
            cell_min_lon = min_lon + j * lon_step
            cell_max_lat = min_lat + (i + 1) * lat_step
            cell_max_lon = min_lon + (j + 1) * lon_step
            
            cells.append([cell_min_lat, cell_min_lon, cell_max_lat, cell_max_lon])
    
    return cells

def get_quadrant(lat, lon, bbox=NORCAL_BBOX):
    """
    Determine which quadrant of the bounding box a point belongs to.
    
    Parameters:
    -----------
    lat, lon: float
        Coordinates of the point
    bbox: list [min_lat, min_lon, max_lat, max_lon]
        The bounding box
    
    Returns:
    --------
    quadrant: int (0-3)
        0: SW, 1: SE, 2: NW, 3: NE
    """
    min_lat, min_lon, max_lat, max_lon = bbox
    mid_lat = (min_lat + max_lat) / 2
    mid_lon = (min_lon + max_lon) / 2
    
    if lat < mid_lat:
        if lon < mid_lon:
            return 0  # SW
        else:
            return 1  # SE
    else:
        if lon < mid_lon:
            return 2  # NW
        else:
            return 3  # NE

def get_cell_quadrant(cell, bbox=NORCAL_BBOX):
    """
    Determine which quadrant a cell belongs to based on its center.
    
    Parameters:
    -----------
    cell: list [min_lat, min_lon, max_lat, max_lon]
        The cell bounding box
    bbox: list [min_lat, min_lon, max_lat, max_lon]
        The overall bounding box
        
    Returns:
    --------
    quadrant: int (0-3)
        0: SW, 1: SE, 2: NW, 3: NE
    """
    min_lat, min_lon, max_lat, max_lon = cell
    center_lat = (min_lat + max_lat) / 2
    center_lon = (min_lon + max_lon) / 2
    
    return get_quadrant(center_lat, center_lon, bbox)

def get_cache_filename(bbox):
    """Generate a cache filename for the given bounding box."""
    # Create a string representation of the bbox with limited precision
    bbox_str = "_".join([f"{coord:.4f}" for coord in bbox])
    
    # Create a hash of the parameters
    import hashlib
    bbox_hash = hashlib.md5(bbox_str.encode()).hexdigest()
    
    return f"{CACHE_DIR}/osm_data_{bbox_hash}.json"

def download_osm_data(bbox, retries=MAX_RETRIES):
    """
    Download OpenStreetMap data within a bounding box using the Overpass API.
    
    Parameters:
    -----------
    bbox: list [min_lat, min_lon, max_lat, max_lon]
        Bounding box to search within
    retries: int
        Number of times to retry if the request fails
    
    Returns:
    --------
    data: dict
        The raw OSM data as returned by the Overpass API
    """
    min_lat, min_lon, max_lat, max_lon = bbox
    
    # Check for cached data
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
    
    cache_file = get_cache_filename(bbox)
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading cache: {e}")
    
    # Overpass API endpoint
    overpass_url = "https://overpass-api.de/api/interpreter"
    
    # Build tag query parts
    tag_parts = []
    for category, values in OSM_POI_TAGS.items():
        for value in values:
            tag_parts.append(f'node["{category}"="{value}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            tag_parts.append(f'way["{category}"="{value}"]({min_lat},{min_lon},{max_lat},{max_lon});')
    
    # Construct the query
    query = f"""
    [out:json][timeout:{OVERPASS_TIMEOUT}];
    (
      {' '.join(tag_parts)}
    );
    out body;
    """
    
    # Make the request with retries
    for i in range(retries):
        try:
            response = requests.post(overpass_url, data={'data': query}, timeout=OVERPASS_TIMEOUT+10)
            
            if response.status_code != 200:
                print(f"Error: Status code {response.status_code}")
                print(f"Response: {response.text[:200]}...")
                if i < retries - 1:
                    wait_time = 2 ** i  # Exponential backoff
                    print(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                continue
            
            data = response.json()
            
            # Cache the data
            with open(cache_file, 'w') as f:
                json.dump(data, f)
            
            return data
        except Exception as e:
            print(f"Error: {e}")
            if i < retries - 1:
                wait_time = 2 ** i  # Exponential backoff
                print(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                return {"elements": []}
    
    return {"elements": []}

def process_osm_elements(elements):
    """
    Process OSM elements into a format suitable for our application,
    filtering out chains, franchises, and unnamed places.
    
    Parameters:
    -----------
    elements: list
        List of OSM elements from the Overpass API
    
    Returns:
    --------
    processed_places: list
        List of processed place objects
    filtered_stats: dict
        Statistics about what was filtered
    """
    processed_places = []
    
    # Track filter statistics
    filtered_stats = {
        'total_elements': len(elements),
        'missing_tags': 0,
        'missing_coords': 0,
        'unnamed': 0,
        'chain_establishment': 0,
        'accepted': 0
    }
    
    for element in elements:
        # Skip elements without tags
        if 'tags' not in element:
            filtered_stats['missing_tags'] += 1
            continue
        
        tags = element['tags']
        
        # Get name
        name = tags.get('name', '')
        
        # Skip unnamed places
        if is_unnamed_place(name):
            filtered_stats['unnamed'] += 1
            continue
        
        # Skip chain establishments
        if is_chain_establishment(name):
            filtered_stats['chain_establishment'] += 1
            continue
        
        # Get coordinates
        if element['type'] == 'node':
            coords = [element.get('lon', 0), element.get('lat', 0)]
        elif 'center' in element:
            coords = [element.get('center', {}).get('lon', 0), element.get('center', {}).get('lat', 0)]
        else:
            # Skip elements without coordinates
            filtered_stats['missing_coords'] += 1
            continue
        
        # Determine place type
        place_category = None
        place_subcategory = None
        place_type = None
        
        for category in MAJOR_PLACE_TYPES:
            if category in tags:
                place_category = category
                place_subcategory = tags[category]
                place_type = f"{category}:{tags[category]}"
                break
        
        if not place_type:
            filtered_stats['missing_tags'] += 1
            continue
        
        # Generate address components
        address_parts = []
        
        if 'addr:housenumber' in tags:
            address_parts.append(tags['addr:housenumber'])
        
        if 'addr:street' in tags:
            address_parts.append(tags['addr:street'])
        
        if 'addr:city' in tags:
            address_parts.append(tags['addr:city'])
        
        if 'addr:state' in tags:
            address_parts.append(tags['addr:state'])
        
        if 'addr:postcode' in tags:
            address_parts.append(tags['addr:postcode'])
        
        # Join address parts
        address = ", ".join(address_parts) if address_parts else ""
        
        # Determine category for consistency
        category = 'scenic'  # Default
        if place_category == 'amenity':
            if place_subcategory in ['restaurant', 'food_court']:
                category = 'food'
            else:
                category = 'amenity'
        elif place_category in ['historic', 'leisure', 'tourism']:
            category = place_category
        
        # Create place object
        place = {
            'id': f"{element['type']}/{element['id']}",
            'name': name,
            'type': place_type,
            'category': category,
            'subcategory': place_subcategory,
            'coordinates': coords,
            'tags': tags,
            'address': address,
            'opening_hours': tags.get('opening_hours', ''),
            'is_high_quality': False  # Will be updated later
        }
        
        # Add other tags we're interested in
        if 'wheelchair' in tags:
            place['wheelchair'] = tags['wheelchair']
        if 'website' in tags:
            place['website'] = tags['website']
        if 'phone' in tags:
            place['phone'] = tags['phone']
        if 'description' in tags:
            place['description'] = tags['description']
        
        processed_places.append(place)
        filtered_stats['accepted'] += 1
    
    return processed_places, filtered_stats

def check_place_quality(place):
    """
    Check if a place meets our high-quality criteria.
    
    Parameters:
    -----------
    place: dict
        The place object to check
    
    Returns:
    --------
    is_high_quality: bool
        Whether the place meets our high-quality criteria
    """
    # Check if all required fields are present and non-empty
    required_fields = ['name', 'coordinates']
    
    for field in required_fields:
        if field not in place or not place[field]:
            return False
        
        # For coordinates, check if they're valid
        if field == 'coordinates':
            coords = place[field]
            if not isinstance(coords, list) or len(coords) != 2:
                return False
            if not all(isinstance(c, (int, float)) and -180 <= c <= 180 for c in coords):
                return False
    
    # Check if name is not just a generic "Unnamed X"
    if place['name'].startswith('Unnamed '):
        return False
    
    # If we get here, the place meets our criteria
    return True

def sample_with_grid():
    """
    Sample places using a grid-based approach for even distribution.
    
    Returns:
    --------
    dict: Data with places from all quadrants and statistics
    """
    # Initialize collections
    all_places = []
    quadrant_places = {q: [] for q in range(4)}
    quadrant_category_counts = {q: defaultdict(int) for q in range(4)}
    
    print(f"Starting grid-based sampling of Northern California...")
    print(f"Bounding box: {NORCAL_BBOX}")
    print(f"Grid size: {GRID_SIZE}x{GRID_SIZE} cells")
    print(f"Target places per cell: {PLACES_PER_CELL_TARGET}")
    
    # Create a grid of cells
    cells = get_grid_cells(NORCAL_BBOX, GRID_SIZE)
    print(f"Created {len(cells)} grid cells")
    
    # Track filter statistics
    filter_stats = {
        'total_elements': 0,
        'missing_tags': 0,
        'missing_coords': 0,
        'unnamed': 0,
        'chain_establishment': 0,
        'accepted': 0,
        'low_quality': 0
    }
    
    # Track cells with and without places
    cells_with_places = 0
    cells_without_places = 0
    
    # Sample each cell
    total_start = time.time()
    
    with tqdm(total=len(cells), desc="Sampling cells") as pbar:
        for cell_idx, cell in enumerate(cells):
            # Determine which quadrant this cell belongs to
            quadrant = get_cell_quadrant(cell)
            
            # Download OSM data for this cell
            data = download_osm_data(cell)
            elements = data.get('elements', [])
            
            if not elements:
                cells_without_places += 1
                pbar.update(1)
                continue
            
            # Process the elements with filtering
            places, cell_filter_stats = process_osm_elements(elements)
            
            # Update filter stats
            for key in filter_stats:
                if key in cell_filter_stats:
                    filter_stats[key] += cell_filter_stats[key]
            
            # Track if this cell has valid places
            has_places = False
            
            # Check quality and add to our collection
            quality_places = []
            for place in places:
                place['is_high_quality'] = check_place_quality(place)
                
                if place['is_high_quality']:
                    quality_places.append(place)
                    has_places = True
                else:
                    filter_stats['low_quality'] += 1
            
            # If we have more places than needed for this cell, sample randomly
            if len(quality_places) > PLACES_PER_CELL_TARGET:
                # Select places with even category distribution if possible
                selected_places = select_balanced_places(quality_places, PLACES_PER_CELL_TARGET)
            else:
                selected_places = quality_places
            
            # Update counts
            if selected_places:
                cells_with_places += 1
                
                # Add to collections
                for place in selected_places:
                    all_places.append(place)
                    quadrant_places[quadrant].append(place)
                    quadrant_category_counts[quadrant][place['category']] += 1
            else:
                cells_without_places += 1
            
            # Update progress
            pbar.set_description(f"Sampling cells (found: {len(all_places)})")
            pbar.update(1)
    
    total_elapsed = (time.time() - total_start) / 60
    
    # Print summary
    print("\nSampling complete!")
    print(f"Total places: {len(all_places)}")
    print(f"Total time: {total_elapsed:.1f} minutes")
    print(f"Cells with places: {cells_with_places} / {len(cells)} ({cells_with_places/len(cells)*100:.1f}%)")
    
    print("\nQuadrant distribution:")
    for q in range(4):
        quadrant_name = ["SW", "SE", "NW", "NE"][q]
        q_count = len(quadrant_places[q])
        print(f"  {quadrant_name}: {q_count} places")
        
        # Print category breakdown for this quadrant
        for cat in MAJOR_PLACE_TYPES:
            cat_count = quadrant_category_counts[q][cat]
            if cat_count > 0:
                print(f"    - {cat}: {cat_count}")
    
    # Calculate overall category distribution
    category_counts = Counter([place['category'] for place in all_places])
    subcategory_counts = Counter([place['type'] for place in all_places])
    
    print("\nOverall category distribution:")
    for cat, count in category_counts.most_common():
        print(f"  {cat}: {count} ({count/len(all_places)*100:.1f}%)")
    
    print("\nTop subcategories:")
    for subcat, count in subcategory_counts.most_common(10):
        print(f"  {subcat}: {count}")
    
    # Check if any quadrants have too few places
    sparse_quadrants = []
    for q in range(4):
        if len(quadrant_places[q]) < MIN_PLACES_PER_QUADRANT:
            sparse_quadrants.append(q)
    
    if sparse_quadrants:
        quadrant_names = [["SW", "SE", "NW", "NE"][q] for q in sparse_quadrants]
        print(f"\nWARNING: The following quadrants have fewer than {MIN_PLACES_PER_QUADRANT} places:")
        for i, q in enumerate(sparse_quadrants):
            print(f"  - {quadrant_names[i]}: {len(quadrant_places[q])} places")
        print("These may be sparse regions. Consider adjusting the grid size or target places per cell.")
    
    # Compile results
    result = {
        'total_places': len(all_places),
        'sample_date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'quadrant_counts': [len(quadrant_places[q]) for q in range(4)],
        'category_counts': {cat: count for cat, count in category_counts.items()},
        'places': all_places,
        'filter_stats': filter_stats
    }
    
    return result

def select_balanced_places(places, target_count):
    """
    Select a balanced set of places by category.
    
    Parameters:
    -----------
    places: list
        List of places to select from
    target_count: int
        Number of places to select
        
    Returns:
    --------
    selected_places: list
        Selected places with balanced categories
    """
    # Group places by category
    categories = defaultdict(list)
    for place in places:
        categories[place['category']].append(place)
    
    # Determine how many to take from each category
    category_counts = {}
    total_categories = len(categories)
    
    if total_categories == 0:
        return []
    
    # Calculate base count per category and remainder
    base_count = target_count // total_categories
    remainder = target_count % total_categories
    
    # Distribute remainder across categories
    for i, category in enumerate(categories.keys()):
        if i < remainder:
            category_counts[category] = base_count + 1
        else:
            category_counts[category] = base_count
    
    # Select places from each category
    selected_places = []
    for category, count in category_counts.items():
        available = categories[category]
        
        # If we don't have enough of this category, take all of them
        if len(available) <= count:
            selected_places.extend(available)
        else:
            # Otherwise, select random samples
            selected = random.sample(available, count)
            selected_places.extend(selected)
    
    return selected_places

def format_to_hidden_gems_schema(data):
    """
    Format the sampled data to the Hidden Gems schema.
    
    Parameters:
    -----------
    data: dict
        The data returned by sample_with_grid
        
    Returns:
    --------
    list: Formatted hidden gems
    """
    raw_places = data.get('places', [])
    hidden_gems = []
    
    for place in raw_places:
        gem = format_place_to_schema(place)
        if gem:
            hidden_gems.append(gem)
    
    return hidden_gems

def save_hidden_gems(hidden_gems, output_file=OUTPUT_FILE):
    """
    Save hidden gems to a JSON file.
    
    Parameters:
    -----------
    hidden_gems: list
        The hidden gems to save
    output_file: str
        The output file path
        
    Returns:
    --------
    None
    """
    with open(output_file, 'w') as f:
        json.dump(hidden_gems, f, indent=2)
    
    print(f"\nResults saved to {output_file}")

def main():
    """Main function to run the grid-based OpenStreetMap sampler."""
    # Sample using grid
    data = sample_with_grid()
    
    # Format to Hidden Gems schema
    hidden_gems = format_to_hidden_gems_schema(data)
    
    # Save to JSON
    save_hidden_gems(hidden_gems)
    
    print(f"Sampling completed. Found {len(hidden_gems)} hidden gems.")

if __name__ == "__main__":
    main()