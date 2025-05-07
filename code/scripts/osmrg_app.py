from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import re
import logging
import sys

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
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"  # Updated to standard Ollama endpoint
OLLAMA_MODEL = "mistral:7b"
MAX_GEMS_RETURN = 10

def map_time_to_minutes(time_preference):
    """Convert time preference to approximate minutes."""
    time_mapping = {
        "quick": 60,       # < 1 hour
        "short": 120,      # 1-2 hours
        "half-day": 240,   # 2-4 hours
        "full-day": 480    # 4+ hours
    }
    return time_mapping.get(time_preference, 240)  # Default to half-day if unknown

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
        "time": gem.get("time", 120)  # Estimated time in minutes
    }
    return formatted_gem

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
    "description": "A compelling one-sentence description of why this place is special",
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

@app.route("/generate_trip_gems", methods=["POST"])
def generate_gems():
    """Generate recommended hidden gems based on user preferences."""
    try:
        # Get user preferences from request
        user_preferences = request.get_json()
        logger.info(f"Received user preferences: {json.dumps(user_preferences, indent=2)}")
        
        # In a real implementation, you'd load gems from a database or file
        # For now, we'll simulate loading gems
        available_gems = load_available_gems()
        
        # Build the prompt
        prompt = build_prompt(user_preferences, available_gems)
        logger.debug(f"Generated prompt: {prompt}")
        
        # Call the Ollama API
        logger.info(f"Calling Ollama API with model: {OLLAMA_MODEL}")
        response = requests.post(
            OLLAMA_URL, 
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "max_tokens": 4000,
                    "top_p": 0.9,
                    "stop": ["```"]  # Stop if the model tries to exit JSON format
                }
            },
            timeout=60  # Increase timeout for complex queries
        )
        
        if response.status_code != 200:
            logger.error(f"Ollama API error: {response.status_code} - {response.text}")
            return jsonify({"error": "LLM service unavailable", "details": response.text}), 503
        
        # Extract the JSON from the response
        raw_response = response.json().get("response", "")
        logger.debug(f"Raw LLM response: {raw_response[:500]}...")
        
        # Parse the JSON from the response
        recommended_gems = extract_json_from_llm_response(raw_response)
        
        # Validate and format the gems
        formatted_gems = validate_and_format_gems(recommended_gems)
        
        logger.info(f"Successfully generated {len(formatted_gems)} recommended gems")
        return jsonify(formatted_gems)
        
    except Exception as e:
        logger.exception(f"Error generating trip gems: {str(e)}")
        return jsonify({"error": "Failed to generate recommendations", "details": str(e)}), 500

def load_available_gems():
    """Load available gems from a data source."""
    # In a real implementation, this would load from a database or file
    # For this example, we'll return a placeholder list
    try:
        with open('gems_database_test.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning("Gems database file not found, using sample data")
        # Return a small sample of mock data if file doesn't exist
        return [
            {
                "name": "Tigerlily Berkeley",
                "coordinates": [-122.269, 37.8797331],
                "address": {"street": "Shattuck Avenue", "postcode": "94709"},
                "opening_hours": "Sa,Su 11:00-14:00, Mo-Su 17:00-18:30",
                "activity_cost": "$$",
                "amenity": "restaurant",
                "popularity_score": 20.0,
                "rarity": "moderately hidden",
                "color": "blue",
                "time": 210
            },
            # Add more sample gems here
        ]

def extract_json_from_llm_response(raw_response):
    """Extract valid JSON from LLM response."""
    # First, look for an array pattern
    json_pattern = r'\[\s*{.*}\s*\]'
    match = re.search(json_pattern, raw_response, re.DOTALL)
    
    if match:
        json_string = match.group(0)
        try:
            return json.loads(json_string)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            
    # If no match or JSON decode error, try to find the closest JSON-like structure
    try:
        # Look for opening and closing brackets
        start_idx = raw_response.find('[')
        end_idx = raw_response.rfind(']') + 1
        
        if start_idx >= 0 and end_idx > start_idx:
            json_string = raw_response[start_idx:end_idx]
            return json.loads(json_string)
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Secondary JSON decode error: {str(e)}")
    
    # If all else fails, return an empty list
    logger.warning("Could not extract valid JSON from LLM response")
    return []

def validate_and_format_gems(gems):
    """Validate and format the recommended gems."""
    valid_gems = []
    required_fields = ["name", "coordinates", "category", "rarity"]
    
    for gem in gems:
        # Check required fields
        if all(field in gem for field in required_fields):
            # Ensure coordinates are valid
            if isinstance(gem["coordinates"], list) and len(gem["coordinates"]) == 2:
                # Add any missing fields with defaults
                if "color" not in gem:
                    # Map rarity to color
                    rarity_color_map = {
                        "most hidden": "red",
                        "moderately hidden": "purple",
                        "least hidden": "blue"
                    }
                    gem["color"] = rarity_color_map.get(gem["rarity"], "blue")
                
                valid_gems.append(gem)
    
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

if __name__ == "__main__":
    app.run(debug=True, port=5000)