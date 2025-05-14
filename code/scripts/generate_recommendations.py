from flask import Flask, request, jsonify
from flask_cors import CORS
import json, os, random, re, requests, time

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": "*"}})

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
    
def filter_gems_by_preferences(gems, user_data):
    """
    Filter and rank gems based on user preferences for use in the fallback scenario
    """
    scored_gems = []
    
    # Extract user preferences
    effort_level = user_data.get('effortLevel', 'moderate')
    accessibility = user_data.get('accessibility', [])
    time_preference = user_data.get('time', 'short')
    activities = user_data.get('activities', [])
    
    # Map time preference to minutes
    time_mapping = {
        'quick': 30,
        'short': 60,
        'half-day': 180,
        'full-day': 240
    }
    preferred_time = time_mapping.get(time_preference, 60)
    
    # Process each gem
    for gem in gems:
        score = 0
        
        # Score based on time - prefer gems that fit within the user's time budget
        gem_time = gem.get('time', 60)
        if gem_time <= preferred_time:
            score += 10
        else:
            # Penalize for being over time budget
            time_diff = gem_time - preferred_time
            score -= min(5, time_diff / 30)  # Penalty capped at 5 points
        
        # Score based on effort level
        if effort_level == 'easy' and gem.get('category_1') == 'Recreation':
            score += 5
        
        # Score based on accessibility
        if 'wheelchair' in accessibility and gem.get('category_2') in ['Peaceful retreat', 'Scenic viewpoint']:
            score += 5
        
        # Score based on distanceFromRoute - prefer gems closer to route
        distance = gem.get('distanceFromRoute', 0)
        if distance < 5:
            score += 5
        elif distance < 10:
            score += 3
        elif distance < 20:
            score += 1
        
        # Reward variety in categories
        if gem.get('category_1') == 'Food & Drink':
            score += 3  # Everyone likes food stops
        
        # Keep the original gem data but add the score
        gem_with_score = gem.copy()
        gem_with_score['fallback_score'] = score
        scored_gems.append(gem_with_score)
    
    # Sort by score descending
    sorted_gems = sorted(scored_gems, key=lambda x: x.get('fallback_score', 0), reverse=True)
    
    # Remove the temporary score field before returning
    for gem in sorted_gems:
        if 'fallback_score' in gem:
            del gem['fallback_score']
    
    return sorted_gems

