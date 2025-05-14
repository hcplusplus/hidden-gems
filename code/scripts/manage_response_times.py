#!/usr/bin/env python3
"""
manage_response_times.py - Utility to manage the response times database
"""

import os
import json
import argparse
import datetime
import sys

# Get script directory and calculate paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)  # Assuming this script is in a subdirectory

# Adjust paths based on where the script is run from
RESPONSE_TIMES_PATH = os.path.join(ROOT_DIR, "static/assets/data/response_times.json")

def reset_database():
    """Reset the response times database to empty"""
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(RESPONSE_TIMES_PATH), exist_ok=True)
        
        # Write empty database
        with open(RESPONSE_TIMES_PATH, "w") as f:
            json.dump({"times": [], "average": 0}, f, indent=2)
        
        print(f"✅ Response times database reset successfully at {RESPONSE_TIMES_PATH}")
        return True
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
        return False

def seed_database(count=10, avg_time=8.0, variance=2.0):
    """Seed the database with synthetic response times"""
    import random
    
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(RESPONSE_TIMES_PATH), exist_ok=True)
        
        # Generate synthetic times
        times = [max(1.0, random.normalvariate(avg_time, variance)) for _ in range(count)]
        average = sum(times) / len(times)
        
        # Write seeded database
        with open(RESPONSE_TIMES_PATH, "w") as f:
            json.dump({
                "times": times,
                "average": average,
                "synthetic": True,
                "created_at": datetime.datetime.now().isoformat()
            }, f, indent=2)
        
        print(f"✅ Database seeded with {count} synthetic entries")
        print(f"   Average response time: {average:.2f} seconds")
        return True
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        return False

def view_database():
    """View the current response times database"""
    try:
        with open(RESPONSE_TIMES_PATH, "r") as f:
            data = json.load(f)
        
        times = data.get("times", [])
        average = data.get("average", 0)
        synthetic = data.get("synthetic", False)
        
        print("\n📊 Response Times Database Stats:")
        print(f"   Path: {RESPONSE_TIMES_PATH}")
        print(f"   Entries: {len(times)}")
        print(f"   Average: {average:.2f} seconds")
        if synthetic:
            print(f"   Type: Synthetic (created at {data.get('created_at', 'unknown')})")
        else:
            print(f"   Type: Real")
        
        if times:
            print(f"   Min: {min(times):.2f}s, Max: {max(times):.2f}s")
            
            # Show histogram of times
            if len(times) >= 5:
                try:
                    import numpy as np
                    
                    bins = min(10, len(times))
                    hist, edges = np.histogram(times, bins=bins)
                    max_count = max(hist)
                    width = 50  # Width of histogram
                    
                    print("\n   Distribution:")
                    for i, count in enumerate(hist):
                        bar = "█" * int(count / max_count * width)
                        print(f"   {edges[i]:.1f}s - {edges[i+1]:.1f}s | {bar} ({count})")
                except ImportError:
                    print("   Note: Install numpy for histogram visualization")
        
        return True
    except FileNotFoundError:
        print(f"❌ Response times database not found at {RESPONSE_TIMES_PATH}.")
        print("   It may not have been created yet.")
        return False
    except Exception as e:
        print(f"❌ Error viewing database: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Manage response times database")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Reset command
    reset_parser = subparsers.add_parser("reset", help="Reset the database to empty")
    
    # Seed command
    seed_parser = subparsers.add_parser("seed", help="Seed the database with synthetic times")
    seed_parser.add_argument("-c", "--count", type=int, default=10, 
                            help="Number of synthetic entries to create (default: 10)")
    seed_parser.add_argument("-t", "--time", type=float, default=8.0,
                            help="Average response time in seconds (default: 8.0)")
    seed_parser.add_argument("-v", "--variance", type=float, default=2.0,
                            help="Variance in response times (default: 2.0)")
    
    # View command
    view_parser = subparsers.add_parser("view", help="View the current database")
    
    args = parser.parse_args()
    
    if args.command == "reset":
        reset_database()
    elif args.command == "seed":
        seed_database(args.count, args.time, args.variance)
    elif args.command == "view":
        view_database()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()