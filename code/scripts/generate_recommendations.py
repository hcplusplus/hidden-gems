from flask import Flask, request, jsonify
from flask_cors import CORS
import json, os, random, re, requests, time

app = Flask(__name__)
CORS(app)

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "gemma3:1b"

# Determine the root directory based on where the script is run from
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, os.pardir))  # Parent directory of the script

# Adjust paths based on where the script is run from
GEMS_PATH = os.path.join(ROOT_DIR, "static/assets/data/hidden_gems.json")
RECOMMENDATIONS_DIR = os.path.join(ROOT_DIR, "static/assets/data/recommendations")
RESPONSE_TIMES_PATH = os.path.join(ROOT_DIR, "static/assets/data/response_times.json")

# Function to track response times
def track_response_time(duration, model=OLLAMA_MODEL):
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(RESPONSE_TIMES_PATH), exist_ok=True)
        
        # Load existing times or create new
        try:
            with open(RESPONSE_TIMES_PATH, "r") as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            data = {"times": [], "average": 0}
        
        # Add new time
        data["times"].append(duration)
        
        # Keep only the last 20 times
        if len(data["times"]) > 20:
            data["times"] = data["times"][-20:]
        
        # Update average
        data["average"] = sum(data["times"]) / len(data["times"])
        
        # Save updated data
        with open(RESPONSE_TIMES_PATH, "w") as f:
            json.dump(data, f, indent=2)
            
        return data["average"]
    except Exception as e:
        print(f"Error tracking response time: {e}")
        return None

def build_recommendation_prompt(user_data):
    def fmt(field):
        return ", ".join(user_data.get(field, [])) or "None"
    candidate_gems = user_data.get("candidates", [])

   
    gem_sample = random.sample(candidate_gems, min(20, len(candidate_gems)))
    
    # Create detailed context for each gem WITHOUT numbering
    context = "\n".join([
        f"{g['name']} | {g['description']} | {g['category_1']} |{g['category_2']} | {g.get('rarity', 'unknown')}" 
        for g in gem_sample
    ])
    
    return f"""
You are a trip planning expert. Select 5 hidden gems from the list below that best match the user's travel preferences.
User preferences:
- From: {user_data.get('origin')}
- To: {user_data.get('destination')}
- Activities: {fmt('activities')}
- Amenities: {fmt('amenities')}
- Effort Level: {user_data.get('effortLevel', 'any')}
- Accessibility: {fmt('accessibility')}
- Time Available: {user_data.get('time')}

Hidden gem candidates:
{gem_sample}

Return only a JSON array with these fields for each recommended gem:
[
  {{
    "id": "same as candidate gem id",
    "name": "same as candidate gem name",
    "coordinates": [longitude, latitude],
    "category": "type of place",
    "description": "1-sentence description",
    "rarity": "most hidden | moderately hidden | least hidden",
    "color": "red | purple | blue", 
    "time": number of minutes it takes for the detour,
    "dollar_sign": "price level ($, $$, $$$)"
  }}
]

Return ONLY the JSON array and nothing else - no explanation needed.
"""

def build_review_prompt(gem):
    return f"""
You're a helpful assistant generating a realistic review for a hidden gem based on the following information:

Gem details:
- Name: {gem['name']}
- Description: {gem['description']}
- Category: {gem['category_1']}, {gem['category_2']}
- Rarity: {gem.get('rarity', 'unknown')}
- Price level: {gem.get('dollar_sign', '$')}
- Time needed to visit: {gem.get('time', 0)} minutes
- Type of place: {gem.get('category', 'place')}


Generate 1 short review (1-2 sentences) from a visitor.
Return only the review as a plain string.
"""

def call_ollama(prompt, stream=False):
    try:
        start_time = time.time()
        res = requests.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": stream,
            "options": {
                "temperature": 0.7,
                "max_tokens": 1024
            }
        })

        # Calculate response time
        duration = time.time() - start_time
        avg_time = track_response_time(duration)
        print(f"📊 LLM response time: {duration:.2f}s (Avg: {avg_time:.2f}s)")
        raw = res.json().get("response", "")
        return raw
    except Exception as e:
        return str(e)
    
