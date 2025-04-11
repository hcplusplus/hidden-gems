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

# Example usage
if __name__ == "__main__":
    poi_data = generate_synthetic_poi_data()
    print(poi_data)

import random
import json
import math
from faker import Faker

def generate_synthetic_restaurant_data(
    num_restaurants=10,
    bounds={
        "min_lat": 37.336962631031504,  # San Jose (bottom left)
        "max_lat": 41.74746217345373,   # Crescent City (top left)
        "min_lng": -124.1095344585807,  # Crescent City (top left)
        "max_lng": -118.28222302824624  # Bishop (bottom right)
    }
):
    """
    Generate synthetic restaurant data with locations in Northern California.
    
    Parameters:
    - num_restaurants: Number of restaurants to generate
    - bounds: Dictionary with min/max lat/lng values
    
    Returns:
    - JSON string containing the synthetic restaurant data
    """
    fake = Faker()
    Faker.seed(42)  # For reproducibility
    
    # Lists for generating realistic restaurant names
    cuisine_types = ["Italian", "Mexican", "Japanese", "French", "American", "Thai", 
                     "Farm-to-Table", "Seafood", "Brewpub", "Wine Bar", "Gastropub", "BBQ",
                     "Indian", "Greek", "Chinese", "Korean", "Vietnamese", "Mediterranean"]
    
    name_elements = ["Table", "Spoon", "Fork", "Plate", "Bistro", "Kitchen", "Grill", 
                     "Garden", "House", "Café", "Diner", "Eatery", "Tavern", "Ranch", 
                     "Roadhouse", "Cantina", "Taqueria", "Osteria", "Trattoria"]
    
    name_adjectives = ["Golden", "Silver", "Blue", "Green", "Red", "Rustic", "Urban", 
                      "Coastal", "Mountain", "Wine Country", "Redwood", "Sierra", "Pacific", 
                      "Northern", "Elegant", "Cozy", "Spicy", "Fresh", "Local"]
    
    # Northern California regions
    regions = ["Napa Valley", "Sonoma County", "Mendocino Coast", "Sierra Foothills", 
               "Tahoe Area", "Redwood Coast", "Shasta Region", "Gold Country", 
               "Sacramento Valley", "SF Bay Area", "Monterey Bay"]
    
    # Common cities in Northern California
    cities = ["Healdsburg", "Calistoga", "Nevada City", "Truckee", "Mendocino", 
              "Fort Bragg", "Placerville", "Auburn", "Sonoma", "St. Helena", 
              "Point Reyes Station", "Guerneville", "Sebastopol", "Ukiah", "Eureka"]
    
    # Ambiance descriptors
    ambiance_types = ["Casual", "Upscale", "Romantic", "Family-friendly", "Modern", 
                      "Traditional", "Rustic", "Farm-to-Table", "Cozy", "Vibrant", 
                      "Quiet", "Historic", "Artsy", "Dog-friendly", "Outdoor Seating"]
    
    # Cost levels with reasonable distribution
    cost_levels = ["$", "$$", "$$$", "$$$$"]
    cost_weights = [0.15, 0.45, 0.3, 0.1]  # More common to be moderate cost
    
    # Highway proximity descriptions
    highway_proximity = ["Just off Highway", "Near Highway", "Along Highway", 
                        "At the intersection of Highway", "A short drive from Highway"]
    
    # Main highways in Northern California
    highways = ["1", "5", "20", "29", "49", "50", "80", "101", "128", "199", "299"]
    
    restaurants = []
    
    for i in range(num_restaurants):
        # Random location within bounds
        latitude = random.uniform(bounds["min_lat"], bounds["max_lat"])
        longitude = random.uniform(bounds["min_lng"], bounds["max_lng"])
        
        # Generate restaurant name - various patterns
        name_pattern = random.randint(1, 4)
        if name_pattern == 1:
            # Pattern: The [Adjective] [Element]
            name = f"The {random.choice(name_adjectives)} {random.choice(name_elements)}"
        elif name_pattern == 2:
            # Pattern: [Name]'s
            name = f"{fake.first_name()}'s {random.choice(name_elements)}"
        elif name_pattern == 3:
            # Pattern: [Cuisine] [Element]
            name = f"{random.choice(cuisine_types)} {random.choice(name_elements)}"
        else:
            # Pattern: [City/Region] [Element]
            name = f"{random.choice(cities)} {random.choice(name_elements)}"
        
        # Random ambiance descriptors (1-2 types)
        num_ambiance = random.randint(1, 2)
        ambiance = random.sample(ambiance_types, num_ambiance)
        
        # Cost level with weighted distribution
        cost = random.choices(cost_levels, weights=cost_weights)[0]
        
        # Pick a region and city
        region = random.choice(regions)
        city = random.choice(cities)
        
        # Generate distance from highway
        highway = random.choice(highways)
        distance_miles = round(random.uniform(0.1, 5.0), 1)
        highway_description = f"{random.choice(highway_proximity)} {highway}, {distance_miles} miles"
        
        # Create travel time estimate (based on distance from highway)
        travel_time = math.ceil(distance_miles * 2) + random.randint(0, 5)  # Simple estimate
        
        # Generate keyword tags (combining features)
        possible_tags = [region, city, random.choice(cuisine_types)] + ambiance
        tag_count = random.randint(3, 5)
        tags = random.sample(possible_tags, min(tag_count, len(possible_tags)))
        
        restaurant = {
            "id": i + 1,
            "name": name,
            "coordinates": {
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6)
            },
            "region": region,
            "city": city,
            "ambiance": ambiance,
            "cost": cost,
            "cuisine": random.choice(cuisine_types),
            "rating": round(random.uniform(3.0, 5.0), 1),  # 3.0-5.0 star rating
            "highway_access": highway_description,
            "travel_time_minutes": travel_time,
            "popularity_score": random.randint(1, 100),  # Higher = more popular/known
            "tags": tags
        }
        
        restaurants.append(restaurant)
    
    data = {
        "total_restaurants": num_restaurants,
        "restaurants": restaurants
    }
    
    return json.dumps(data, indent=2)

# Example usage
if __name__ == "__main__":
    restaurant_data = generate_synthetic_restaurant_data(5)
    print(restaurant_data)