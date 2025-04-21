import os
import json
import requests
from typing import Dict, List, Optional

class HiddenGemsGenerator:
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the generator with your OpenAI API key
        If not provided, will look for OPENAI_API_KEY environment variable
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("API key is required. Set OPENAI_API_KEY environment variable or pass it directly.")
        
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
    def generate_recommendations(self, 
                                location: str,
                                max_distance: int,
                                transportation: str,
                                primary_interests: List[str],
                                activity_level: str,
                                time_available: str,
                                season: str,
                                crowd_preference: str = "Few people",
                                budget: str = "Moderate",
                                accessibility_needs: str = None,
                                already_visited: List[str] = None) -> Dict:
        """
        Generate hidden gem recommendations based on provided parameters
        
        Parameters:
        - location (str): Primary location (city, town, etc.)
        - max_distance (int): Maximum distance willing to travel in miles/km
        - transportation (str): Available transportation (Car, Public Transit, etc.)
        - primary_interests (List[str]): List of activities of interest
        - activity_level (str): Low, Moderate, or High
        - time_available (str): Half-day, Full-day, Weekend
        - season (str): Season of visit
        - crowd_preference (str): Preference for crowds
        - budget (str): Budget considerations
        - accessibility_needs (str): Any specific accessibility requirements
        - already_visited (List[str]): Places already visited to avoid repeats
        
        Returns:
        - Dict: Structured recommendations response
        """
        # Create prompt from template
        prompt = self._create_prompt(
            location=location,
            max_distance=max_distance,
            transportation=transportation,
            primary_interests=primary_interests,
            activity_level=activity_level,
            time_available=time_available,
            season=season,
            crowd_preference=crowd_preference,
            budget=budget,
            accessibility_needs=accessibility_needs,
            already_visited=already_visited
        )
        
        # Call OpenAI API
        response = self._call_openai_api(prompt)
        
        # Parse and structure the response
        return self._parse_response(response)
    
    def _create_prompt(self, **kwargs) -> str:
        """Create a structured prompt from template and parameters"""
        
        interests_str = ", ".join(kwargs['primary_interests'])
        already_visited_str = ""
        if kwargs.get('already_visited'):
            already_visited_str = ", ".join(kwargs['already_visited'])
        
        prompt = f"""# Hidden Gems Recommendation Request

## Location Information
- **Primary Location**: {kwargs['location']}
- **Max Time Willing to Travel**: {kwargs['time_available']}

## Activity Preferences
- **Primary Interests**: {interests_str}
- **Activity Level**: {kwargs['activity_level']}
- **Time Available**: {kwargs['time_available']}
- **Season of Visit**: {kwargs['season']}

## Additional Preferences
- **Crowd Preference**: {kwargs['crowd_preference']}
- **Budget Considerations**: {kwargs['budget']}
"""

        if kwargs.get('accessibility_needs'):
            prompt += f"- **Accessibility Needs**: {kwargs['accessibility_needs']}\n"
            
        if kwargs.get('already_visited'):
            prompt += f"- **Already Visited**: {already_visited_str}\n"
        
        prompt += """
## Output Format Requested
Please provide recommendations in the following structured format, with each recommendation in valid JSON format:

```json
[
  {
    "name": "Name of Hidden Gem",
    "location": "Specific address or coordinates",
    "distance": "X miles/kilometers from primary location",
    "category": "Nature/Food/Historical/etc.",
    "description": "Brief description of why it's special",
    "best_time": "Best time to visit (day/season)",
    "insider_tips": "Any special advice",
    "access_difficulty": "Easy/Moderate/Challenging"
  },
  {
    ...next recommendation...
  }
]
```

Please include at least 5 recommendations that match my preferences and are genuinely off the beaten path, not typically found on standard "top 10" lists for tourists.
"""
        return prompt
    
    def _call_openai_api(self, prompt: str) -> str:
        """Call the OpenAI API with the generated prompt"""
        
        url = "https://api.openai.com/v1/chat/completions"
        payload = {
            "model": "gpt-4o-mini",  # or another model like "gpt-3.5-turbo"
            "messages": [
                {
                    "role": "system", 
                    "content": "You are a local travel expert who specializes in finding hidden gems and off-the-beaten-path locations. You have extensive knowledge of local areas and can provide detailed, structured recommendations."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        try:
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            if hasattr(response, 'text'):
                print(f"Response text: {response.text}")
            raise
    
    def _parse_response(self, response: str) -> Dict:
        """Parse and structure the API response"""
        
        # Extract JSON array from response
        try:
            # Find JSON content between triple backticks
            if "```json" in response:
                json_content = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                json_content = response.split("```")[1].split("```")[0].strip()
            else:
                json_content = response
                
            recommendations = json.loads(json_content)
            return {"recommendations": recommendations}
        except Exception as e:
            print(f"Error parsing response: {e}")
            print(f"Raw response: {response}")
            # Return unparsed response as fallback
            return {"raw_response": response}

    def save_to_file(self, data: Dict, filename: str = "hidden_gems_recommendations.json"):
        """Save recommendations to a JSON file"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Recommendations saved to {filename}")


# Example usage
if __name__ == "__main__":
    # You can either set OPENAI_API_KEY as an environment variable or pass it directly
    generator = HiddenGemsGenerator()
    
    # Generate recommendations
    recommendations = generator.generate_recommendations(
        location="Aptos, California",
        max_distance=30,
        transportation="Car",
        primary_interests=["Hiking", "Nature", "Food", "Photography"],
        activity_level="Moderate",
        time_available="Full-day",
        season="Spring",
        budget="Moderate",
        already_visited=["Seacliff State Beach", "Rio del Mar Beach"]
    )
    
    # Save to file
    generator.save_to_file(recommendations)
    
    # Print recommendations
    print(json.dumps(recommendations, indent=2))