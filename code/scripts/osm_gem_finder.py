import requests
import json
import os
import logging
import time
from math import radians, cos, sin, asin, sqrt
import random

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
CACHE_DIR = "osm_cache"
OSM_CACHE_DURATION_DAYS = 7
DATA_DIR = "gems_data"
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "tinyllama"  # Change as needed
LLM_TIMEOUT = 120

# Common OSM tags that match user activities
OSM_ACTIVITY_TAGS = {
    'hiking': {
        'leisure': ['park', 'nature_reserve'],
        'natural': ['peak', 'cliff', 'wood', 'water'],
        'highway': ['path', 'footway', 'track'],
        'tourism': ['viewpoint', 'attraction']
    },
    'nature': {
        'natural': ['beach', 'water', 'wood', 'tree', 'cliff', 'cave_entrance', 'peak', 'waterfall'],
        'leisure': ['nature_reserve', 'park', 'garden']
    },
    'food': {
        'amenity': ['restaurant', 'cafe', 'pub', 'bar', 'food_court'],
        'tourism': ['winery']
    },
    'history': {
        'historic': ['monument', 'memorial', 'archaeological_site', 'ruins', 'castle',
                    'fort', 'battlefield', 'building', 'church'],
        'tourism': ['museum', 'gallery']
    },
    'scenic': {
        'tourism': ['viewpoint', 'attraction'],
        'natural': ['peak', 'cliff', 'beach', 'water'],
        'leisure': ['park', 'garden']
    },
    'coffee': {
        'amenity': ['cafe']
    },
    'photography': {
        'tourism': ['viewpoint', 'attraction'],
        'natural': ['peak', 'cliff', 'beach', 'water', 'waterfall'],
        'historic': ['monument', 'memorial', 'ruins', 'castle']
    },
    'swimming': {
        'leisure': ['swimming_pool', 'swimming_area', 'beach_resort'],
        'natural': ['beach', 'water'],
        'amenity': ['swimming_pool']
    },
    'picnic': {
        'leisure': ['picnic_site', 'park', 'garden'],
        'amenity': ['picnic_site']
    }
}

# Common amenity tags
OSM_AMENITY_TAGS = {
    'restrooms': {
        'amenity': ['toilets']
    },
    'parking': {
        'amenity': ['parking', 'parking_space']
    },
    'gas': {
        'amenity': ['fuel']
    }
}

# Effort level mapping
OSM_EFFORT_TAGS = {
    'easy': {
        'sac_scale': ['hiking', 'mountain_hiking', 'demanding_mountain_hiking']
    },
    'moderate': {
        'sac_scale': ['demanding_mountain_hiking', 'alpine_hiking', 'demanding_alpine_hiking']
    },
    'challenging': {
        'sac_scale': ['demanding_alpine_hiking', 'difficult_alpine_hiking', 'demanding_difficult_alpine_hiking']
    }
}

# Accessibility tags
OSM_ACCESSIBILITY_TAGS = {
    'wheelchair': {
        'wheelchair': ['yes', 'limited', 'designated']
    },
    'stroller': {
        'wheelchair': ['yes', 'limited'],
        'sac_scale': ['hiking', 'mountain_hiking']
    },
    'elderly': {
        'wheelchair': ['yes', 'limited'],
        'sac_scale': ['hiking']
    }
}

def haversine(lon1, lat1, lon2, lat2):
    """Calculate the great circle distance between two points in kilometers."""
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a)) 
    r = 6371  # Radius of earth in kilometers
    return c * r

def create_route_buffer(origin_coords, destination_coords, buffer_distance_km=30):
    """Create a buffer (bounding box) around the route between origin and destination."""
    # Calculate route distance
    route_distance_km = haversine(origin_coords[0], origin_coords[1], 
                                  destination_coords[0], destination_coords[1])
    
    # Adjust buffer distance based on route distance
    adjusted_buffer_km = min(max(buffer_distance_km, route_distance_km * 0.1), 50)
    
    # Find min/max coordinates
    min_lon = min(origin_coords[0], destination_coords[0]) - adjusted_buffer_km / 85.0
    max_lon = max(origin_coords[0], destination_coords[0]) + adjusted_buffer_km / 85.0
    min_lat = min(origin_coords[1], destination_coords[1]) - adjusted_buffer_km / 111.0
    max_lat = max(origin_coords[1], destination_coords[1]) + adjusted_buffer_km / 111.0
    
    # Return the bounding box
    return (min_lat, min_lon, max_lat, max_lon)

