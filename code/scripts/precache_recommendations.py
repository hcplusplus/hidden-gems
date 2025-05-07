import os
import json
import logging
import time
import requests
from osm_gem_finder import precache_trip_recommendations

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_demo_trips():
    """Load trip definitions from demo_trips.json."""
    try:
        with open('demo_trips.json', 'r') as f:
            trips = json.load(f)
        logger.info(f"Loaded {len(trips)} trips from demo_trips.json")
        return trips
    except FileNotFoundError:
        logger.error("demo_trips.json not found. Please make sure the file exists.")
        return []
    except json.JSONDecodeError:
        logger.error("Error parsing demo_trips.json. Please check the file format.")
        return []

def save_precached_results(results, filename='precached_results.json'):
    """Save precaching results to a file."""
    try:
        # Create a simplified version without full gems list to display
        display_results = []
        for result in results:
            display_result = {
                'trip': result['trip'],
                'status': result['status'],
                'gems_count': result.get('gems_count', 0)
            }
            
            # Add top gem names if available
            if 'gems' in result and result['gems']:
                display_result['top_gems'] = [gem['name'] for gem in result['gems'][:3]]
            
            # Add error message if applicable
            if 'error' in result:
                display_result['error'] = result['error']
                
            display_results.append(display_result)
        
        # Save the full results
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
            
        # Save a simplified version for display
        with open('precached_results_summary.json', 'w') as f:
            json.dump(display_results, f, indent=2)
            
        logger.info(f"Saved precaching results to {filename} and precached_results_summary.json")
        return True
    except Exception as e:
        logger.error(f"Error saving results: {str(e)}")
        return False

def main():
    """Main function to precache recommendations."""
    print("Starting precaching process for demo trips...")
    
    # Load trips from demo_trips.json
    trips = load_demo_trips()
    
    if not trips:
        print("No trips found. Exiting.")
        return False
    
    print(f"Found {len(trips)} trips to process:")
    for i, trip in enumerate(trips):
        print(f"{i+1}. {trip['origin']} to {trip['destination']}")
    print("\nStarting precaching with a 10-minute timeout per trip...")
    
    # Set start time
    start_time = time.time()
    
    # Precache recommendations with extended timeout (10 minutes per trip)
    results = precache_trip_recommendations(trips, llm_timeout=600)
    
    # Save results
    save_precached_results(results)
    
    # Calculate elapsed time
    elapsed_time = time.time() - start_time
    minutes, seconds = divmod(elapsed_time, 60)
    
    # Print results
    print("\nPrecaching completed in {:.0f} minutes and {:.0f} seconds.".format(minutes, seconds))
    print("Results summary:")
    
    for result in results:
        print(f"\nTrip: {result['trip']['origin']} to {result['trip']['destination']}")
        print(f"Status: {result['status']}")
        
        if result['status'] == 'success':
            print(f"Found {result['gems_count']} recommendations")
            
            if result['gems_count'] > 0:
                print("Top recommendations:")
                for i, gem in enumerate(result['gems'][:3]):
                    print(f"{i+1}. {gem['name']} - {gem['category']} - {gem['rarity']}")
        else:
            print(f"Error: {result.get('error', 'Unknown error')}")
        
        print("-"*50)
    
    print("\nDetailed results saved to 'precached_results.json'")
    print("Summary saved to 'precached_results_summary.json'")
    return True

if __name__ == "__main__":
    main()