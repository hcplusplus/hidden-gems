from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import re
import logging
import os
import sys
from math import radians, cos, sin, asin, sqrt
import random

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Allow CORS from frontend

# Configuration
# Add these configurations at the top of your file
CACHE_DIRECTORY = "recommendation_cache"
CACHE_DURATION_HOURS = 72  # Cache valid for 3 days
LLM_TIMEOUT_SECONDS = 180  # 3 minutes for pre-cached results
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"  # Standard Ollama endpoint
OLLAMA_MODEL = "tinyllama"
GEMS_DATABASE = "gems_database_demo.json"
MAX_GEMS_RETURN = 10

import os
import hashlib
import time
from datetime import datetime

def get_cache_key(user_preferences):
    """Generate a unique cache key from user preferences."""
    # Sort the preferences to ensure consistent keys
    sorted_prefs = json.dumps(user_preferences, sort_keys=True)
    return hashlib.md5(sorted_prefs.encode()).hexdigest()

def get_cached_recommendations(user_preferences):
    """Try to get recommendations from cache."""
    # Create cache directory if it doesn't exist
    if not os.path.exists(CACHE_DIRECTORY):
        os.makedirs(CACHE_DIRECTORY)
    
    cache_key = get_cache_key(user_preferences)
    cache_file = os.path.join(CACHE_DIRECTORY, f"{cache_key}.json")
    
    if os.path.exists(cache_file):
        # Check if cache is still valid
        file_age_hours = (time.time() - os.path.getmtime(cache_file)) / 3600
        if file_age_hours < CACHE_DURATION_HOURS:
            try:
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                    logger.info(f"Using cached recommendations from {datetime.fromtimestamp(os.path.getmtime(cache_file))}")
                    return cached_data
            except Exception as e:
                logger.error(f"Error reading cache: {str(e)}")
    
    return None

def save_to_cache(user_preferences, recommendations):
    """Save recommendations to cache."""
    try:
        cache_key = get_cache_key(user_preferences)
        cache_file = os.path.join(CACHE_DIRECTORY, f"{cache_key}.json")
        
        with open(cache_file, 'w') as f:
            json.dump(recommendations, f, indent=2)
            
        logger.info(f"Saved recommendations to cache: {cache_file}")
    except Exception as e:
        logger.error(f"Error saving to cache: {str(e)}")

