#!/usr/bin/env python3
"""
simulate_trips.py - Generate fake trips to build up response time data
Run this script before user testing to populate the response times database.
"""

import requests
import json
import time
import random
import argparse
import os
import sys
from tqdm import tqdm  # For progress bar (install with pip install tqdm)

# Configuration
BASE_URL = "http://127.0.0.1:5000"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)  # Assuming this script is in a subdirectory

# Adjust paths based on where the script is run from
RESPONSE_TIMES_PATH = os.path.join(ROOT_DIR, "static/assets/data/response_times.json")
GEMS_PATH = os.path.join(ROOT_DIR, "static/assets/data/hidden_gems.json")

# Sample Northern California cities for trip origins and destinations
NORCAL_CITIES = [
    "San Francisco", "Oakland", "Berkeley", "San Jose", "Palo Alto",
    "Sacramento", "Santa Rosa", "Napa", "Sonoma", "Monterey", 
    "Santa Cruz", "Redding", "Eureka", "Fort Bragg", "Mendocino",
    "South Lake Tahoe", "Truckee", "Placerville", "Auburn", "Chico"
]

# Sample coordinates for major Northern California cities
# Format: [longitude, latitude]
NORCAL_COORDINATES = {
    "San Francisco": [-122.4194, 37.7749],
    "Oakland": [-122.2711, 37.8044],
    "Berkeley": [-122.2730, 37.8715],
    "San Jose": [-121.8863, 37.3382],
    "Palo Alto": [-122.1430, 37.4419],
    "Sacramento": [-121.4944, 38.5816],
    "Santa Rosa": [-122.7144, 38.4404],
    "Napa": [-122.2857, 38.2975],
    "Sonoma": [-122.4580, 38.2919],
    "Monterey": [-121.8947, 36.6002],
    "Santa Cruz": [-122.0308, 36.9741],
    "Redding": [-122.3917, 40.5865],
    "Eureka": [-124.1636, 40.8021],
    "Fort Bragg": [-123.8053, 39.4457],
    "Mendocino": [-123.7995, 39.3076],
    "South Lake Tahoe": [-119.9772, 38.9399],
    "Truckee": [-120.1833, 39.3280],
    "Placerville": [-120.7983, 38.7296],
    "Auburn": [-121.0772, 38.8966],
    "Chico": [-121.8375, 39.7284]
}

# Sample activities and preferences
ACTIVITIES = ["hiking", "sightseeing", "eating", "shopping", "camping", "photography"]
AMENITIES = ["restrooms", "parking", "gas"]
EFFORT_LEVELS = ["easy", "moderate", "challenging"]
ACCESSIBILITY = ["wheelchair", "stroller", "elderly", "none"]
TIME_OPTIONS = ["quick", "short", "half-day", "full-day"]