def download_osm_data(bbox, tags):
    """Download OpenStreetMap data within a bounding box using the Overpass API."""
    min_lat, min_lon, max_lat, max_lon = bbox
    
    # Overpass API endpoint
    overpass_url = "https://overpass-api.de/api/interpreter"
    
    # Build tag query parts
    tag_parts = []
    for category, tag_values in tags.items():
        # Handle case where tag_values is a list (not a dict)
        if isinstance(tag_values, list):
            for value in tag_values:
                tag_parts.append(f'node["{category}"="{value}"]({min_lat},{min_lon},{max_lat},{max_lon});')
                tag_parts.append(f'way["{category}"="{value}"]({min_lat},{min_lon},{max_lat},{max_lon});')
        # Handle case where tag_values is a dict
        elif isinstance(tag_values, dict):
            for key, values in tag_values.items():
                for value in values:
                    tag_parts.append(f'node["{key}"="{value}"]({min_lat},{min_lon},{max_lat},{max_lon});')
                    tag_parts.append(f'way["{key}"="{value}"]({min_lat},{min_lon},{max_lat},{max_lon});')
    
    # Construct the query
    query = f"""
    [out:json][timeout:60];
    (
      {' '.join(tag_parts)}
    );
    out body;
    """
    
    logger.info(f"Downloading OSM data for bounding box ({min_lat:.4f},{min_lon:.4f},{max_lat:.4f},{max_lon:.4f})")
    
    # Make the request
    try:
        response = requests.post(overpass_url, data={'data': query}, timeout=60)
        
        if response.status_code != 200:
            logger.error(f"Overpass API error: {response.status_code} - {response.text[:200]}")
            return {"elements": []}
        
        data = response.json()
        logger.info(f"Downloaded {len(data.get('elements', []))} elements from OSM")
        return data
    except Exception as e:
        logger.error(f"Error downloading OSM data: {str(e)}")
        return {"elements": []}

def generate_osm_tags_from_preferences(user_preferences):
    """Generate OSM tags to search for based on user preferences."""
    # Initialize with a structure that stores lists of values for each key
    tags = {}
    
    # Add tags for activities
    for activity in user_preferences.get('activities', []):
        if activity in OSM_ACTIVITY_TAGS:
            for key, values in OSM_ACTIVITY_TAGS[activity].items():
                if key not in tags:
                    tags[key] = []
                for value in values:
                    if value not in tags[key]:
                        tags[key].append(value)
    
    # Add tags for amenities
    for amenity in user_preferences.get('amenities', []):
        if amenity in OSM_AMENITY_TAGS:
            for key, values in OSM_AMENITY_TAGS[amenity].items():
                if key not in tags:
                    tags[key] = []
                for value in values:
                    if value not in tags[key]:
                        tags[key].append(value)
    
    # Add tags for effort level
    effort_level = user_preferences.get('effortLevel', 'moderate')
    if effort_level in OSM_EFFORT_TAGS:
        for key, values in OSM_EFFORT_TAGS[effort_level].items():
            if key not in tags:
                tags[key] = []
            for value in values:
                if value not in tags[key]:
                    tags[key].append(value)
    
    # Add tags for accessibility
    for access in user_preferences.get('accessibility', []):
        if access in OSM_ACCESSIBILITY_TAGS:
            for key, values in OSM_ACCESSIBILITY_TAGS[access].items():
                if key not in tags:
                    tags[key] = []
                for value in values:
                    if value not in tags[key]:
                        tags[key].append(value)
    
    return tags

def get_cache_filename(origin_coords, destination_coords, tags):
    """Generate a cache filename for the given parameters."""
    # Create a string representation of the parameters
    params_str = f"{origin_coords}_{destination_coords}_{sorted([(k, sorted(v)) for k, v in tags.items()])}"
    
    # Create a hash of the parameters
    import hashlib
    params_hash = hashlib.md5(params_str.encode()).hexdigest()
    
    return f"{CACHE_DIR}/osm_data_{params_hash}.json"

