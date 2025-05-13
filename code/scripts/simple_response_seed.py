#!/usr/bin/env python3
"""
simple_seed.py - A simple script to seed the response times database for ~90s response times
"""

import os
import json
import random
import argparse

# Get script directory and calculate paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)  # Assuming this script is in a subdirectory

# Adjust paths based on where the script is run from
RESPONSE_TIMES_PATH = os.path.join(ROOT_DIR, "static/assets/data/response_times.json")

def seed_database(count=5, avg_time=90.0, min_time=80.0, max_time=150.0):
    """Seed the database with realistic response times"""
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(RESPONSE_TIMES_PATH), exist_ok=True)
        
        # Generate realistic times
        times = []
        for _ in range(count):
            # Use triangular distribution centered on avg_time
            time_value = random.triangular(min_time, max_time, avg_time)
            times.append(time_value)
        
        average = sum(times) / len(times)
        
        # Write seeded database
        with open(RESPONSE_TIMES_PATH, "w") as f:
            json.dump({
                "times": times,
                "average": average,
                "synthetic": True
            }, f, indent=2)
        
        print(f"✅ Database seeded with {count} synthetic entries at {RESPONSE_TIMES_PATH}")
        print(f"   Average response time: {average:.2f} seconds")
        print(f"   Range: {min(times):.2f}s - {max(times):.2f}s")
        
        return True
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Seed with realistic response times")
    parser.add_argument("-c", "--count", type=int, default=5, 
                        help="Number of entries to create (default: 5)")
    parser.add_argument("-a", "--average", type=float, default=90.0,
                        help="Average response time in seconds (default: 90.0)")
    parser.add_argument("--min", type=float, default=80.0,
                        help="Minimum response time in seconds (default: 80.0)")
    parser.add_argument("--max", type=float, default=110.0,
                        help="Maximum response time in seconds (default: 110.0)")
    args = parser.parse_args()
    
    print(f"🔢 Seeding response times database with realistic data...")
    seed_database(args.count, args.average, args.min, args.max)

if __name__ == "__main__":
    main()