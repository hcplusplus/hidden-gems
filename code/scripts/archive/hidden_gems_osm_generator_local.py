from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import re

app = Flask(__name__)
CORS(app)  # Allow CORS from frontend

OLLAMA_URL = "http://127.0.0.1:11434/api/trip_generator"
OLLAMA_MODEL = "mistral:7b"



def build_prompt(data):
    def fmt(field):
        return ", ".join(data.get(field, [])) or "None"

    return f"""
You are a local travel expert. Of the following gems, recommend 5 based on the following user preferences.

Gems: {data.get('gems', [])}

User Preferences:
- Activities: {data.get('activities')}
- Essential Amenities: {data.get('amenities')}
- Effort Level: {data.get('effortLevel', 'Any')}
- Accessibility Needs: {data.get('accessibility')}
- Time Available: {data.get('time', 'Any')}
- Max Detour: {data.get('maxDetour', 'Any')} miles

Each gem must include a 'rarity' field that indicates how hidden the gem is:
- "most hidden": very few people know about it
- "moderately hidden": locals know it but it's not touristy
- "least hidden": known by many but still underrated

Map each rarity level to a color:
- "most hidden" → red
- "moderately hidden" → purple
- "least hidden" → blue

Return the output in this exact JSON format:
[
  {{
    "name": "Hidden Gem Name",
    "coordinates": [LATITUDE, LONGITUDE],
    "category": "nature|food|scenic|historic|...",
    "description": "Why this place is special in one sentence",
    "rarity": "most hidden|moderately hidden|least hidden",
    "color": "red|blue|purple",
    "review": "User review of the place in one sentence",
    "time": "The total time it would to complete a preferred activity at the gem, in number of minutes only"
  }}
]
"""

@app.route("/query_osm", methods=["POST"])
def sample_points():
    data = request.get_json()
    print("🔍 Data received from frontend:\n", data)
    prompt = build_prompt(data)
    print("🔍 Prompt sent to LLM:\n", prompt)

    raw = ""  
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "max_tokens": 5000
            }
        })

        print("📡 Response status code:", response.status_code)
        print("📄 Raw response:", response.text[:500])

        raw = response.json().get("response", "")
        # Try to extract only the JSON part
        match = re.search(r'\[\s*{.*?}\s*\]', raw, re.DOTALL)
        if not match:
            print("❌ No valid JSON array found in LLM response.")
            return jsonify({"error": "No valid JSON found", "raw": raw}), 500

        json_string = match.group(0)
        gems = json.loads(json_string)

        return jsonify(gems)  

    except Exception as e:
        print("❌ Error during LLM generation:", e)
        return jsonify({"error": "LLM failed", "raw": raw}), 500

    
@app.route("/generate_trip_gems", methods=["POST"])
def generate_gems():
    data = request.get_json()
    prompt = build_prompt(data)
    print("🔍 Prompt sent to LLM:\n", prompt)

    raw = ""  
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "max_tokens": 5000
            }
        })

        print("📡 Response status code:", response.status_code)
        print("📄 Raw response:", response.text[:500])

        raw = response.json().get("response", "")
        # Try to extract only the JSON part
        match = re.search(r'\[\s*{.*?}\s*\]', raw, re.DOTALL)
        if not match:
            print("❌ No valid JSON array found in LLM response.")
            return jsonify({"error": "No valid JSON found", "raw": raw}), 500

        json_string = match.group(0)
        gems = json.loads(json_string)

        return jsonify(gems)  

    except Exception as e:
        print("❌ Error during LLM generation:", e)
        return jsonify({"error": "LLM failed", "raw": raw}), 500
    
@app.route('/save_data')
def save_data():
    response = generate_gems()
    json_data = response.get_json()

    with open('data.json', 'w') as f:
        json.dump(json_data, f, indent=4)
    return "Data saved to data.json"

if __name__ == "__main__":
    app.run(debug=True, port=5000)