def get_cached_osm_data(origin_coords, destination_coords, tags):
    """Get OSM data from cache if available and fresh."""
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
    
    cache_filename = get_cache_filename(origin_coords, destination_coords, tags)
    
    if os.path.exists(cache_filename):
        # Check if cache is still valid
        file_age_days = (time.time() - os.path.getmtime(cache_filename)) / (24 * 3600)
        if file_age_days < OSM_CACHE_DURATION_DAYS:
            try:
                with open(cache_filename, 'r') as f:
                    data = json.load(f)
                logger.info(f"Using cached OSM data from {cache_filename}")
                return data
            except Exception as e:
                logger.error(f"Error reading cache: {str(e)}")
    
    return None

def save_to_osm_cache(origin_coords, destination_coords, tags, data):
    """Save OSM data to cache."""
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
    
    cache_filename = get_cache_filename(origin_coords, destination_coords, tags)
    
    try:
        with open(cache_filename, 'w') as f:
            json.dump(data, f)
        logger.info(f"Saved OSM data to cache: {cache_filename}")
    except Exception as e:
        logger.error(f"Error saving to cache: {str(e)}")

def process_osm_elements(elements):
    """Process OSM elements into a format suitable for ranking."""
    processed_gems = []
    
    for element in elements:
        # Skip elements without tags
        if 'tags' not in element:
            continue
        
        tags = element['tags']
        
        # Basic properties
        gem = {
            'id': element['id'],
            'type': element['type'],
            'tags': tags
        }
        
        # Add coordinates
        if element['type'] == 'node':
            gem['coordinates'] = [element.get('lon', 0), element.get('lat', 0)]
        else:
            # For ways and relations, use the center if available
            if 'center' in element:
                gem['coordinates'] = [element['center'].get('lon', 0), element['center'].get('lat', 0)]
            else:
                # Skip elements without coordinates
                continue
        
        # Add name
        gem['name'] = tags.get('name', f"Unnamed {tags.get('natural') or tags.get('amenity') or tags.get('historic') or 'Feature'}")
        
        # Add category fields for easier filtering
        if 'natural' in tags:
            gem['natural'] = tags['natural']
        if 'amenity' in tags:
            gem['amenity'] = tags['amenity']
        if 'historic' in tags:
            gem['historic'] = tags['historic']
        if 'leisure' in tags:
            gem['leisure'] = tags['leisure']
        
        # Add accessibility info
        gem['accessibility'] = []
        if 'wheelchair' in tags and tags['wheelchair'] in ['yes', 'limited', 'designated']:
            gem['accessibility'].append('wheelchair')
        
        # Add description (to be enhanced later)
        gem['description'] = f"A {tags.get('natural') or tags.get('amenity') or tags.get('historic') or tags.get('leisure') or 'feature'} in Northern California"
        
        # Add random popularity score with bias toward being hidden
        # Most OSM features aren't on typical tourist itineraries
        gem['popularity_score'] = random.randint(1, 40) if random.random() > 0.3 else None
        
        # Set rarity based on popularity
        if gem['popularity_score'] is None or gem['popularity_score'] < 10:
            gem['rarity'] = 'most hidden'
            gem['color'] = 'red'
        elif gem['popularity_score'] < 25:
            gem['rarity'] = 'moderately hidden'
            gem['color'] = 'purple'
        else:
            gem['rarity'] = 'least hidden'
            gem['color'] = 'blue'
        
        # Set visit time (minutes) based on type
        if 'natural' in gem and gem['natural'] in ['peak', 'forest', 'wood']:
            gem['time'] = random.randint(120, 240)  # 2-4 hours
        elif 'leisure' in gem and gem['leisure'] in ['park', 'garden', 'nature_reserve']:
            gem['time'] = random.randint(90, 180)  # 1.5-3 hours
        elif 'amenity' in gem and gem['amenity'] in ['restaurant', 'cafe']:
            gem['time'] = random.randint(45, 90)  # 45-90 minutes
        elif 'historic' in gem:
            gem['time'] = random.randint(60, 120)  # 1-2 hours
        else:
            gem['time'] = 60  # Default to 1 hour
        
        # Add to processed gems
        processed_gems.append(gem)
    
    logger.info(f"Processed {len(processed_gems)} valid OSM elements into gems")
    return processed_gems