def build_recommendation_prompt(user_data):
    def fmt(field):
        return ", ".join(user_data.get(field, [])) or "None"
    candidate_gems = user_data.get("candidates", [])
   
    gem_sample = random.sample(candidate_gems, min(20, len(candidate_gems)))

    user_data['gem_sample'] = gem_sample  # Store the sample for later use
    
    # Create detailed context for each gem WITH indexing
    context = "\n".join([
        f"{i}. {g['name']} | {g['coordinates']} | {g['description']} | {g['category_1']} |{g['category_2']} | {g.get('rarity', 'unknown')}" 
        for i, g in enumerate(gem_sample)
    ])
    
    return f"""
You are a trip planning expert. Select 5 unique hidden gems from the list below that best match the user's travel preferences.
The gems should be evenly distributed coordinates. 

User preferences:
- From: {user_data.get('origin')}
- To: {user_data.get('destination')}
- Activities: {fmt('activities')}
- Amenities: {fmt('amenities')}
- Effort Level: {user_data.get('effortLevel', 'any')}
- Accessibility: {fmt('accessibility')}
- Time Available: {user_data.get('time')}
Hidden gem candidates:
{context}
Return ONLY the 0-based indices of 5 recommended gems as a JSON array of 5 unique integers.
Example: [5, 0, 14, 9, 3]
Do not include any explanations or additional text. Do not return the example array.
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

def call_ollama(prompt, stream=False, timeout=180):
    """Call Ollama with a timeout"""
    try:
        start_time = time.time()
        print(f"Sending request to Ollama (timeout: {timeout}s)")
        res = requests.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": stream,
            "options": {
                "temperature": 0.7,
                "max_tokens": 1024
            }
        }, timeout=timeout)  # Add timeout parameter

        # Calculate response time
        duration = time.time() - start_time
        avg_time = track_response_time(duration)
        print(f"📊 LLM response time: {duration:.2f}s (Avg: {avg_time:.2f}s)")
        
        if res.status_code != 200:
            print(f"⚠️ Ollama returned status code {res.status_code}")
            return None
            
        raw = res.json().get("response", "")
        return raw
    except requests.exceptions.Timeout:
        print("⚠️ Ollama request timed out")
        return None
    except Exception as e:
        print(f"⚠️ Error in call_ollama: {str(e)}")
        return None
    
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
    
@app.route("/", methods=["GET", "OPTIONS"])
def root():
    return jsonify({
        "status": "ok",
        "message": "API server is running",
        "timestamp": time.time()
    })

@app.route("/generate_recommendations", methods=["POST"])
def generate_recommendations():
    start_time = time.time()
    print("Received recommendation request")
    
    # Check if request is from mobile
    user_agent = request.headers.get('User-Agent', '').lower()
    is_mobile = 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent or 'ipad' in user_agent
    force_fallback = request.args.get('fallback', 'false').lower() == 'true'
    
    # Use fallback for mobile or when explicitly requested
    use_fallback = is_mobile or force_fallback
    
    if use_fallback:
        print(f"Using fallback method for {'mobile device' if is_mobile else 'requested fallback'}")
    
    try:
        user_data = request.get_json()
        print(f"Request data: Origin={user_data.get('origin')}, Destination={user_data.get('destination')}")
        
        origin = user_data.get('origin', 'unknown')
        destination = user_data.get('destination', 'unknown')
        
        # Generate filename based on origin and destination
        filename = get_recommendations_filename(origin, destination)
        filepath = os.path.join(RECOMMENDATIONS_DIR, filename)
        
        # Get candidate gems
        candidate_gems = user_data.get('candidates', [])
        if not candidate_gems:
            return jsonify({"error": "No candidate gems provided"}), 400
        
        # If using fallback, skip the LLM call completely
        if use_fallback:
            request_start_time = time.time()
            # Apply scoring and filtering based on user preferences
            filtered_gems = filter_gems_by_preferences(candidate_gems, user_data)
            
            # Take the top 5 gems
            selected = filtered_gems[:min(5, len(filtered_gems))]
            
            total_duration = time.time() - start_time
            print(f"⏱️ Total API request processing time (fallback): {total_duration:.2f}s")

            # Calculate how long the processing took so far
            processing_duration = time.time() - request_start_time

            # Calculate how much longer we need to wait to reach 30 seconds
            remaining_time = max(0, 30.0 - processing_duration)

            # Add the artificial delay
            if remaining_time > 0:
                print(f"Adding artificial delay of {remaining_time:.2f}s for fallback method")
                time.sleep(remaining_time)

            # Recalculate the total duration after the delay
            total_duration = time.time() - start_time
            print(f"⏱️ Total API request processing time (fallback with delay): {total_duration:.2f}s")
            
            # Save the recommendations to file
            try:
                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                with open(filepath, "w") as f:
                    json.dump(selected, f, indent=2)
                    print(f"Saved fallback recommendations to {filepath}")
            except Exception as e:
                print(f"Warning: Could not save fallback recommendations: {e}")
            
            return jsonify({
                "recommendations": selected,
                "meta": {
                    "processingTime": total_duration,
                    "filename": filename,
                    "filepath": filepath,
                    "method": "mobile_fallback" if is_mobile else "forced_fallback"
                }
            })
        else:
            prompt = build_recommendation_prompt(user_data)
        print("📤 Prompt to LLM:\n", prompt)
        
        # Store the gem_sample for later use
        gem_sample = user_data.get('gem_sample', [])
        
        # Call Ollama with timeout
        print("Calling Ollama...")
        response = call_ollama(prompt)
        
        # Check if response is None (timeout or error)
        if response is None:
            print("⚠️ Ollama request failed - using fallback")
            # Use fallback
            candidate_gems = user_data.get('candidates', [])
            if not candidate_gems:
                return jsonify({"error": "LLM call failed and no candidate gems available"}), 500
                
            # Apply filtering based on user preferences
            filtered_gems = filter_gems_by_preferences(candidate_gems, user_data)
            
            # Select top 5 gems
            selected = filtered_gems[:min(5, len(filtered_gems))]
            
            total_duration = time.time() - start_time
            print(f"⏱️ Total API request processing time (fallback): {total_duration:.2f}s")
            
            return jsonify({
                "recommendations": selected,
                "meta": {
                    "processingTime": total_duration,
                    "filename": filename,
                    "method": "fallback"
                }
            })
        
        print("📥 Raw LLM response received, processing...")
        
        # Extract indices from response
        match = re.search(r'\[.*\]', response, re.DOTALL)
        if not match:
            print("⚠️ LLM did not return valid indices")
            return jsonify({"error": "LLM did not return valid indices", "raw": response}), 500
        
        try:
            # Parse the indices
            indices = json.loads(match.group(0))
            print(f"Parsed indices: {indices}")
            
            # Make sure indices are valid (between 0 and length of gem_sample)
            valid_indices = [i for i in indices if 0 <= i < len(gem_sample)]
            if not valid_indices:
                print("⚠️ No valid indices found")
                return jsonify({"error": "No valid indices in LLM response"}), 500
                
            # Select the gems based on the indices
            selected_gems = [gem_sample[i] for i in valid_indices]
            print(f"Selected {len(selected_gems)} gems based on indices")
            
            # Ensure we have 5 gems (or as many as possible)
            if len(selected_gems) < 5 and len(gem_sample) > len(selected_gems):
                # Add more gems to reach 5 if possible
                remaining_indices = [i for i in range(len(gem_sample)) if i not in valid_indices]
                additional_indices = random.sample(
                    remaining_indices, 
                    min(5 - len(selected_gems), len(remaining_indices))
                )
                selected_gems.extend([gem_sample[i] for i in additional_indices])
                print(f"Added {len(additional_indices)} more gems to reach desired count")
            
            # Save the selected gems to file
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, "w") as f:
                json.dump(selected_gems, f, indent=2)
                print(f"Saved recommendations to {filepath}")
            
            # Calculate total duration
            total_duration = time.time() - start_time
            print(f"⏱️ Total API request processing time: {total_duration:.2f}s")
            
            result = {
                "recommendations": selected_gems,
                "meta": {
                    "processingTime": total_duration,
                    "filename": filename,
                    "filepath": filepath,
                    "method": "llm_indices"
                }
            }
            print("Sending response to client")
            return jsonify(result)
            
        except Exception as e:
            print(f"⚠️ Error processing indices: {str(e)}")
            return jsonify({"error": "Error processing indices", "details": str(e), "raw": response}), 500
            
    except Exception as e:
        print(f"⚠️ Unexpected error: {str(e)}")
        return jsonify({"error": "Unexpected error", "details": str(e)}), 500
            

        

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
    app.run(debug=True, host = '0.0.0.0', port=5000, threaded=True)