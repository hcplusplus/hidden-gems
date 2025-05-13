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
RECOMMENDATIONS_PATH = os.path.join(ROOT_DIR, "static/assets/data/recommendations.json")
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
    
    gem_sample = user_data.get("candidates", [])



    #context = "\n".join([
    #    f"{g['name']} | {g['description']} | {g['category_1']} |{g['category_2']} | {g.get('rarity', 'unknown')}" 
    #    for g in gem_sample
    #])

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
{user_data.get('candidates', [])}

Return only a JSON array with these fields for each selected gem:
[
  {{
    "id": "same as input",
    "name": "same as input",
    "coordinates": "same as input",
    "category_1": "same as input",
    "category_2": "same as input",
    "description": "same as input",
    "rarity": "same as input",
    "color": "same as input",
    "time": "same as input",
    "dollar_sign": "same as input",
  }}
]
"""

def build_review_prompt(gem):
    return f"""
You're a helpful assistant generating a realistic review for a hidden gem based on the following information:

Gem:
- Name: {gem['name']}
- Description: {gem['description']}
- Category: {gem['category_1']}, {gem['category_2']}
- Rarity: {gem.get('rarity', 'unknown')}

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

@app.route("/generate_recommendations", methods=["POST"])
def generate_recommendations():
    start_time = time.time()
    user_data = request.get_json()

    #with open(GEMS_PATH, "r") as f:
    #    all_gems = json.load(f)
    
    prompt = build_recommendation_prompt(user_data)
    print("📤 Prompt to LLM:\n", prompt)

    response = call_ollama(prompt)
    match = re.search(r'\[.*\]', response, re.DOTALL)
    if not match:
        return jsonify({"error": "LLM did not return valid JSON", "raw": response}), 500

    try:
        selected = json.loads(match.group(0))
    except Exception as e:
        return jsonify({"error": "JSON parse failed", "details": str(e), "raw": response}), 500

    with open(RECOMMENDATIONS_PATH, "w") as f:
        json.dump(selected, f, indent=2)
    
    # Calculate total duration
    total_duration = time.time() - start_time
    print(f"⏱️ Total API request processing time: {total_duration:.2f}s")
    
    return jsonify({
        "recommendations": selected,
        "meta": {
            "processingTime": total_duration
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

if __name__ == "__main__":
    app.run(debug=True, port=5000)