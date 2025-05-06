from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import os

app = Flask(__name__)
CORS(app)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") 

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

Return the output in this exact JSON format:
[
  {{
    "name": "Hidden Gem Name",
    "coordinates": [LATITUDE, LONGITUDE],
    "category": "nature|food|scenic|historic|...",
    "description": "Why this place is special",
    "color": "red|blue|purple",
    "review": "User review or feedback about the gem",
    "time": "The total time it takes to go from the origin to the destination with the gem added in route"
  }}
]
"""


@app.route("/generate_gems", methods=["POST"])
def generate_gems():
    data = request.get_json()
    prompt = build_prompt(data)
    print("🔍 Prompt:\n", prompt)

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": "You are a travel assistant that returns hidden gems in JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7
            },
            timeout=10
        )

        response.raise_for_status()
        raw = response.json()["choices"][0]["message"]["content"]

        # Extract valid JSON
        json_start = raw.find("[")
        json_end = raw.rfind("]") + 1
        json_block = raw[json_start:json_end]
        gems = json.loads(json_block)

        return jsonify(gems)

    except Exception as e:
        print("❌ Error calling OpenAI:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)