def get_osm_gems_for_route(origin_coords, destination_coords, user_preferences, max_gems=50):
    """Get OSM gems along a route matching user preferences."""
    # Generate OSM tags to search for
    tags = generate_osm_tags_from_preferences(user_preferences)
    logger.info(f"Generated {sum(len(v) for v in tags.values())} OSM tags from user preferences")
    
    # Create route buffer
    bbox = create_route_buffer(origin_coords, destination_coords, 
                                buffer_distance_km=int(user_preferences.get('maxDetour', '30').replace('+', '')))
    
    # Check cache first
    osm_data = get_cached_osm_data(origin_coords, destination_coords, tags)
    
    # If not in cache, download from OSM
    if not osm_data:
        osm_data = download_osm_data(bbox, tags)
        save_to_osm_cache(origin_coords, destination_coords, tags, osm_data)
    
    # Process OSM elements
    gems = process_osm_elements(osm_data.get('elements', []))
    
    # Add distance to route
    for gem in gems:
        if 'coordinates' in gem:
            gem_lon, gem_lat = gem['coordinates']
            
            # Calculate distances to origin and destination
            dist_to_origin = haversine(gem_lon, gem_lat, origin_coords[0], origin_coords[1])
            dist_to_dest = haversine(gem_lon, gem_lat, destination_coords[0], destination_coords[1])
            
            # Store the minimum distance
            gem['detour_distance'] = min(dist_to_origin, dist_to_dest)
    
    # Filter based on max detour distance
    max_detour = int(user_preferences.get('maxDetour', '30').replace('+', ''))
    gems = [gem for gem in gems if gem.get('detour_distance', 100) <= max_detour]
    
    # Filter based on available time
    time_mapping = {
        "quick": 60,       # < 1 hour
        "short": 120,      # 1-2 hours
        "half-day": 240,   # 2-4 hours
        "full-day": 480    # 4+ hours
    }
    max_time = time_mapping.get(user_preferences.get('time', 'half-day'), 240)
    gems = [gem for gem in gems if gem.get('time', 120) <= max_time * 1.2]  # Allow 20% buffer
    
    # Sort by a combination of factors (rarity and distance)
    def gem_score(gem):
        rarity_score = {'most hidden': 3, 'moderately hidden': 2, 'least hidden': 1}.get(gem.get('rarity', 'moderately hidden'), 2)
        distance_score = 1.0 - min(gem.get('detour_distance', 0), max_detour) / max_detour
        return rarity_score * 2 + distance_score
    
    gems.sort(key=gem_score, reverse=True)
    
    # Return limited number of gems
    return gems[:max_gems]

def create_llm_prompt(user_preferences, available_gems):
    """Create a prompt for the LLM to recommend gems."""
    # Only use top gems to keep prompt small
    selected_gems = available_gems[:15]
    
    # Create a structured prompt
    prompt = "You will recommend Northern California hidden gems based on user preferences.\n\n"
    
    # Add user preferences
    activities = ', '.join(user_preferences.get('activities', ['Any']))
    amenities = ', '.join(user_preferences.get('amenities', ['None']))
    accessibility = ', '.join(user_preferences.get('accessibility', ['None']))
    
    prompt += f"USER PREFERENCES:\n"
    prompt += f"- Activities: {activities}\n"
    prompt += f"- Required amenities: {amenities}\n"
    prompt += f"- Effort level: {user_preferences.get('effortLevel', 'Any')}\n"
    prompt += f"- Accessibility needs: {accessibility}\n"
    prompt += f"- Time available: {user_preferences.get('time', 'Any')}\n"
    prompt += f"- Max detour distance: {user_preferences.get('maxDetour', '30')} miles\n\n"
    
    # Add available gems
    prompt += "AVAILABLE GEMS:\n"
    for i, gem in enumerate(selected_gems):
        category = gem.get('natural', '') or gem.get('amenity', '') or gem.get('historic', '') or gem.get('leisure', '')
        detour = gem.get('detour_distance', 0)
        rarity = gem.get('rarity', 'moderately hidden')
        
        prompt += f"{i+1}. {gem['name']} - {category} - {rarity} - {detour:.1f}km detour\n"
    
    # Add instructions
    prompt += "\nRecommend the top 10 hidden gems that match the user's preferences. Return a JSON array with the following format:\n"
    prompt += """
[
  {
    "name": "Gem Name",
    "coordinates": [longitude, latitude],
    "category": "nature|food|historic|scenic",
    "description": "A compelling one-sentence description",
    "rarity": "most hidden|moderately hidden|least hidden",
    "color": "red|purple|blue"
  },
  {...more gems...}
]
"""
    
    prompt += "\nBegin JSON response:\n"
    
    return prompt

