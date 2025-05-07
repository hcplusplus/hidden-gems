import random
import json
from faker import Faker

def generate_synthetic_poi_data(
    lat_range=(37.32, 37.34),
    lng_range=(-118.394, -118.393),
    num_points=5,
    max_travel_time_minutes=60,
    max_activity_time_minutes=60
):
    """
    Generate synthetic Points of Interest (POI) data for Northern California.
    
    Parameters:
    - lat_range: Tuple of (min_lat, max_lat)
    - lng_range: Tuple of (min_lng, max_lng)
    - num_points: Number of POIs to generate
    - max_travel_time_minutes: Maximum one-way travel time in minutes
    - max_activity_time_minutes: Maximum time spent at the activity in minutes
    
    Returns:
    - JSON string containing the synthetic POI data
    """
    fake = Faker()
    Faker.seed(42)  # For reproducibility
    
    # Lists for generating realistic but fictional place names
    natural_features = ["Ridge", "Peak", "Valley", "Grove", "Spring", "Lake", "Creek", "Falls", 
                        "Glen", "Point", "Meadow", "Hollow", "Vista", "Overlook", "Marsh"]
    name_prefixes = ["Hidden", "Emerald", "Golden", "Misty", "Peaceful", "Ancient", "Quiet", 
                     "Whispering", "Eagle's", "Falcon's", "Pine", "Oak", "Sierra", "Alpine", "Aspen"]
    
    # Activity types appropriate for this region
    activity_types = ["Hiking", "Birdwatching", "Photography", "Fishing", "Nature Walk", 
                      "Rock Climbing", "Picnicking", "Meditation", "Wildlife Viewing", "Stargazing"]
    
    # Generate POIs
    pois = []
    
    for i in range(num_points):
        # Generate random coordinates within the range
        latitude = random.uniform(lat_range[0], lat_range[1])
        longitude = random.uniform(lng_range[0], lng_range[1])
        
        # Generate a realistic but fictional place name
        place_name = f"{random.choice(name_prefixes)} {random.choice(natural_features)}"
        
        # Categorical features
        uv_index = random.randint(1, 11)  # 1-11 scale
        shade_coverage = random.randint(1, 5)  # 1-5 scale (1: no shade, 5: full shade)
        accessibility_levels = ["Easy", "Moderate", "Difficult", "Very Difficult", "ADA Accessible"]
        accessibility = random.choice(accessibility_levels)
        
        # Travel and activity times
        travel_time_minutes = random.randint(15, max_travel_time_minutes)
        activity_time_minutes = random.randint(30, max_activity_time_minutes)
        
        # Additional attributes to make the data more realistic
        elevation = random.randint(7000, 12000)  # Appropriate for Eastern Sierra region
        best_season = random.choice(["Spring", "Summer", "Fall", "Winter", "Year-round"])
        crowd_level = random.randint(1, 3)  # 1-3 scale (1: secluded, 3: occasionally visited)
        activity_type = random.choice(activity_types)
        
        # Create POI object
        poi = {
            "id": i + 1,
            "name": place_name,
            "coordinates": {
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6)
            },
            "category_features": {
                "uv_index": uv_index,
                "shade_coverage": shade_coverage,
                "accessibility": accessibility
            },
            "time_requirements": {
                "travel_time_minutes": travel_time_minutes,
                "activity_time_minutes": activity_time_minutes,
                "total_time_minutes": travel_time_minutes * 2 + activity_time_minutes  # Round trip + activity
            },
            "additional_info": {
                "elevation_ft": elevation,
                "best_season": best_season,
                "crowd_level": crowd_level,
                "activity_type": activity_type,
                "description": fake.paragraph(nb_sentences=3)
            }
        }
        
        pois.append(poi)
    
    # Create the final data structure
    data = {
        "region": "Eastern Sierra, CA",
        "total_points": num_points,
        "points_of_interest": pois
    }
    
    return json.dumps(data, indent=2)

import requests
import json
import osmnx as ox
import pandas as pd
import geopandas as gpd
from pprint import pprint
import random
from shapely.geometry import Polygon, box
import datetime
import re

# [Previous functions remain the same]

