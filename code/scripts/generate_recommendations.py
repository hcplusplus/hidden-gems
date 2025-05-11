from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import random
import re
import os
import requests

app = Flask(__name__)
CORS(app)

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "gemma3:1b"



GEMS_PATH = "code/gems.json"
RECOMMENDATIONS_PATH = "code/recommendations.json"

def build_recommendation_prompt(user_data, all_gems):
    def fmt(field):
        return ", ".join(user_data.get(field, [])) or "None"
    
    gem_sample = random.sample(all_gems, min(15, len(all_gems)))
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
- Max Detour: {user_data.get('maxDetour')} miles

Hidden gem candidates:
{context}

Return only a JSON array with these fields for each selected gem:
[
  {{
    "id": "same as input",
    "name": "gem name",
    "coordinates": [longitude, latitude],
    "category_1": category_1,
    "category_2": category_2,
    "description": "1-sentence description",
    "rarity": "most hidden | moderately hidden | least hidden",
    "color": "red | purple | blue",
    "time": number of minutes it takes for the detour,
    "time_spent": number of minutes spent at the gem,
    "dolar_sign": "price level ($, $$, $$$)",
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
        res = requests.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": stream,
            "options": {
                "temperature": 0.7,
                "max_tokens": 1024
            }
        })
        raw = res.json().get("response", "")
        return raw
    except Exception as e:
        return str(e)

@app.route("/generate_recommendations", methods=["POST"])
def generate_recommendations():
    user_data = request.get_json()
    with open(GEMS_PATH, "r") as f:
        all_gems = json.load(f)
    
    prompt = build_recommendation_prompt(user_data, all_gems)
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
    
    return jsonify(selected)

@app.route("/generate_review", methods=["POST"])
def generate_review():
    gem = request.get_json()
    prompt = build_review_prompt(gem)
    print("✍️ Review prompt:\n", prompt)
    response = call_ollama(prompt)
    return jsonify({"review": response.strip()})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
