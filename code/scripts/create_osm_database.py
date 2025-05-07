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

def find_osm_data_files():
    """Find all OSM data files in the current directory and subdirectories."""
    # Look for various file patterns that might contain OSM data
    geojson_files = glob.glob("**/*hidden_gems*.geojson", recursive=True)
    json_files = glob.glob("**/*hidden_gems_custom.json", recursive=True) + glob.glob("**/route_*.json", recursive=True)
    
    print(f"Found {len(geojson_files)} GeoJSON files and {len(json_files)} JSON files")
    
    # Return all found files
    return geojson_files + json_files

def load_osm_data(file_path):
    """Load OSM data from a file, handling different formats."""
    try:
        if file_path.endswith('.geojson'):
            # GeoJSON format
            import geopandas as gpd
            gdf = gpd.read_file(file_path)
            
            # Convert GeoDataFrame to a list of dictionaries
            features = []
            for idx, row in gdf.iterrows():
                feature = {
                    "name": row.get('name', f"Unnamed Feature {idx}"),
                    "coordinates": [
                        float(row.geometry.x),
                        float(row.geometry.y)
                    ],
                    "type": row.get('type', 'unknown')
                }
                
                # Add other properties
                for prop in row.index:
                    if prop not in ['geometry', 'name', 'type'] and pd.notna(row[prop]):
                        feature[prop] = row[prop]
                
                features.append(feature)
            
            return features
        else:
            # JSON format
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Handle different JSON structures
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and 'features' in data:
                # GeoJSON-like structure
                features = []
                for feature in data['features']:
                    props = feature.get('properties', {})
                    geo = feature.get('geometry', {})
                    
                    if geo.get('type') == 'Point' and 'coordinates' in geo:
                        f = {
                            "name": props.get('name', 'Unnamed Feature'),
                            "coordinates": geo['coordinates'],
                            "type": props.get('type', 'unknown')
                        }
                        
                        # Add other properties
                        for key, value in props.items():
                            if key not in ['name', 'type']:
                                f[key] = value
                        
                        features.append(f)
                
                return features
            else:
                print(f"Unknown JSON structure in {file_path}")
                return []
    except Exception as e:
        print(f"Error loading {file_path}: {str(e)}")
        return []

def compare_user_preferences_with_osm_data(user_preferences, osm_data):
    """Compare user preferences with OSM data to find matching gems."""
    matching_gems = []
    
    # Extract preferences
    activities = set(user_preferences.get('activities', []))
    effort_level = user_preferences.get('effortLevel', 'moderate')
    accessibility_reqs = set(user_preferences.get('accessibility', []))
    
    # Match OSM features based on preferences
    for feature in osm_data:
        score = 0
        
        # Check for activity tags
        feature_tags = []
        if 'tags' in feature:
            feature_tags = feature['tags'] if isinstance(feature['tags'], list) else [feature['tags']]
        elif 'leisure' in feature:
            feature_tags.append(feature['leisure'])
        elif 'amenity' in feature:
            feature_tags.append(feature['amenity'])
        elif 'natural' in feature:
            feature_tags.append(feature['natural'])
        elif 'historic' in feature:
            feature_tags.append(feature['historic'])
        
        # Convert tags to set for intersection
        feature_tag_set = set(feature_tags)
        
        # Score for matching activities
        matching_activities = activities.intersection(feature_tag_set)
        score += len(matching_activities) * 3
        
        # Score for popularity (prefer hidden gems)
        if 'popularity_score' in feature:
            if feature['popularity_score'] is None or feature['popularity_score'] < 10:
                score += 5
            elif feature['popularity_score'] < 20:
                score += 3
            elif feature['popularity_score'] < 30:
                score += 1
        
        # Score for accessibility
        feature_accessibility = []
        if 'accessibility' in feature:
            feature_accessibility = feature['accessibility'] if isinstance(feature['accessibility'], list) else [feature['accessibility']]
        elif 'wheelchair' in feature:
            feature_accessibility.append('wheelchair')
        
        # Convert accessibility to set for intersection
        feature_accessibility_set = set(feature_accessibility)
        
        # Score for matching accessibility
        if accessibility_reqs and feature_accessibility_set.intersection(accessibility_reqs):
            score += 2
        
        # If score is above threshold, consider it a match
        if score > 0:
            # Add the score to the feature
            feature_copy = feature.copy()
            feature_copy['match_score'] = score
            matching_gems.append(feature_copy)
    
    # Sort matches by score
    matching_gems.sort(key=lambda x: x.get('match_score', 0), reverse=True)
    
    return matching_gems

def create_osm_gems_database():
    """Create a comprehensive database of OSM-based gems."""
    # Find all OSM data files
    osm_files = find_osm_data_files()
    
    if not osm_files:
        print("No OSM data files found")
        return False
    
    # Load data from all files
    all_features = []
    for file_path in osm_files:
        features = load_osm_data(file_path)
        print(f"Loaded {len(features)} features from {file_path}")
        all_features.extend(features)
    
    # Deduplicate features
    unique_features = []
    for feature in all_features:
        # Skip features without coordinates
        if 'coordinates' not in feature or not feature['coordinates']:
            continue
        
        # Check if this feature is a duplicate
        is_duplicate = False
        for existing_feature in unique_features:
            # Skip comparison if existing feature has no coordinates
            if 'coordinates' not in existing_feature or not existing_feature['coordinates']:
                continue
            
            # Check if names are similar
            name_match = False
            if 'name' in feature and 'name' in existing_feature:
                name_match = feature['name'].lower() == existing_feature['name'].lower()
            
            # Check if locations are close
            location_match = False
            try:
                lon1, lat1 = feature['coordinates']
                lon2, lat2 = existing_feature['coordinates']
                distance = haversine(lon1, lat1, lon2, lat2)
                location_match = distance < 0.5  # Less than 500m apart
            except:
                pass
            
            if name_match or location_match:
                is_duplicate = True
                break
        
        if not is_duplicate:
            unique_features.append(feature)
    
    print(f"Consolidated {len(all_features)} features into {len(unique_features)} unique features")
    
    # Save consolidated data
    output_file = "osm_gems_database.json"
    with open(output_file, 'w') as f:
        json.dump(unique_features, f, indent=2)
    
    print(f"Saved {len(unique_features)} unique features to {output_file}")
    return True

if __name__ == "__main__":
    # Create OSM gems database
    create_osm_gems_database()
    
    # Example of using the database with user preferences
    try:
        with open("osm_gems_database.json", 'r') as f:
            osm_data = json.load(f)
        
        # Example user preferences
        user_preferences = {
            "activities": ["hiking", "nature", "views"],
            "effortLevel": "moderate",
            "accessibility": ["wheelchair"],
            "time": "half-day",
            "maxDetour": "30"
        }
        
        # Find matching gems
        matches = compare_user_preferences_with_osm_data(user_preferences, osm_data)
        
        print(f"Found {len(matches)} matching gems")
        for i, match in enumerate(matches[:5]):
            print(f"{i+1}. {match.get('name', 'Unnamed')} - Score: {match.get('match_score')}")
        
        # Save matches
        with open("osm_matches.json", 'w') as f:
            json.dump(matches[:10], f, indent=2)
            
        print("Saved top 10 matches to osm_matches.json")
    except Exception as e:
        print(f"Error demonstrating database: {str(e)}")