@app.route("/precache_recommendations", methods=["POST"])
def precache_recommendations():
    """Endpoint to precache recommendations for specific trips."""
    try:
        # Get predefined trips from request
        predefined_trips = request.get_json()
        if not predefined_trips or not isinstance(predefined_trips, list):
            return jsonify({"error": "Please provide a list of predefined trips"}), 400
        
        results = []
        
        for trip in predefined_trips:
            # Check if already cached
            existing_cache = get_cached_recommendations(trip)
            if existing_cache:
                results.append({
                    "trip": trip,
                    "status": "already_cached",
                    "gems_count": len(existing_cache)
                })
                continue
            
            # Process this trip
            try:
                # Load and filter gems
                all_gems = load_gems_database()
                filtered_gems = filter_gems_by_preferences(all_gems, trip)
                
                if not filtered_gems:
                    results.append({
                        "trip": trip,
                        "status": "no_matching_gems",
                        "error": "No gems match these preferences"
                    })
                    continue
                
                # Try using LLM with longer timeout
                llm_success = False
                recommended_gems = []
                
                try:
                    # Build optimized prompt for TinyLlama
                    prompt = build_optimized_prompt(trip, filtered_gems)
                    
                    logger.info(f"Calling Ollama API for precaching trip: {trip.get('origin')} to {trip.get('destination')}")
                    response = requests.post(
                        OLLAMA_URL, 
                        json={
                            "model": OLLAMA_MODEL,
                            "prompt": prompt,
                            "stream": False,
                            "options": {
                                "temperature": 0.1,  # Very low temperature for deterministic output
                                "max_tokens": 1000
                            }
                        },
                        timeout=300  # 5-minute timeout for precaching
                    )
                    
                    if response.status_code == 200:
                        raw_response = response.json().get("response", "")
                        
                        # Log the raw response for debugging
                        logger.info(f"Raw LLM response: {raw_response}")
                        
                        # Save the raw response to a file for inspection
                        raw_response_file = f"raw_response_{trip.get('origin').replace(', ', '_')}_to_{trip.get('destination').replace(', ', '_')}.txt"
                        with open(raw_response_file, 'w') as f:
                            f.write(raw_response)
                            
                        logger.info(f"Saved raw response to {raw_response_file}")
                        
                        # Try to parse the JSON
                        llm_gems = extract_json_from_llm_response(raw_response)
                        
                        logger.info(f"Extracted {len(llm_gems)} gems from LLM response")
                        
                        if llm_gems and len(llm_gems) > 0:
                            recommended_gems = llm_gems
                            llm_success = True
                            logger.info(f"LLM successfully generated recommendations for trip: {trip.get('origin')} to {trip.get('destination')}")
                        else:
                            logger.warning(f"LLM returned no valid gems for trip: {trip.get('origin')} to {trip.get('destination')}")
                    else:
                        logger.warning(f"LLM API call failed with status {response.status_code}")
                        
                except Exception as e:
                    logger.warning(f"LLM attempt failed: {str(e)}")
                
                # Fall back to ranking algorithm if LLM failed or returned no gems
                if not llm_success or not recommended_gems:
                    logger.info(f"Using fallback ranking algorithm for trip: {trip.get('origin')} to {trip.get('destination')}")
                    recommended_gems = simple_rank_gems(filtered_gems, trip)
                
                # Validate and format
                formatted_gems = validate_and_format_gems(recommended_gems)
                
                logger.info(f"Final formatted gems count: {len(formatted_gems)}")
                
                # Cache the results
                save_to_cache(trip, formatted_gems)
                
                results.append({
                    "trip": trip,
                    "status": "success",
                    "gems_count": len(formatted_gems),
                    "method": "llm" if llm_success else "fallback"
                })
                
            except Exception as e:
                logger.exception(f"Error precaching trip: {str(e)}")
                results.append({
                    "trip": trip,
                    "status": "error",
                    "error": str(e)
                })
        
        return jsonify({
            "results": results,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.exception(f"Error in precaching: {str(e)}")
        return jsonify({"error": "Precaching failed", "details": str(e)}), 500

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

def map_time_to_minutes(time_preference):
    """Convert time preference to approximate minutes."""
    time_mapping = {
        "quick": 60,       # < 1 hour
        "short": 120,      # 1-2 hours
        "half-day": 240,   # 2-4 hours
        "full-day": 480    # 4+ hours
    }
    return time_mapping.get(time_preference, 240)  # Default to half-day if unknown

def map_max_detour_to_km(detour_preference):
    """Convert detour preference to kilometers."""
    if not detour_preference or detour_preference == "50+":
        return 100  # Any distance
        
    try:
        # Remove non-numeric characters and convert to float
        return float(re.sub(r'[^\d.]', '', str(detour_preference)))
    except (ValueError, TypeError):
        return 30  # Default to 30km if conversion fails
    
def load_gems_database():
    """Load gems from the database file."""
    try:
        with open(GEMS_DATABASE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error(f"Error loading gems database: {str(e)}")
        # Return empty list if file doesn't exist or isn't valid JSON
        return []

def filter_gems_by_preferences(gems, user_preferences):
    """
    Filter gems based on user preferences before sending to LLM.
    This reduces the amount of data in the prompt and improves relevance.
    """
    if not gems:
        return []
    
    filtered_gems = []
    
    # Get coordinates
    origin_coords = user_preferences.get('originCoords', None)
    dest_coords = user_preferences.get('destinationCoords', None)
    
    # Calculate max detour distance
    max_detour_km = map_max_detour_to_km(user_preferences.get('maxDetour', '30'))
    
    # Calculate max visit time
    max_time_min = map_time_to_minutes(user_preferences.get('time', 'half-day'))
    
    for gem in gems:
        # Skip gems that take too long to visit
        if gem.get('time', 0) > max_time_min * 1.2:  # Allow 20% buffer
            continue
            
        # Filter by location proximity if coordinates are available
        if origin_coords and dest_coords and gem.get('coordinates'):
            # Check if gem is within detour distance from either origin or destination
            gem_lon, gem_lat = gem['coordinates']
            
            origin_lon, origin_lat = origin_coords
            dest_lon, dest_lat = dest_coords
            
            distance_from_origin = haversine(gem_lon, gem_lat, origin_lon, origin_lat)
            distance_from_dest = haversine(gem_lon, gem_lat, dest_lon, dest_lat)
            
            # Skip if gem is too far from both origin and destination
            if distance_from_origin > max_detour_km and distance_from_dest > max_detour_km:
                continue
        
        # Add detour distance to gem for use in ranking
        if origin_coords and dest_coords:
            gem['detour_distance'] = min(distance_from_origin, distance_from_dest)
        
        filtered_gems.append(gem)
    
    # If we have too few gems after filtering, add some random ones back
    if len(filtered_gems) < 20 and len(gems) > 20:
        remaining_gems = [g for g in gems if g not in filtered_gems]
        random.shuffle(remaining_gems)
        filtered_gems.extend(remaining_gems[:20 - len(filtered_gems)])
    
    # Limit to 20 gems maximum for reasonable prompt size
    return filtered_gems[:20]

def format_gem_for_prompt(gem):
    """Format gem data in a consistent, readable way for the LLM prompt."""
    # Extract only necessary fields to keep prompt concise
    formatted_gem = {
        "name": gem.get("name", "Unnamed Location"),
        "coordinates": gem.get("coordinates", [0, 0]),
        "amenity": gem.get("amenity", ""),
        "natural": gem.get("natural", ""),
        "historic": gem.get("historic", ""),
        "leisure": gem.get("leisure", ""),
        "opening_hours": gem.get("opening_hours", "unknown"),
        "activity_cost": gem.get("activity_cost", "$"),
        "popularity_score": gem.get("popularity_score", 50),
        "rarity": gem.get("rarity", ""),
        "time": gem.get("time", 120),  # Estimated time in minutes
        "tags": gem.get("tags", []),
        "accessibility": gem.get("accessibility", [])
    }
    return formatted_gem

def build_optimized_prompt(user_preferences, available_gems):
    """Build a prompt that's very structured and simple for TinyLlama."""
    # Only use top 8 most relevant gems to keep prompt small
    selected_gems = available_gems[:8]
    
    # Very structured format for the prompt
    prompt = "You will recommend hidden gems in Northern California based on user preferences.\n\n"
    
    # Add user preferences in a very structured way
    activities = ', '.join(user_preferences.get('activities', ['Any']))
    prompt += f"USER WANTS: Activities: {activities}, Effort: {user_preferences.get('effortLevel', 'Any')}\n\n"
    
    # Add gems in a very structured way
    prompt += "AVAILABLE GEMS:\n"
    for i, gem in enumerate(selected_gems):
        name = gem.get('name', 'Unnamed Location')
        category = gem.get('natural', '') or gem.get('amenity', '') or gem.get('historic', '') or gem.get('leisure', '')
        rarity = gem.get('rarity', 'moderately hidden')
        tags = ', '.join(gem.get('tags', [])[:3])
        
        prompt += f"{i+1}. {name} - {category} - {tags} - {rarity}\n"
    
    # Add very clear instructions for the output format
    prompt += "\nReturn 5 gems as a flat list in valid JSON format.\n"
    prompt += "EXACTLY use this format for each gem:\n"
    prompt += """
[
  {
    "name": "Gem Name",
    "coordinates": [longitude, latitude],
    "category": "nature",
    "description": "Brief description",
    "rarity": "most hidden",
    "color": "red"
  },
  {...more gems...}
]
"""
    
    prompt += "\nBegin JSON response:\n"
    
    return prompt

def build_prompt(user_preferences, available_gems):
    """Build a prompt for the LLM based on user preferences and available gems."""
    # Format available gems
    formatted_gems = [format_gem_for_prompt(gem) for gem in available_gems]
    
    # Map time preference to minutes
    time_minutes = map_time_to_minutes(user_preferences.get('time', 'half-day'))
    
    # Format coordinates for origin and destination
    origin_coords = user_preferences.get('originCoords', [0, 0])
    dest_coords = user_preferences.get('destinationCoords', [0, 0])
    
    # Construct the prompt
    prompt = f"""
You are NorCalGems, an AI travel expert specializing in Northern California's hidden gems. 
Your task is to recommend the top {MAX_GEMS_RETURN} hidden gems based on user preferences.

### USER TRIP DETAILS ###
- Starting Location: {user_preferences.get('origin', 'Unknown')} (coordinates: {origin_coords})
- Destination: {user_preferences.get('destination', 'Unknown')} (coordinates: {dest_coords})
- Activities of Interest: {', '.join(user_preferences.get('activities', ['Any']))}
- Required Amenities: {', '.join(user_preferences.get('amenities', ['None']))}
- Preferred Effort Level: {user_preferences.get('effortLevel', 'Any')}
- Accessibility Requirements: {', '.join(user_preferences.get('accessibility', ['None']))}
- Time Available: {user_preferences.get('time', 'Any')} (approximately {time_minutes} minutes)
- Maximum Detour: {user_preferences.get('maxDetour', 'Any')} miles

### AVAILABLE HIDDEN GEMS ###
{json.dumps(formatted_gems, indent=2)}

### INSTRUCTIONS ###
1. Analyze the user preferences and available hidden gems.
2. Select the top {MAX_GEMS_RETURN} gems that best match the user's preferences.
3. Prioritize gems with lower popularity scores (more hidden).
4. Ensure selected gems can be visited within the user's time constraints.
5. Consider proximity to the user's route between origin and destination.

### RESPONSE FORMAT ###
Return ONLY a JSON array (no explanations or other text) with the following structure:
[
  {{
    "name": "Hidden Gem Name",
    "coordinates": [longitude, latitude],
    "category": "nature|food|historic|leisure|scenic|...",
    "description": "A short synthetic user review. No more than 50 tokens.",
    "rarity": "most hidden|moderately hidden|least hidden",
    "color": "red|purple|blue",
    "amenities": ["amenity1", "amenity2"],
    "estimated_visit_time": 90,
    "detour_distance": 5,
    "effort_level": "easy|moderate|challenging",
    "accessibility": ["wheelchair", "stroller", "senior-friendly"],
    "best_for": ["activity1", "activity2"],
    "cost": "$|$$|$$$"
  }}
]

Important: Your response MUST be valid JSON and ONLY contain the JSON array.
"""
    
    logger.info(f"Generated prompt with {len(formatted_gems)} gems and user preferences")
    return prompt

def simple_rank_gems(gems, user_preferences):
    """Rank gems based on user preferences without using an LLM."""
    logger.info(f"Using simple ranking algorithm with {len(gems)} gems")
    
    if not gems:
        logger.warning("No gems to rank")
        return []
        
    # Ensure at least 10 gems are returned, or all available gems if fewer
    max_results = min(10, len(gems))

    ranked_gems = []
    
    # Get user preference data
    activities = set(user_preferences.get('activities', []))
    effort_level = user_preferences.get('effortLevel', 'moderate')
    accessibility_reqs = set(user_preferences.get('accessibility', []))
    
    for gem in gems:
        # Calculate a simple score for each gem
        score = 0
        
        # Score for matching activities
        gem_tags = set(gem.get('tags', []))
        matching_activities = activities.intersection(gem_tags)
        score += len(matching_activities) * 3  # Higher weight for activities
        
        # Score for rarity (prioritize more hidden gems)
        if gem.get('rarity') == 'most hidden':
            score += 5
        elif gem.get('rarity') == 'moderately hidden':
            score += 3
        
        # Score for accessibility
        gem_accessibility = set(gem.get('accessibility', []))
        if accessibility_reqs and gem_accessibility.intersection(accessibility_reqs):
            score += 2
        
        # Add to ranked list
        gem_copy = gem.copy()
        gem_copy['score'] = score
        ranked_gems.append(gem_copy)
    
    # Sort by score (descending)
    ranked_gems.sort(key=lambda x: x.get('score', 0), reverse=True)


    # Format the top 10 gems
    result = []
    for gem in ranked_gems[:10]:
        result.append({
            "name": gem.get("name", "Unnamed Location"),
            "coordinates": gem.get("coordinates", [0, 0]),
            "category": determine_category(gem),
            "description": gem.get("description", "A hidden Northern California gem"),
            "rarity": gem.get("rarity", "moderately hidden"),
            "color": get_color_for_rarity(gem.get("rarity")),
            "amenities": ["restrooms"] if "restrooms" in gem.get("tags", []) else [],
            "estimated_visit_time": gem.get("time", 120),
            "detour_distance": gem.get("detour_distance", 5),
            "effort_level": map_tags_to_effort(gem.get("tags", [])),
            "accessibility": gem.get("accessibility", []),
            "best_for": list(gem.get("tags", []))[:3],
            "cost": gem.get("activity_cost", "$")
        })
    
    return result

def determine_category(gem):
    """Determine the primary category of a gem."""
    if gem.get("natural"):
        return "nature"
    elif gem.get("amenity") == "restaurant" or gem.get("amenity") == "cafe":
        return "food"
    elif gem.get("historic"):
        return "historic"
    elif gem.get("leisure") == "garden" or gem.get("leisure") == "park":
        return "nature"
    else:
        return "scenic"

def get_color_for_rarity(rarity):
    """Map rarity to color."""
    if rarity == "most hidden":
        return "red"
    elif rarity == "moderately hidden":
        return "purple"
    else:
        return "blue"

def map_tags_to_effort(tags):
    """Map tags to effort level."""
    tags_set = set(tags)
    
    if "challenging" in tags_set or "mountain biking" in tags_set:
        return "challenging"
    elif "hiking" in tags_set or "walking" in tags_set:
        return "moderate"
    else:
        return "easy"

def build_prompt_for_small_model(user_preferences, available_gems):
    """Build a prompt optimized for smaller models like TinyLlama."""
    # Reduce number of gems to keep prompt size manageable
    selected_gems = available_gems[:15]  # Only use top 15 gems
    
    # Format gems in a more concise way
    gem_descriptions = []
    for i, gem in enumerate(selected_gems):
        gem_desc = f"""
Gem {i+1}:
- Name: {gem.get('name', 'Unnamed Location')}
- Type: {gem.get('natural', '') or gem.get('amenity', '') or gem.get('historic', '') or gem.get('leisure', '')}
- Tags: {', '.join(gem.get('tags', [])[:5])}
- Popularity: {gem.get('popularity_score', 50)} (lower is more hidden)
- Visit time: {gem.get('time', 120)} minutes
- Accessibility: {', '.join(gem.get('accessibility', []))}
"""
        gem_descriptions.append(gem_desc)
    
    activities = ', '.join(user_preferences.get('activities', ['Any']))
    accessibility = ', '.join(user_preferences.get('accessibility', ['None']))
    
    prompt = f"""
You are recommending the top 5 Northern California hidden gems based on user preferences.

User wants:
- Activities: {activities}
- Effort level: {user_preferences.get('effortLevel', 'Any')}
- Accessibility: {accessibility}
- Time available: {user_preferences.get('time', 'Any')}

Available gems:
{''.join(gem_descriptions)}

Please respond ONLY with valid JSON in this exact format:
[
    {{
    "name": "Hidden Gem Name",
    "coordinates": [longitude, latitude],
    "category": "nature|food|historic|leisure|scenic|...",
    "description": "A short synthetic user review. No more than 50 tokens.",
    "rarity": "most hidden|moderately hidden|least hidden",
    "color": "red|purple|blue",
    "amenities": ["amenity1", "amenity2"],
    "estimated_visit_time": 90,
    "detour_distance": 5,
    "effort_level": "easy|moderate|challenging",
    "accessibility": ["wheelchair", "stroller", "senior-friendly"],
    "best_for": ["activity1", "activity2"],
    "cost": "$|$$|$$$"
  }}
]

START_JSON
"""
    
    return prompt

def extract_json_from_small_model(raw_response):
    """Extract JSON from a small model's response which may be less reliable."""
    # Look for JSON array pattern
    try:
        # Try direct parsing first
        match = re.search(r'\[\s*{.*}\s*\]', raw_response, re.DOTALL)
        if match:
            return json.loads(match.group(0))
            
        # If that fails, try finding brackets
        start_idx = raw_response.find('[')
        end_idx = raw_response.rfind(']') + 1
        
        if start_idx >= 0 and end_idx > start_idx:
            json_string = raw_response[start_idx:end_idx]
            # Clean up common issues with small model outputs
            json_string = re.sub(r',\s*]', ']', json_string)  # Remove trailing commas
            json_string = re.sub(r',\s*}', '}', json_string)  # Remove trailing commas
            return json.loads(json_string)
            
        # If all else fails, try to construct a valid array
        gem_pattern = r'{[^}]+}'
        gem_matches = re.findall(gem_pattern, raw_response)
        
        if gem_matches:
            reconstructed = '[' + ','.join(gem_matches) + ']'
            return json.loads(reconstructed)
    except Exception as e:
        logger.error(f"JSON extraction error: {str(e)}")
    
    # If we couldn't parse JSON, return an empty list
    return []

@app.route("/generate_trip_gems", methods=["POST"])
def generate_gems():
    """Generate recommended hidden gems based on user preferences."""
    try:
        # Get user preferences from request
        user_preferences = request.get_json()
        logger.info(f"Received user preferences")
        
        # Load gems from database
        available_gems = load_gems_database()
        if not available_gems:
            return jsonify({"error": "No gems available in database"}), 500
            
        logger.info(f"Loaded {len(available_gems)} gems from database")
        
        # Filter gems by user preferences
        filtered_gems = filter_gems_by_preferences(available_gems, user_preferences)
        logger.info(f"Filtered to {len(filtered_gems)} gems based on preferences")
        
        if not filtered_gems:
            return jsonify({"error": "No matching gems found for your preferences"}), 404
        
        try:

            # Get user preferences from request
            user_preferences = request.get_json()
            logger.info(f"Received user preferences")

            # Check cache first
            cached_recommendations = get_cached_recommendations(user_preferences)
            if cached_recommendations:
                logger.info("Using cached recommendations")
                return jsonify(cached_recommendations)
        
            # Try using TinyLlama first
            prompt = build_prompt_for_small_model(user_preferences, filtered_gems)
            
            logger.info(f"Calling Ollama API with model: {OLLAMA_MODEL}")
            response = requests.post(
                OLLAMA_URL, 
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.2,  # Lower temperature for more deterministic output
                        "max_tokens": 2000,
                        "stop": ["```", "END_JSON"]  # Stop if the model tries to exit JSON format
                    }
                },
                timeout=30  # Shorter timeout for smaller model
            )
            
            if response.status_code != 200:
                raise Exception(f"Ollama API error: {response.status_code}")
            
            raw_response = response.json().get("response", "")
            recommended_gems = extract_json_from_small_model(raw_response)
            
            if not recommended_gems:
                # Fall back to our simple ranking if LLM output parsing failed
                logger.warning("Failed to parse LLM output, falling back to simple ranking")
                recommended_gems = simple_rank_gems(filtered_gems, user_preferences)
        except Exception as e:
            logger.warning(f"LLM generation failed: {str(e)}, falling back to simple ranking")
            # Fall back to simple ranking algorithm
            recommended_gems = simple_rank_gems(filtered_gems, user_preferences)
        
        # Validate and format the gems
        formatted_gems = validate_and_format_gems(recommended_gems)
        
        logger.info(f"Successfully generated {len(formatted_gems)} recommended gems")
        return jsonify(formatted_gems)
        
    except Exception as e:
        logger.exception(f"Error generating trip gems: {str(e)}")
        return jsonify({"error": "Failed to generate recommendations", "details": str(e)}), 500
    
@app.route("/test_gems_form", methods=["GET"])
def test_gems_form():
    """Simple HTML form for testing the API."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Hidden Gems API</title>
    </head>
    <body>
        <h1>Test Hidden Gems API</h1>
        <form id="gemsForm">
            <div>
                <label>Origin: <input type="text" id="origin" value="Berkeley, CA"></label>
            </div>
            <div>
                <label>Destination: <input type="text" id="destination" value="Napa, CA"></label>
            </div>
            <div>
                <label>Activities:
                    <select id="activities" multiple>
                        <option value="hiking" selected>Hiking</option>
                        <option value="food" selected>Food</option>
                        <option value="photography">Photography</option>
                        <option value="history">History</option>
                        <option value="scenic">Scenic</option>
                    </select>
                </label>
            </div>
            <div>
                <button type="button" onclick="submitForm()">Generate Recommendations</button>
            </div>
        </form>
        <pre id="results" style="margin-top: 20px; padding: 10px; background-color: #f0f0f0;"></pre>

        <script>
            function submitForm() {
                document.getElementById('results').textContent = 'Loading...';
                
                // Get selected activities
                const activitiesSelect = document.getElementById('activities');
                const selectedActivities = Array.from(activitiesSelect.selectedOptions).map(opt => opt.value);
                
                fetch('/generate_trip_gems', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        origin: document.getElementById('origin').value,
                        destination: document.getElementById('destination').value,
                        originCoords: [-122.2730, 37.8715],
                        destinationCoords: [-122.2864, 38.2975],
                        activities: selectedActivities,
                        amenities: ['restrooms'],
                        effortLevel: 'moderate',
                        accessibility: [],
                        time: 'half-day',
                        maxDetour: '15'
                    })
                })
                .then(response => response.json())
                .then(data => {
                    document.getElementById('results').textContent = JSON.stringify(data, null, 2);
                })
                .catch(error => {
                    document.getElementById('results').textContent = 'Error: ' + error;
                });
            }
        </script>
    </body>
    </html>
    """

def extract_json_from_llm_response(raw_response):
    """Extract valid JSON from a small model's response which may be less reliable."""
    logger.info(f"Attempting to extract JSON from response of length: {len(raw_response)}")
    
    # Try direct parsing first - the whole response might be valid JSON
    try:
        data = json.loads(raw_response)
        
        # Check if the JSON has a "gems" field (nested structure)
        if isinstance(data, dict) and "gems" in data and isinstance(data["gems"], list):
            logger.info(f"Found gems field with {len(data['gems'])} items")
            return data["gems"]
        
        # If it's already a list, return it
        if isinstance(data, list):
            return data
    except Exception as e:
        logger.error(f"Initial JSON parsing failed: {str(e)}")
    
    # Try to find JSON array in the response
    try:
        match = re.search(r'\[\s*{.*}\s*\]', raw_response, re.DOTALL)
        if match:
            json_string = match.group(0)
            return json.loads(json_string)
    except Exception as e:
        logger.error(f"JSON array extraction failed: {str(e)}")
    
    # Try to find a gems array in a larger JSON object
    try:
        match = re.search(r'"gems"\s*:\s*(\[\s*{.*}\s*\])', raw_response, re.DOTALL)
        if match:
            gems_json = match.group(1)
            return json.loads(gems_json)
    except Exception as e:
        logger.error(f"Gems array extraction failed: {str(e)}")
    
    try:
        # Look for brackets and try to clean up common issues
        start_idx = raw_response.find('[')
        end_idx = raw_response.rfind(']') + 1
        
        if start_idx >= 0 and end_idx > start_idx:
            json_string = raw_response[start_idx:end_idx]
            
            # Remove invalid control characters
            json_string = re.sub(r'[\x00-\x1F\x7F]', ' ', json_string)
            
            # Fix common JSON formatting errors
            json_string = re.sub(r',\s*]', ']', json_string)  # Remove trailing commas in arrays
            json_string = re.sub(r',\s*}', '}', json_string)  # Remove trailing commas in objects
            json_string = re.sub(r'}\s*{', '},{', json_string)  # Add commas between objects
            
            # Try loading the cleaned JSON
            return json.loads(json_string)
    except Exception as e:
        logger.error(f"Secondary JSON decode error: {str(e)}")
    
    try:
        # Last resort: try to find individual objects and build a valid array
        gem_pattern = r'{[^{}]*}'  # Simple pattern to match JSON objects
        gem_matches = re.findall(gem_pattern, raw_response)
        
        if gem_matches:
            # Attempt to fix each object
            valid_gems = []
            for gem_str in gem_matches:
                try:
                    # Clean up the object
                    gem_str = re.sub(r',\s*}', '}', gem_str)
                    gem_obj = json.loads(gem_str)
                    valid_gems.append(gem_str)
                except:
                    pass  # Skip invalid objects
            
            if valid_gems:
                reconstructed = '[' + ','.join(valid_gems) + ']'
                return json.loads(reconstructed)
    except Exception as e:
        logger.error(f"Tertiary JSON reconstruction error: {str(e)}")
        
    # If none of these approaches worked, try one more strategy:
    # Look for key-value pairs and construct objects manually
    try:
        name_pattern = r'"name"\s*:\s*"([^"]*)"'
        coordinates_pattern = r'"coordinates"\s*:\s*\[([-\d.]+),\s*([-\d.]+)\]'
        category_pattern = r'"category"\s*:\s*"([^"]*)"'
        description_pattern = r'"description"\s*:\s*"([^"]*)"'
        rarity_pattern = r'"rarity"\s*:\s*"([^"]*)"'
        color_pattern = r'"color"\s*:\s*"([^"]*)"'
        
        names = re.findall(name_pattern, raw_response)
        coordinates_matches = re.findall(coordinates_pattern, raw_response)
        categories = re.findall(category_pattern, raw_response)
        descriptions = re.findall(description_pattern, raw_response)
        rarities = re.findall(rarity_pattern, raw_response)
        colors = re.findall(color_pattern, raw_response)
        
        # If we have names (which is the minimum requirement)
        if names:
            manual_gems = []
            for i in range(min(5, len(names))):
                gem = {"name": names[i]}
                
                # Add other properties if available
                if i < len(coordinates_matches):
                    try:
                        lon, lat = coordinates_matches[i]
                        gem["coordinates"] = [float(lon), float(lat)]
                    except:
                        gem["coordinates"] = [0, 0]
                
                if i < len(categories):
                    gem["category"] = categories[i]
                else:
                    gem["category"] = "nature"
                
                if i < len(descriptions):
                    gem["description"] = descriptions[i]
                else:
                    gem["description"] = f"A hidden gem near {names[i]}"
                
                if i < len(rarities):
                    gem["rarity"] = rarities[i]
                else:
                    gem["rarity"] = "moderately hidden"
                
                if i < len(colors):
                    gem["color"] = colors[i]
                else:
                    gem["color"] = "purple"
                
                manual_gems.append(gem)
            
            if manual_gems:
                logger.info(f"Successfully manually constructed {len(manual_gems)} gems")
                return manual_gems
    except Exception as e:
        logger.error(f"Final manual reconstruction error: {str(e)}")
    
    # If we couldn't parse JSON, return an empty list
    logger.warning("Could not extract valid JSON from LLM response")
    return []

def validate_and_format_gems(gems):
    """Validate and format the recommended gems."""
    if not gems:
        logger.warning("No gems to validate")
        return []
        
    valid_gems = []
    
    logger.info(f"Validating {len(gems)} gems")
    
    required_fields = ["name", "category", "rarity"]  # Remove coordinates from required fields
    
    for i, gem in enumerate(gems):
        # Log each gem for debugging
        logger.info(f"Validating gem {i+1}: {gem}")
        
        # Check required fields
        missing_fields = [field for field in required_fields if field not in gem]
        
        if missing_fields:
            logger.warning(f"Gem {i+1} is missing required fields: {missing_fields}")
            continue
            
        # Handle both "coordinate" and "coordinates" fields
        coordinates = None
        if "coordinates" in gem and isinstance(gem["coordinates"], list) and len(gem["coordinates"]) == 2:
            coordinates = gem["coordinates"]
        elif "coordinate" in gem and isinstance(gem["coordinate"], list) and len(gem["coordinate"]) == 2:
            coordinates = gem["coordinate"]
            # Fix the field name for consistency
            gem["coordinates"] = coordinates
            del gem["coordinate"]
        else:
            logger.warning(f"Gem {i+1} has invalid or missing coordinates")
            # Provide default coordinates for Berkeley area
            gem["coordinates"] = [-122.2730, 37.8715]
            coordinates = gem["coordinates"]
            
        # Add any missing fields with defaults
        if "color" not in gem:
            # Map rarity to color
            rarity_color_map = {
                "most hidden": "red",
                "moderately hidden": "purple",
                "least hidden": "blue"
            }
            gem["color"] = rarity_color_map.get(gem["rarity"], "blue")
            
        if "description" not in gem:
            gem["description"] = f"A hidden gem in Northern California: {gem['name']}"
        
        valid_gems.append(gem)
    
    logger.info(f"Validated {len(valid_gems)} gems as valid")
    return valid_gems

@app.route('/save_recommended_gems', methods=["POST"])
def save_recommended_gems():
    """Save recommended gems to a file."""
    try:
        gems = request.get_json()
        with open('recommended_gems.json', 'w') as f:
            json.dump(gems, f, indent=2)
        return jsonify({"status": "success", "message": "Gems saved successfully"})
    except Exception as e:
        logger.exception(f"Error saving recommended gems: {str(e)}")
        return jsonify({"error": "Failed to save gems", "details": str(e)}), 500

@app.route('/status', methods=["GET"])
def check_status():
    """Check the API status and gem database."""
    try:
        gems = load_gems_database()
        return jsonify({
            "status": "online",
            "gems_count": len(gems),
            "model": OLLAMA_MODEL
        })
    except Exception as e:
        logger.exception(f"Error checking status: {str(e)}")
        return jsonify({"status": "error", "details": str(e)}), 500

@app.route('/')
def home():
    """Homepage with basic API information."""
    return jsonify({
        "api": "Northern California Hidden Gems API",
        "endpoints": [
            {"path": "/generate_trip_gems", "method": "POST", "description": "Generate hidden gems based on user preferences"},
            {"path": "/save_recommended_gems", "method": "POST", "description": "Save recommended gems to a file"},
            {"path": "/status", "method": "GET", "description": "Check API status"}
        ],
        "version": "1.0.0"
    })

if __name__ == "__main__":
    # Check if gems database exists
    if not os.path.exists(GEMS_DATABASE):
        logger.warning(f"Gems database file '{GEMS_DATABASE}' not found! Create it before running.")
    
    app.run(debug=True, port=5000)