def generate_fake_review(place_data):
    """
    Generate a realistic-sounding fake review for a place based on its OSM data.
    
    Parameters:
    -----------
    place_data: dict
        Dictionary containing data about the place from OSM
        
    Returns:
    --------
    review: dict
        A dictionary containing the fake review information
    """
    # Review templates based on place type
    templates = {
        'park': [
            "Found this {size} park while exploring {region}. {accessibility} {child_friendly} The {feature} was {quality}. {crowd}",
            "Visited on a {weather} day in {season}. {trail_quality} {accessibility} {view_quality} {recommendation}",
            "Needed a quiet spot in {region} and discovered this gem. {crowd} {natural_features} {pet_friendly} {recommendation}"
        ],
        'viewpoint': [
            "Pulled over when I saw this viewpoint. {view_quality} {accessibility} {crowd} {photography}",
            "Took a {time_of_day} drive and stopped here. {view_quality} {weather_impact} {seating} {recommendation}",
            "Was looking for less-visited spots in {region} and found this lookout. {accessibility} {crowd} {view_quality}"
        ],
        'restaurant': [
            "Stopped here during our trip through {region}. {food_quality} {service_quality} {price_impression} {accessibility}",
            "Found this place when looking for {cuisine_type} food off the beaten path. {authenticity} {portion_size} {crowd}",
            "Needed a place to eat near {nearby_feature} and discovered this spot. {food_quality} {ambiance} {price_impression}"
        ],
        'historic': [
            "Fascinating piece of {region} history. {knowledge_gained} {preservation_state} {accessibility} {crowd}",
            "Stopped to explore while driving through {region}. {knowledge_gained} {photo_opportunity} {recommendation}",
            "Was researching hidden historic sites and found this place. {accessibility} {preservation_state} {crowd}"
        ],
        'natural': [
            "Discovered this natural wonder while exploring {region}. {trail_quality} {natural_beauty} {accessibility} {recommendation}",
            "Came during {season} which was {timing_quality}. {natural_features} {wildlife} {crowd} {photography}",
            "Found this spot off a side road in {region}. {natural_beauty} {accessibility} {crowd} {pet_friendly}"
        ],
        'default': [
            "Stumbled upon this place while exploring {region}. {accessibility} {crowd} {quality} {recommendation}",
            "Was looking for hidden gems in {region} and found this spot. {quality} {feature_note} {accessibility}",
            "Took a detour from the main highway and discovered this place. {quality} {crowd} {feature_note} {recommendation}"
        ]
    }
    
    # Determine place type
    place_type = 'default'
    for tag in ['leisure', 'amenity', 'tourism', 'natural', 'historic']:
        if tag in place_data and place_data[tag]:
            value = place_data[tag]
            if value in ['park', 'garden', 'playground']:
                place_type = 'park'
            elif value in ['viewpoint', 'attraction']:
                place_type = 'viewpoint'
            elif value in ['restaurant', 'cafe', 'bar', 'pub']:
                place_type = 'restaurant'
            elif tag == 'historic':
                place_type = 'historic'
            elif tag == 'natural':
                place_type = 'natural'
    
    # Select a template for this place type
    template = random.choice(templates.get(place_type, templates['default']))
    
    # Fill in the template values based on available data and randomization
    
    # Basic place information
    region = place_data.get('region', 'Northern California').split(',')[0]
    
    # Time-based information
    seasons = ['spring', 'summer', 'fall', 'winter']
    current_month = datetime.datetime.now().month
    if 3 <= current_month <= 5:
        season = 'spring'
    elif 6 <= current_month <= 8:
        season = 'summer'
    elif 9 <= current_month <= 11:
        season = 'fall'
    else:
        season = 'winter'
    
    times_of_day = ['morning', 'afternoon', 'evening', 'sunset', 'early morning']
    weather_conditions = ['sunny', 'cloudy', 'partly cloudy', 'foggy', 'clear']
    
    # Accessibility information
    accessibility_options = [
        "The paths are wheelchair accessible.",
        "Wheelchair access is limited.",
        "It has good accessibility for those with mobility issues.",
        "There are some steps that might be challenging for some visitors.",
        "The terrain is quite even and accessible.",
        "There's accessible parking available.",
        "The main areas are accessible, though some parts require climbing.",
        ""  # Empty option
    ]
    
    # Child and family friendliness
    child_friendly_options = [
        "Great for kids!",
        "The whole family enjoyed it.",
        "Not especially kid-friendly, but our teenagers appreciated it.",
        "Perfect for a family outing.",
        "Better for adults or older children.",
        "Our toddler loved the open space.",
        ""  # Empty option
    ]
    
    # Crowd levels
    crowd_options = [
        "We had the whole place to ourselves.",
        "Only saw a couple other visitors while there.",
        "Much less crowded than the more popular spots nearby.",
        "Pleasantly uncrowded for a weekend.",
        "A quiet respite from the tourist crowds.",
        "Surprising how few people know about this place.",
        "A true hidden gem away from the crowds."
    ]
    
    # Quality descriptors
    quality_options = [
        "absolutely stunning",
        "well worth the visit",
        "charming and unique",
        "better than expected",
        "a lovely surprise",
        "peaceful and relaxing",
        "authentic and unspoiled"
    ]
    
    # View quality
    view_quality_options = [
        "The views were breathtaking.",
        "You can see for miles on a clear day.",
        "The panorama was worth the trip alone.",
        "The vista was spectacular.",
        "Great views of the surrounding landscape.",
        "The scenery was picture-perfect."
    ]
    
    # Generate the review content by filling in the template
    review_content = template.format(
        region=region,
        size=random.choice(['small', 'spacious', 'hidden', 'secluded', 'peaceful']),
        accessibility=random.choice(accessibility_options),
        child_friendly=random.choice(child_friendly_options),
        feature=random.choice(['trail', 'picnic area', 'viewpoint', 'history', 'atmosphere']),
        quality=random.choice(quality_options),
        crowd=random.choice(crowd_options),
        weather=random.choice(weather_conditions),
        season=season,
        trail_quality=random.choice(['Trails were well-maintained.', 'The path was a bit overgrown but navigable.', 'Easy walking trails throughout.', '']),
        view_quality=random.choice(view_quality_options),
        natural_features=random.choice(['Beautiful flowers in bloom.', 'The rock formations were fascinating.', 'Loved the old growth trees.', 'The waterfall was magical.', '']),
        pet_friendly=random.choice(['Dog-friendly too!', 'Brought our dog who loved it.', 'Good spot for walking pets.', '']),
        time_of_day=random.choice(times_of_day),
        weather_impact=random.choice(['Perfect day for photos.', 'The fog added a mysterious quality.', 'Sunset colors made it magical.', '']),
        seating=random.choice(['There\'s a nice bench to rest on.', 'No formal seating, but plenty of rocks to sit on.', 'Brought our own chairs.', '']),
        food_quality=random.choice(['The food was delicious.', 'Fresh ingredients and great flavors.', 'Simple but tasty menu.', 'Best meal of our trip.']),
        service_quality=random.choice(['Service was friendly and attentive.', 'The owner was very welcoming.', 'Staff shared some local history.', '']),
        price_impression=random.choice(['Reasonable prices too.', 'Good value for the quality.', 'A bit pricey but worth it.', 'Surprisingly affordable.']),
        cuisine_type=random.choice(['local', 'authentic', 'farm-to-table', 'homestyle', 'creative']),
        authenticity=random.choice(['Felt like a true local experience.', 'Not touristy at all.', 'Authentic flavors and atmosphere.', '']),
        portion_size=random.choice(['Portions were generous.', 'Just the right amount of food.', 'Came away feeling satisfied.', '']),
        ambiance=random.choice(['Loved the cozy atmosphere.', 'The decor was charming.', 'Great ambiance with local character.', '']),
        nearby_feature=random.choice(['the lake', 'the hiking trail', 'the historic site', 'the main highway']),
        knowledge_gained=random.choice(['Learned so much about local history.', 'The informational displays were fascinating.', 'Gave us insight into the area\'s past.', '']),
        preservation_state=random.choice(['Well-preserved.', 'Partially restored but authentic.', 'Maintained enough to appreciate without being overly commercial.', '']),
        photo_opportunity=random.choice(['Great photo opportunities.', 'Brought my camera and got some fantastic shots.', 'Very photogenic place.', '']),
        natural_beauty=random.choice(['The natural beauty was stunning.', 'Gorgeous scenery all around.', 'The landscape was breathtaking.', '']),
        wildlife=random.choice(['Spotted some local wildlife.', 'Great for birdwatching.', 'Saw deer in the early morning.', '']),
        photography=random.choice(['A photographer\'s dream.', 'Brought my camera and wasn\'t disappointed.', 'Perfect lighting for photos.', '']),
        feature_note=random.choice(['Loved the unique features.', 'The local character really shows.', 'Has a special charm you won\'t find elsewhere.', '']),
        recommendation=random.choice(['Highly recommend!', 'Will definitely return.', 'Worth adding to your itinerary.', 'A special find in this area.', 'Don\'t miss this if you\'re nearby.'])
    )
    
    # Clean up any double spaces from empty options
    review_content = re.sub(r'\s+', ' ', review_content)
    review_content = re.sub(r'\s+\.', '.', review_content)
    review_content = re.sub(r'\s+\!', '!', review_content)
    
    # Generate user profile
    age_groups = ['20s', '30s', '40s', '50s', '60s', '70s']
    travel_styles = ['solo traveler', 'couple', 'family with children', 'group of friends', 'retiree']
    travel_frequencies = ['frequent traveler', 'occasional explorer', 'weekend adventurer', 'road trip enthusiast']
    
    # Generate a random rating weighted toward being positive for "hidden gems"
    # Most hidden gems should be rated well (4-5 stars)
    rating = random.choices([3, 3.5, 4, 4.5, 5], weights=[5, 10, 25, 35, 25])[0]
    
    # Create visit date in the past year
    days_ago = random.randint(7, 365)
    visit_date = (datetime.datetime.now() - datetime.timedelta(days=days_ago)).strftime('%B %Y')
    
    # Create the full review object
    review = {
        "content": review_content.strip(),
        "rating": rating,
        "author": {
            "age_group": random.choice(age_groups),
            "travel_style": random.choice(travel_styles),
            "travel_frequency": random.choice(travel_frequencies)
        },
        "visit_date": visit_date,
        "accessibility_mentioned": "wheelchair" in review_content.lower() or "accessible" in review_content.lower(),
        "child_friendly_mentioned": "kid" in review_content.lower() or "child" in review_content.lower() or "family" in review_content.lower(),
        "crowd_level_mentioned": any(crowd_term in review_content.lower() for crowd_term in ["crowd", "busy", "quiet", "ourselves", "few people"])
    }
    
    return review