def load_gems():
    """Load hidden gems data from file"""
    try:
        with open(GEMS_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading gems: {e}")
        return []

def filter_gems_along_route(gems, origin_coords, destination_coords, buffer_distance_km=30):
    """
    Simple simulation of findGemsAlongRoute functionality
    Filters gems that are approximately along a route
    """
    def distance_to_line_segment(point, line_start, line_end):
        """Calculate distance from point to line segment"""
        # Convert to radians
        lat1, lon1 = line_start[1] * (3.14159/180), line_start[0] * (3.14159/180)
        lat2, lon2 = line_end[1] * (3.14159/180), line_end[0] * (3.14159/180)
        lat3, lon3 = point[1] * (3.14159/180), point[0] * (3.14159/180)
        
        # Earth radius in km
        R = 6371
        
        # Simple approximation for small distances
        x1 = R * lon1 * math.cos((lat1 + lat2) / 2)
        y1 = R * lat1
        x2 = R * lon2 * math.cos((lat1 + lat2) / 2)
        y2 = R * lat2
        x3 = R * lon3 * math.cos((lat1 + lat3) / 2)
        y3 = R * lat3
        
        # Line segment parameters
        dx = x2 - x1
        dy = y2 - y1
        
        # If line segment is a point, return distance to the point
        if dx == 0 and dy == 0:
            return math.sqrt((x3 - x1)**2 + (y3 - y1)**2)
        
        # Calculate projection
        t = ((x3 - x1) * dx + (y3 - y1) * dy) / (dx**2 + dy**2)
        
        # Clamp t to [0,1] for line segment
        t = max(0, min(1, t))
        
        # Calculate closest point on line segment
        x_proj = x1 + t * dx
        y_proj = y1 + t * dy
        
        # Return distance to closest point
        return math.sqrt((x3 - x_proj)**2 + (y3 - y_proj)**2)
    
    try:
        import math
        
        # Filter gems that are near the route
        route_gems = []
        for gem in gems:
            # Skip if coordinates not available
            if not gem.get("coordinates") or len(gem["coordinates"]) != 2:
                continue
            
            gem_coords = gem["coordinates"]
            
            # Check if within buffer distance of route
            distance = distance_to_line_segment(gem_coords, origin_coords, destination_coords)
            if distance <= buffer_distance_km:
                # Add distance property
                gem["distanceFromRoute"] = distance
                route_gems.append(gem)
        
        # Return a sample of the gems
        sample_size = min(15, len(route_gems))
        if route_gems:
            return random.sample(route_gems, sample_size)
        return []
    except Exception as e:
        print(f"Error filtering gems: {e}")
        return []

def generate_random_trip():
    """Generate random trip preferences"""
    # Select two different cities
    origin_city, destination_city = random.sample(NORCAL_CITIES, 2)
    
    # Get coordinates for these cities
    origin_coords = NORCAL_COORDINATES.get(origin_city)
    destination_coords = NORCAL_COORDINATES.get(destination_city)
    
    return {
        "origin": origin_city,
        "destination": destination_city,
        "originCoords": origin_coords,
        "destinationCoords": destination_coords,
        "activities": random.sample(ACTIVITIES, random.randint(1, 3)),
        "amenities": random.sample(AMENITIES, random.randint(0, 2)),
        "effortLevel": random.choice(EFFORT_LEVELS),
        "accessibility": random.sample(ACCESSIBILITY, random.randint(0, 2)),
        "time": random.choice(TIME_OPTIONS),
        "otherActivities": "",
        "otherAccessibility": "",
        "candidates": []  # Will be filled with gems along route
    }

def simulate_trip(trip_data, all_gems):
    """Simulate a trip by calling the API endpoint"""
    print(f"Simulating trip from {trip_data['origin']} to {trip_data['destination']}...")
    
    # First simulate findGemsAlongRoute to get candidate gems
    if trip_data.get("originCoords") and trip_data.get("destinationCoords"):
        # Filter gems along the route
        trip_data["candidates"] = filter_gems_along_route(
            all_gems, 
            trip_data["originCoords"],
            trip_data["destinationCoords"]
        )
        print(f"Found {len(trip_data['candidates'])} candidate gems along route")
    else:
        print("Warning: Missing coordinates, can't filter gems along route")
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/generate_recommendations",
            json=trip_data,
            timeout=300  # avg model response time on this task is ~120 seconds
        )
        duration = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            recommendations = result.get("recommendations", result)
            meta = result.get("meta", {})
            
            return {
                "success": True,
                "duration": duration,
                "processing_time": meta.get("processingTime", duration),
                "recommendations": recommendations
            }
        else:
            print(f"Error: {response.status_code} - {response.text}")
            return {
                "success": False,
                "duration": duration,
                "error": f"Status code: {response.status_code}"
            }
    except Exception as e:
        print(f"Exception: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def get_current_stats():
    """Get current response time statistics"""
    try:
        response = requests.get(f"{BASE_URL}/api/response_time")
        if response.status_code == 200:
            return response.json()
        return {"average": 0, "times": []}
    except:
        return {"average": 0, "times": []}

def main():
    parser = argparse.ArgumentParser(description="Simulate trips to gather response time data")
    parser.add_argument("-n", "--num-trips", type=int, default=5, 
                        help="Number of fake trips to generate (default: 5)")
    parser.add_argument("--min-trips", type=int, default=10,
                        help="Minimum total trips to ensure in database (default: 10)")
    args = parser.parse_args()
    
    # Check current stats
    current_stats = get_current_stats()
    current_count = len(current_stats.get("times", []))
    print(f"Current response time database has {current_count} entries")
    print(f"Current average response time: {current_stats.get('average', 0):.2f} seconds")
    
    # Determine how many trips to run
    trips_to_run = max(args.num_trips, args.min_trips - current_count)
    if trips_to_run <= 0:
        print(f"Database already has {current_count} entries, which meets the minimum of {args.min_trips}")
        print("No additional trips needed. Use --num-trips to force additional trips.")
        return
    
    print(f"Running {trips_to_run} simulated trips...")
    
    # Load all gems
    all_gems = load_gems()
    if not all_gems:
        print("Error: Could not load gems data. Aborting.")
        return
    
    results = []
    successful = 0
    total_duration = 0
    
    # Run simulated trips with progress bar
    for i in tqdm(range(trips_to_run)):
        trip_data = generate_random_trip()
        result = simulate_trip(trip_data, all_gems)
        
        if result.get("success", False):
            successful += 1
            total_duration += result.get("duration", 0)
            
        results.append({
            "trip": trip_data,
            "result": result
        })
        
        # Small delay between requests to avoid overwhelming the server
        time.sleep(1)
    
    # Save results to file for reference
    with open(os.path.join(SCRIPT_DIR, "trip_simulation_results.json"), "w") as f:
        json.dump(results, f, indent=2)
    
    # Print summary
    if successful > 0:
        avg_duration = total_duration / successful
        print(f"\nSimulation complete! {successful}/{trips_to_run} trips successful")
        print(f"Average response time: {avg_duration:.2f} seconds")
    else:
        print("\nSimulation failed. No successful trips.")
    
    # Check updated stats
    updated_stats = get_current_stats()
    print(f"Updated response time database now has {len(updated_stats.get('times', []))} entries")
    print(f"Updated average response time: {updated_stats.get('average', 0):.2f} seconds")

if __name__ == "__main__":
    main()