def extract_json_from_llm_response(raw_response):
    """Extract JSON from LLM response, handling common issues."""
    logger.info(f"Attempting to extract JSON from response of length: {len(raw_response)}")
    
    try:
        # Try direct parsing first
        data = json.loads(raw_response)
        
        # Return as is if it's a list
        if isinstance(data, list):
            return data
        
        # If it's a dict with a gems field, return that
        if isinstance(data, dict) and "gems" in data and isinstance(data["gems"], list):
            return data["gems"]
    except Exception as e:
        logger.error(f"Initial JSON parsing failed: {str(e)}")
    
    # Try to find JSON array in the response
    try:
        import re
        match = re.search(r'\[\s*{.*}\s*\]', raw_response, re.DOTALL)
        if match:
            json_string = match.group(0)
            return json.loads(json_string)
    except Exception as e:
        logger.error(f"JSON array extraction failed: {str(e)}")
    
    # Fallback approach
    try:
        # Look for individual objects and try to assemble them
        import re
        objects = re.findall(r'{[^{}]*}', raw_response)
        valid_objects = []
        
        for obj_str in objects:
            try:
                # Clean up the object string
                clean_obj_str = re.sub(r',\s*}', '}', obj_str)
                obj = json.loads(clean_obj_str)
                valid_objects.append(obj)
            except:
                pass
        
        if valid_objects:
            return valid_objects
    except Exception as e:
        logger.error(f"Fallback JSON extraction failed: {str(e)}")
    
    # If all else fails, return empty list
    return []