def add_fake_reviews_to_gems(gems_data, num_reviews_range=(1, 3)):
    """
    Add fake user reviews to each gem location.
    
    Parameters:
    -----------
    gems_data: dict
        Dictionary containing gem data with a 'gems' list
    num_reviews_range: tuple
        Range of number of reviews to generate per gem (min, max)
        
    Returns:
    --------
    gems_data: dict
        Updated gems data with reviews added
    """
    for gem in gems_data['gems']:
        # Determine number of reviews for this gem
        num_reviews = random.randint(num_reviews_range[0], num_reviews_range[1])
        
        # Generate the reviews
        reviews = []
        for _ in range(num_reviews):
            review = generate_fake_review(gem)
            reviews.append(review)
            
        # Add reviews to the gem data
        gem['reviews'] = reviews
        
        # Calculate average rating from reviews
        if reviews:
            gem['rating'] = round(sum(review['rating'] for review in reviews) / len(reviews), 1)
            
    return gems_data

def download_and_prepare_hidden_gems(n_samples=15, include_reviews=True):
    """
    Download Northern California gems and prepare them for the web app,
    including optional fake reviews.
    
    Parameters:
    -----------
    n_samples: int
        Number of random places to sample as potential hidden gems.
    include_reviews: bool
        Whether to generate and include fake user reviews.
        
    Returns:
    --------
    gems_data: dict
        Dictionary containing prepared gem data ready for the web app.
    """
    # Download hidden gems
    hidden_gems = download_northern_california_hidden_gems(n_samples)
    
    if hidden_gems.empty:
        print("No hidden gems found")
        return {"gems": []}
    
    # Convert to GeoJSON-like format
    gems_data = {"gems": []}
    
    for idx, row in hidden_gems.iterrows():
        try:
            # Extract coordinates
            if hasattr(row.geometry, 'y') and hasattr(row.geometry, 'x'):
                lat = row.geometry.y
                lng = row.geometry.x
            elif hasattr(row.geometry, 'centroid'):
                lat = row.geometry.centroid.y
                lng = row.geometry.centroid.x
            else:
                continue
                
            # Get properties
            properties = {col: row[col] for col in hidden_gems.columns if col != 'geometry'}
            
            # Add region classification if not present
            if 'region' not in properties:
                if lat > 40:
                    region = "North Coast & Shasta"
                elif lat > 39:
                    region = "Wine Country & Mountains"
                elif lat > 38:
                    region = "Bay Area & Gold Country"
                else:
                    region = "Central Coast & Sierra"
                
                properties['region'] = region
            
            # Generate activities based on place type
            activities = []
            
            if 'leisure' in properties:
                if properties['leisure'] in ['park', 'garden']:
                    activities.extend(['walking', 'relaxing', 'picnicking'])
                elif properties['leisure'] == 'playground':
                    activities.extend(['family-friendly', 'kids'])
                elif properties['leisure'] in ['nature_reserve', 'beach']:
                    activities.extend(['nature', 'wildlife'])
            
            if 'amenity' in properties:
                if properties['amenity'] in ['restaurant', 'cafe', 'bar']:
                    activities.extend(['dining', 'food'])
                elif properties['amenity'] == 'place_of_worship':
                    activities.extend(['architecture', 'culture'])
            
            if 'tourism' in properties:
                if properties['tourism'] == 'viewpoint':
                    activities.extend(['photography', 'scenery'])
                elif properties['tourism'] == 'museum':
                    activities.extend(['culture', 'learning'])
                elif properties['tourism'] == 'attraction':
                    activities.extend(['sightseeing'])
            
            if 'natural' in properties:
                activities.extend(['nature', 'outdoors'])
                
            if 'historic' in properties:
                activities.extend(['history', 'culture'])
                
            # Ensure we have at least some activities
            if not activities:
                activities = ['exploring', 'sightseeing']
            
            # Remove duplicates
            activities = list(set(activities))
            
            # Add accessibility information
            accessibility = {
                "wheelchair": random.choice([True, False, None]),
                "parking": random.choice([True, False, None]),
                "public_transport": random.choice([True, False, None]),
                "restrooms": random.choice([True, False, None])
            }
            
            # Create gem object
            gem = {
                "id": idx,
                "name": row.get('name', f"Unnamed Place {idx}"),
                "coordinates": {
                    "latitude": lat,
                    "longitude": lng
                },
                "activities": activities,
                "accessibility": accessibility,
                "visit_duration": random.choice(["30 minutes", "1 hour", "2 hours", "half day", "full day"]),
                "best_time": random.choice(["morning", "afternoon", "evening", "any time", "weekday", "weekend"]),
                "cost": random.choice(["free", "$", "$$", "$$$"]),
                "popularity_score": properties.get('popularity_score', random.randint(1, 100)),
                **properties
            }
            
            gems_data["gems"].append(gem)
            
        except Exception as e:
            print(f"Error processing row {idx}: {e}")
    
    # Add reviews if requested
    if include_reviews and gems_data["gems"]:
        gems_data = add_fake_reviews_to_gems(gems_data)
    
    return gems_data

def save_gems_for_web_app(gems_data, output_path="assets/data/synth_gems.json"):
    """
    Save the prepared gems data to a JSON file for the web app.
    
    Parameters:
    -----------
    gems_data: dict
        Dictionary containing prepared gem data
    output_path: str
        Path to save the JSON file
        
    Returns:
    --------
    bool:
        True if successful, False otherwise
    """
    try:
        # Create directory if it doesn't exist
        import os
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save to JSON
        with open(output_path, 'w') as f:
            json.dump(gems_data, f, indent=2)
            
        print(f"Successfully saved {len(gems_data['gems'])} gems to {output_path}")
        return True
    except Exception as e:
        print(f"Error saving gems to JSON: {e}")
        return False

# Example usage
if __name__ == "__main__":
    # Download and prepare hidden gems with fake reviews
    gems_data = download_and_prepare_hidden_gems(
        n_samples=15,
        include_reviews=True
    )
    
    # Save for web app
    if gems_data and gems_data["gems"]:
        save_gems_for_web_app(gems_data)

# # Example usage
# if __name__ == "__main__":
#     poi_data = generate_synthetic_poi_data()
#     print(poi_data)