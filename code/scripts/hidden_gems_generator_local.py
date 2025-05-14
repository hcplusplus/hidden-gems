from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import re

app = Flask(__name__)
CORS(app)  # Allow CORS from frontend

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
# OLLAMA_MODEL = "mistral:7b"
OLLAMA_MODEL = "gemma3:4b"

def build_prompt(data):
    def fmt(field):
        return ", ".join(data.get(field, [])) or "None"

    return f"""
You are a local travel expert. Recommend 5 hidden gems (underrated places) that are not well known but worth exploring based on the following user preferences.

Trip Route:
- From: {data.get('origin', 'Unknown')}
- To: {data.get('destination', 'Unknown')}

Preferences:
- Activities: {fmt('activities')}
- Essential Amenities: {fmt('amenities')}
- Effort Level: {data.get('effortLevel', 'Any')}
- Accessibility Needs: {fmt('accessibility')}
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
    "address": "Street Address, City, State, Zip",
    "opening_hours": "Opening hours in HH:MM format",
    "dolar_sign": "Dollar sign indicating price level ($, $$, $$$)",
    "category": "nature, food, scenic, historic, etc...",
    "dollar_sign": "Dollar sign indicating price level ($, $$, $$$)",
    "category_1": "nature|food|scenic|historic|...",
    "category_2": "nature|food|scenic|historic|...",
    "description": "Why this place is special in one sentence",
    "rarity": "most hidden|moderately hidden|least hidden",
    "color": "red|blue|purple",
    "review": "User review of the place in one sentence",
    "time": "The total time it takes to go from the origin to the destination with the gem added in route, in number of minutes only"
  
  }}
]
"""

    
@app.route("/generate_gems", methods=["POST"])
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

if __name__ == "__main__":
    app.run(debug=True, port=5000)