def validate_and_format_gems(gems, original_gems=None):
    """Validate and format the recommended gems."""
    if not gems:
        logger.warning("No gems to validate")
        return []
    
    valid_gems = []
    original_gems_by_name = {}
    
    # Create a lookup for original gems if provided
    if original_gems:
        for gem in original_gems:
            original_gems_by_name[gem.get('name', '').lower()] = gem
    
    logger.info(f"Validating {len(gems)} gems")
    
    for i, gem in enumerate(gems):
        # Skip if no name
        if 'name' not in gem or not gem['name']:
            continue
            
        # Create a valid gem
        valid_gem = {
            'name': gem.get('name', f"Unnamed Gem {i+1}")
        }
        
        # Get coordinates
        if 'coordinates' in gem and isinstance(gem['coordinates'], list) and len(gem['coordinates']) == 2:
            valid_gem['coordinates'] = gem['coordinates']
        elif 'coordinate' in gem and isinstance(gem['coordinate'], list) and len(gem['coordinate']) == 2:
            valid_gem['coordinates'] = gem['coordinate']
        elif original_gems_by_name and valid_gem['name'].lower() in original_gems_by_name:
            valid_gem['coordinates'] = original_gems_by_name[valid_gem['name'].lower()].get('coordinates', [0, 0])
        else:
            # Skip if no valid coordinates
            logger.warning(f"Gem {i+1} has no valid coordinates")
            continue
        
        # Get category
        if 'category' in gem:
            valid_gem['category'] = gem['category']
        elif original_gems_by_name and valid_gem['name'].lower() in original_gems_by_name:
            orig = original_gems_by_name[valid_gem['name'].lower()]
            if 'natural' in orig:
                valid_gem['category'] = 'nature'
            elif 'amenity' in orig:
                valid_gem['category'] = 'food' if orig['amenity'] in ['restaurant', 'cafe', 'pub'] else 'amenity'
            elif 'historic' in orig:
                valid_gem['category'] = 'historic'
            elif 'leisure' in orig:
                valid_gem['category'] = 'leisure'
            else:
                valid_gem['category'] = 'scenic'
        else:
            valid_gem['category'] = 'scenic'
        
        # Get description
        if 'description' in gem:
            valid_gem['description'] = gem['description']
        elif original_gems_by_name and valid_gem['name'].lower() in original_gems_by_name:
            valid_gem['description'] = original_gems_by_name[valid_gem['name'].lower()].get('description', f"A hidden gem in Northern California")
        else:
            valid_gem['description'] = f"A hidden gem in Northern California featuring {valid_gem['category']}"
        
        # Get rarity
        if 'rarity' in gem:
            valid_gem['rarity'] = gem['rarity']
        elif original_gems_by_name and valid_gem['name'].lower() in original_gems_by_name:
            valid_gem['rarity'] = original_gems_by_name[valid_gem['name'].lower()].get('rarity', 'moderately hidden')
        else:
            valid_gem['rarity'] = 'moderately hidden'
        
        # Get color
        if 'color' in gem:
            # Handle hex colors
            color = gem['color']
            if isinstance(color, str) and color.startswith('#'):
                color = {'#ff0000': 'red', '#00ff00': 'green', '#0000ff': 'blue', 
                         '#ff9900': 'orange', '#9900ff': 'purple'}.get(color.lower(), 'purple')
            valid_gem['color'] = color
        else:
            # Map rarity to color
            rarity_color_map = {
                'most hidden': 'red',
                'moderately hidden': 'purple',
                'least hidden': 'blue'
            }
            valid_gem['color'] = rarity_color_map.get(valid_gem['rarity'], 'purple')
        
        # Add other optional fields from original gem
        if original_gems_by_name and valid_gem['name'].lower() in original_gems_by_name:
            orig = original_gems_by_name[valid_gem['name'].lower()]
            valid_gem['time'] = orig.get('time', 120)
            valid_gem['accessibility'] = orig.get('accessibility', [])
            valid_gem['detour_distance'] = orig.get('detour_distance', 5)
        
        # Add the valid gem
        valid_gems.append(valid_gem)
    
    logger.info(f"Validated {len(valid_gems)} gems as valid")
    return valid_gems

def rank_gems_with_llm(gems, user_preferences):
    """Rank gems using the LLM to find best matches for user preferences."""
    if not gems:
        logger.warning("No gems to rank")
        return []
    
    # Create the prompt
    prompt = create_llm_prompt(user_preferences, gems)
    
    # Call the LLM
    try:
        logger.info(f"Calling LLM for gem ranking with model: {OLLAMA_MODEL}")
        response = requests.post(
            OLLAMA_URL, 
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,  # Lower temperature for consistency
                    "max_tokens": 1500
                }
            },
            timeout=LLM_TIMEOUT
        )
        
        if response.status_code == 200:
            raw_response = response.json().get("response", "")
            
            # Save the raw response for debugging
            with open(f"{DATA_DIR}/llm_response_{int(time.time())}.txt", 'w') as f:
                f.write(raw_response)
            
            # Try to parse the JSON
            llm_gems = extract_json_from_llm_response(raw_response)
            
            if llm_gems and len(llm_gems) > 0:
                # Validate and format the gems
                result = validate_and_format_gems(llm_gems, original_gems=gems)
                logger.info(f"LLM successfully ranked {len(result)} gems")
                return result
            else:
                logger.warning("LLM returned no valid gems, falling back to algorithmic ranking")
        else:
            logger.error(f"LLM API call failed with status {response.status_code}")
    except Exception as e:
        logger.error(f"Error calling LLM: {str(e)}")
    
    # Fall back to algorithmic ranking
    return rank_gems_algorithmically(gems, user_preferences)

