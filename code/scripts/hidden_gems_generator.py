from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_URL = "http://127.0.0.1:11434"
OLLAMA_MODEL = "mistral:7b"

def build_prompt(data):
    return f"""
You are a local travel expert. Recommend 5 hidden gems based on the following user preferences.

Trip Route:
- From: {data['origin']}
- To: {data['destination']}

Preferences:
- Activities: {', '.join(data['activities'])}
- Essential Amenities: {', '.join(data['amenities'])}
- Effort Level: {data['effortLevel']}
- Accessibility Needs: {', '.join(data['accessibility'])}
- Time Available: {data['time']}
- Max Detour: {data['maxDetour']} miles

Return the output in this exact JSON format:
[
  {{
    "name": "Hidden Gem Name",
    "coordinates": [LATITUDE, LONGITUDE],
    "category": "nature|food|scenic|historic|...",
    "description": "Why this place is special",
    "color": "red|blue|purple"
  }},
  ...more items
]
"""

@app.route("/generate_gems", methods=["POST"])
def generate_gems():
    data = request.get_json()
    prompt = build_prompt(data)
    print("🔍 Prompt sent to LLM:\n", prompt)

    try:
        response = requests.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False
        })

        print("Response status code:", response.status_code)
        print("Raw response:", response.text[:500])  # limit to 500 chars

        raw = response.json().get("response", "")
        gems = json.loads(raw.strip()) if raw.strip().startswith("[") else eval(raw.strip())
        return jsonify(gems)

    except Exception as e:
        print("Error during LLM generation:", e)
        return jsonify({"error": "LLM failed", "raw": raw}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)