def get_recommendations_filename(origin, destination):
    """Create a sanitized filename from origin and destination"""
    # Remove special characters and replace spaces with underscores
    origin = re.sub(r'[^\w\s]', '', origin).strip().replace(' ', '_').lower()
    destination = re.sub(r'[^\w\s]', '', destination).strip().replace(' ', '_').lower()
    return f"recommendations_{origin}_to_{destination}.json"
    
def list_saved_recommendations():
    """List all saved recommendation files"""
    try:
        files = os.listdir(RECOMMENDATIONS_DIR)
        # Filter to only include recommendation JSON files
        recommendation_files = [f for f in files if f.startswith("recommendations_") and f.endswith(".json")]
        
        # Extract metadata for each file
        recommendations = []
        for filename in recommendation_files:
            try:
                # Parse origin and destination from filename
                match = re.match(r'recommendations_(.+)_to_(.+)\.json', filename)
                if match:
                    origin = match.group(1).replace('_', ' ').title()
                    destination = match.group(2).replace('_', ' ').title()
                    
                    # Get file creation/modification time
                    filepath = os.path.join(RECOMMENDATIONS_DIR, filename)
                    timestamp = os.path.getmtime(filepath)
                    
                    # Read the file to get recommendation count
                    with open(filepath, 'r') as f:
                        data = json.load(f)
                        count = len(data) if isinstance(data, list) else 0
                    
                    recommendations.append({
                        "filename": filename,
                        "origin": origin,
                        "destination": destination,
                        "timestamp": timestamp,
                        "date": time.strftime("%Y-%m-%d", time.localtime(timestamp)),
                        "count": count
                    })
            except Exception as e:
                print(f"Error processing file {filename}: {e}")
                
        # Sort by most recent first
        recommendations.sort(key=lambda x: x["timestamp"], reverse=True)
        return recommendations
        
    except Exception as e:
        print(f"Error listing recommendations: {e}")
        return []

@app.route("/generate_recommendations", methods=["POST"])
def generate_recommendations():
    start_time = time.time()
    user_data = request.get_json()
    origin = user_data.get('origin', 'unknown')
    destination = user_data.get('destination', 'unknown')
   
    # Generate filename based on origin and destination
    filename = get_recommendations_filename(origin, destination)
    filepath = os.path.join(RECOMMENDATIONS_DIR, filename)
   
    prompt = build_recommendation_prompt(user_data)
    print("📤 Prompt to LLM:\n", prompt)
    
    # Get raw response from LLM
    response = call_ollama(prompt)
    print("📥 Raw LLM response:\n", response)
    
    # Extract JSON array of indices using regex
    match = re.search(r'\[.*\]', response, re.DOTALL)
    if not match:
        return jsonify({"error": "LLM did not return valid JSON indices", "raw": response}), 500

    try:
        selected = json.loads(match.group(0))
    except Exception as e:
        return jsonify({"error": "JSON parse failed", "details": str(e), "raw": response}), 500

    with open(filepath, "w") as f:
        json.dump(selected, f, indent=2)
        
        # Calculate total duration
        total_duration = time.time() - start_time
        print(f"⏱️ Total API request processing time: {total_duration:.2f}s")
        
        return jsonify({
            "recommendations": selected,
            "meta": {
                "processingTime": total_duration,
                "filename": filename,
                "filepath": filepath
            }
        })
        

@app.route("/generate_review", methods=["POST"])
def generate_review():
    gem = request.get_json()
    prompt = build_review_prompt(gem)
    print("✍️ Review prompt:\n", prompt)
    response = call_ollama(prompt)
    return jsonify({"review": response.strip()})

@app.route("/api/response_time", methods=["GET"])
def get_response_time():
    try:
        with open(RESPONSE_TIMES_PATH, "r") as f:
            data = json.load(f)
        return jsonify(data)
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify({"average": 8, "times": []})
    
@app.route("/api/saved_recommendations", methods=["GET"])
def get_saved_recommendations():
    """Endpoint to list all saved recommendations"""
    recommendations = list_saved_recommendations()
    return jsonify(recommendations)

@app.route("/api/recommendation/<path:filename>", methods=["GET"])
def get_recommendation_by_filename(filename):
    """Retrieve a specific recommendation by filename"""
    try:
        filepath = os.path.join(RECOMMENDATIONS_DIR, filename)
        print(filepath)
        if not os.path.exists(filepath):
            return jsonify({"error": "Recommendation not found"}), 404
            
        with open(filepath, "r") as f:
            data = json.load(f)
        
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)