def rank_gems_algorithmically(gems, user_preferences):
    """Rank gems algorithmically (fallback approach)."""
    logger.info(f"Using algorithmic ranking for {len(gems)} gems")
    
    # Get user preferences
    activities = set(user_preferences.get('activities', []))
    amenities = set(user_preferences.get('amenities', []))
    effort_level = user_preferences.get('effortLevel', 'moderate')
    accessibility_reqs = set(user_preferences.get('accessibility', []))
    
    # Score each gem
    scored_gems = []
    for gem in gems:
        score = 0
        
        # Score for rarity
        if gem.get('rarity') == 'most hidden':
            score += 5
        elif gem.get('rarity') == 'moderately hidden':
            score += 3
        
        # Score for matching activities
        category = gem.get('natural', '') or gem.get('amenity', '') or gem.get('historic', '') or gem.get('leisure', '') or ''
        gem_tags = set()
        
        # Extract tags from OSM data
        for activity, tag_dict in OSM_ACTIVITY_TAGS.items():
            for key, values in tag_dict.items():
                if key in gem and gem[key] in values:
                    gem_tags.add(activity)
        
        # Add explicit tags if present
        if 'tags' in gem and isinstance(gem['tags'], dict):
            for tag_key, tag_value in gem['tags'].items():
                for activity, tag_dict in OSM_ACTIVITY_TAGS.items():
                    for key, values in tag_dict.items():
                        if tag_key == key and tag_value in values:
                            gem_tags.add(activity)
        
        # Score for activity matches
        matching_activities = activities.intersection(gem_tags)
        score += len(matching_activities) * 3
        
        # Score for amenities
        gem_amenities = set()
        for amenity, tag_dict in OSM_AMENITY_TAGS.items():
            for key, values in tag_dict.items():
                if key in gem.get('tags', {}) and gem['tags'][key] in values:
                    gem_amenities.add(amenity)
        
        matching_amenities = amenities.intersection(gem_amenities)
        score += len(matching_amenities) * 2
        
        # Score for accessibility
        gem_accessibility = set(gem.get('accessibility', []))
        if accessibility_reqs and gem_accessibility.intersection(accessibility_reqs):
            score += 3
        
        # Score for detour distance (closer is better)
        max_detour = int(user_preferences.get('maxDetour', '30').replace('+', ''))
        detour_score = 1.0 - min(gem.get('detour_distance', 0), max_detour) / max_detour
        score += detour_score * 2
        
        # Add the score
        gem_copy = gem.copy()
        gem_copy['score'] = score
        scored_gems.append(gem_copy)
    
    # Sort by score
    scored_gems.sort(key=lambda x: x.get('score', 0), reverse=True)
    
    # Format the top 10
    result = []
    for gem in scored_gems[:10]:
        result.append({
            'name': gem.get('name', 'Unnamed Gem'),
            'coordinates': gem.get('coordinates', [0, 0]),
            'category': gem.get('category', 'scenic'),
            'description': gem.get('description', 'A hidden gem in Northern California'),
            'rarity': gem.get('rarity', 'moderately hidden'),
            'color': gem.get('color', 'purple'),
            'time': gem.get('time', 120),
            'accessibility': gem.get('accessibility', []),
            'detour_distance': gem.get('detour_distance', 5)
        })
    
    return result

