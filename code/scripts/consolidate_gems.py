import json
import os
import glob
from math import radians, cos, sin, asin, sqrt

def haversine(lon1, lat1, lon2, lat2):
    """Calculate distance between two points in kilometers."""
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a)) 
    r = 6371  # Radius of earth in kilometers
    return c * r

def normalize_gem(gem):
    """Normalize gem format to ensure consistent structure."""
    # Ensure required fields
    normalized = {
        "name": gem.get("name", "Unnamed Gem"),
        "coordinates": gem.get("coordinates", [0, 0]),
        "category": gem.get("category", "unknown"),
        "description": gem.get("description", "A hidden gem in Northern California"),
        "rarity": gem.get("rarity", "moderately hidden"),
        "color": gem.get("color", "purple"),
        "tags": gem.get("tags", []),
        "time": gem.get("time", 120),
        "amenities": gem.get("amenities", []),
        "accessibility": gem.get("accessibility", [])
    }
    
    # Fix color format (handle hex codes)
    if normalized["color"].startswith("#"):
        color_map = {
            "#ff0000": "red",
            "#00ff00": "green",
            "#0000ff": "blue",
            "#ff9900": "orange",
            "#9900ff": "purple",
            "#00ffff": "cyan",
            "#ffff00": "yellow"
        }
        normalized["color"] = color_map.get(normalized["color"].lower(), "purple")
    
    return normalized

def consolidate_cached_recommendations():
    """Consolidate all cached recommendations into a single gems database."""
    # Define paths
    cache_dir = "recommendation_cache"
    output_file = "consolidated_gems_database.json"
    
    # Check if cache directory exists
    if not os.path.exists(cache_dir):
        print(f"Cache directory {cache_dir} does not exist")
        return False
    
    # Find all cache files
    cache_files = glob.glob(os.path.join(cache_dir, "*.json"))
    
    if not cache_files:
        print("No cache files found")
        return False
    
    print(f"Found {len(cache_files)} cache files")
    
    # List to store all gems
    all_gems = []
    
    # Process each cache file
    for cache_file in cache_files:
        try:
            with open(cache_file, 'r') as f:
                gems = json.load(f)
                
            print(f"Processing {cache_file}: {len(gems)} gems")
            all_gems.extend(gems)
        except Exception as e:
            print(f"Error processing {cache_file}: {str(e)}")
    
    print(f"Total gems collected: {len(all_gems)}")
    
    # Deduplicate gems based on name and location
    unique_gems = []
    for gem in all_gems:
        # Normalize the gem
        normalized_gem = normalize_gem(gem)
        
        # Check if this gem is a duplicate
        is_duplicate = False
        for existing_gem in unique_gems:
            # Check if names are similar
            name_match = normalized_gem["name"].lower() == existing_gem["name"].lower()
            
            # Check if locations are close
            location_match = False
            if normalized_gem["coordinates"] and existing_gem["coordinates"]:
                try:
                    lon1, lat1 = normalized_gem["coordinates"]
                    lon2, lat2 = existing_gem["coordinates"]
                    distance = haversine(lon1, lat1, lon2, lat2)
                    location_match = distance < .1  # Less than 1km apart
                except:
                    pass
            
            if name_match or location_match:
                is_duplicate = True
                print(f"Skipping duplicate: {normalized_gem['name']}")
                break
        
        if not is_duplicate:
            unique_gems.append(normalized_gem)
    
    print(f"Unique gems after deduplication: {len(unique_gems)}")
    
    # Save to output file
    try:
        with open(output_file, 'w') as f:
            json.dump(unique_gems, f, indent=2)
        
        print(f"Successfully saved {len(unique_gems)} unique gems to {output_file}")
        return True
    except Exception as e:
        print(f"Error saving consolidated gems: {str(e)}")
        return False

if __name__ == "__main__":
    consolidate_cached_recommendations()