def find_top_recommendations(origin, destination, user_preferences):
    """Find top gem recommendations for a trip."""
    # Ensure data directory exists
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    
    # Convert addresses to coordinates if needed
    if isinstance(origin, str):
        origin_coords = geocode_location(origin)
    else:
        origin_coords = origin
    
    if isinstance(destination, str):
        destination_coords = geocode_location(destination)
    else:
        destination_coords = destination
    
    if not origin_coords or not destination_coords:
        logger.error(f"Failed to geocode locations: {origin} or {destination}")
        return []
    
    # Get OSM gems along the route
    osm_gems = get_osm_gems_for_route(origin_coords, destination_coords, user_preferences, max_gems=100)
    
    # Save the OSM gems for reference
    osm_filename = f"{DATA_DIR}/osm_gems_{int(time.time())}.json"
    with open(osm_filename, 'w') as f:
        json.dump(osm_gems, f, indent=2)
    
    logger.info(f"Saved {len(osm_gems)} OSM gems to {osm_filename}")
    
    # Rank the gems
    try:
        ranked_gems = rank_gems_with_llm(osm_gems, user_preferences)
    except Exception as e:
        logger.error(f"Error ranking gems with LLM: {str(e)}")
        ranked_gems = rank_gems_algorithmically(osm_gems, user_preferences)
    
    # Save the ranked gems
    ranked_filename = f"{DATA_DIR}/ranked_gems_{int(time.time())}.json"
    with open(ranked_filename, 'w') as f:
        json.dump(ranked_gems, f, indent=2)
    
    logger.info(f"Saved {len(ranked_gems)} ranked gems to {ranked_filename}")
    
    return ranked_gems

def geocode_location(location):
    """Convert a location name to coordinates."""
    try:
        # Use a simple geocoding API
        url = f"https://nominatim.openstreetmap.org/search?q={location}&format=json&limit=1"
        response = requests.get(url, headers={'User-Agent': 'NorCalHiddenGems/1.0'})
        
        if response.status_code == 200:
            data = response.json()
            if data:
                return [float(data[0]['lon']), float(data[0]['lat'])]
        
        logger.error(f"Failed to geocode location: {location}")
        return None
    except Exception as e:
        logger.error(f"Error geocoding location {location}: {str(e)}")
        return None

def precache_trip_recommendations(trips, llm_timeout=600, total_timeout=3600):
    """Precache recommendations for specified trips."""
    global LLM_TIMEOUT
    original_timeout = LLM_TIMEOUT
    LLM_TIMEOUT = llm_timeout
    
    start_time = time.time()
    results = []
    
    for trip in trips:
        # Check if we're running out of time
        elapsed = time.time() - start_time
        if elapsed > total_timeout:
            logger.warning(f"Precaching timeout reached after {elapsed:.1f} seconds. Stopping.")
            break
            
        logger.info(f"Precaching recommendations for trip: {trip['origin']} to {trip['destination']}")
        
        try:
            recommendations = find_top_recommendations(
                trip['origin'],
                trip['destination'],
                trip
            )
            
            results.append({
                'trip': trip,
                'status': 'success',
                'gems_count': len(recommendations),
                'gems': recommendations
            })
            
            logger.info(f"Successfully precached {len(recommendations)} recommendations")
        except Exception as e:
            logger.error(f"Error precaching trip: {str(e)}")
            results.append({
                'trip': trip,
                'status': 'error',
                'error': str(e)
            })
    
    # Restore original timeout
    LLM_TIMEOUT = original_timeout
    
    return results

if __name__ == "__main__":
    # Example usage
    sample_trips = [
        {
            "origin": "Berkeley, CA",
            "destination": "Dublin, CA",
            "activities": ["hiking", "coffee", "photography"],
            "amenities": ["restrooms", "parking"],
            "effortLevel": "moderate",
            "accessibility": ["wheelchair"],
            "time": "half-day",
            "maxDetour": "15"
        },
        {
            "origin": "San Francisco, CA",
            "destination": "Santa Cruz, CA",
            "activities": ["nature", "food", "scenic"],
            "amenities": ["restrooms"],
            "effortLevel": "easy",
            "accessibility": [],
            "time": "full-day",
            "maxDetour": "30"
        }
    ]
    
    # Precache recommendations
    results = precache_trip_recommendations(sample_trips, llm_timeout=600)
    
    # Print results
    for result in results:
        print(f"Trip: {result['trip']['origin']} to {result['trip']['destination']}")
        print(f"Status: {result['status']}")
        
        if result['status'] == 'success':
            print(f"Found {result['gems_count']} recommendations")
            
            if result['gems_count'] > 0:
                print("\nTop recommendations:")
                for i, gem in enumerate(result['gems'][:3]):
                    print(f"{i+1}. {gem['name']} - {gem['category']} - {gem['rarity']}")
        else:
            print(f"Error: {result.get('error', 'Unknown error')}")
        
        print("\n" + "-"*50 + "\n")