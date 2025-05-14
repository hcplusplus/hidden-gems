import json
import requests
import time
import os
import math
from tqdm import tqdm
from datetime import datetime
from collections import defaultdict
from math import radians, cos, sin, asin, sqrt
import random
import argparse

# Configuration
GEM_DATA_PATH = "static/assets/data/hidden_gems.json"  # Path to your gems file
OUTPUT_DIR = "static/assets/data/review_batches"  # Directory to save batch review files
FINAL_OUTPUT_PATH = "static/assets/data/reviews.json"  # Where to save the final combined reviews
REVIEWS_API_ENDPOINT = "http://127.0.0.1:5000/generate_review"  # Your review generation endpoint
RATE_LIMIT_DELAY = 0.5  # Delay between API calls in seconds

# Northern California bounding box [min_lat, min_lon, max_lat, max_lon]
NORCAL_BBOX = [
    37.336962631031504, -124.1095344585807,  # Min lat (San Jose), Min lon (Crescent City)
    41.74746217345373, -118.28222302824624,  # Max lat (Crescent City), Max lon (Bishop)
]

# Grid parameters
GRID_SIZE = 6  # 6x6 grid, creating 36 cells
GEMS_PER_BATCH = 25  # Process 25 gems per batch
MIN_GEMS_PER_QUADRANT = 5  # Ensure at least 5 gems per quadrant in each batch if possible

def haversine(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance between two points
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
   
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371  # Radius of earth in kilometers
    return c * r

def get_grid_cells(bbox, grid_size):
    """
    Divide the bounding box into a grid of cells.
    """
    min_lat, min_lon, max_lat, max_lon = bbox
   
    # Calculate width and height of each cell
    lat_step = (max_lat - min_lat) / grid_size
    lon_step = (max_lon - min_lon) / grid_size
   
    cells = []
    for i in range(grid_size):
        for j in range(grid_size):
            cell_min_lat = min_lat + i * lat_step
            cell_min_lon = min_lon + j * lon_step
            cell_max_lat = min_lat + (i + 1) * lat_step
            cell_max_lon = min_lon + (j + 1) * lon_step
           
            cells.append([cell_min_lat, cell_min_lon, cell_max_lat, cell_max_lon])
   
    return cells

def get_quadrant(lat, lon, bbox=NORCAL_BBOX):
    """
    Determine which quadrant of the bounding box a point belongs to.
    """
    min_lat, min_lon, max_lat, max_lon = bbox
    mid_lat = (min_lat + max_lat) / 2
    mid_lon = (min_lon + max_lon) / 2
   
    if lat < mid_lat:
        if lon < mid_lon:
            return 0  # SW
        else:
            return 1  # SE
    else:
        if lon < mid_lon:
            return 2  # NW
        else:
            return 3  # NE

def get_gem_coordinates(gem):
    """Extract coordinates from a gem object."""
    # Try different coordinate formats
    if 'coordinates' in gem and gem['coordinates']:
        # Handle string format like "37.7749,-122.4194"
        if isinstance(gem['coordinates'], str):
            try:
                lat, lon = map(float, gem['coordinates'].split(','))
                return lat, lon
            except (ValueError, TypeError):
                pass
    
    # Try explicit latitude/longitude fields
    if 'latitude' in gem and 'longitude' in gem:
        try:
            lat = float(gem['latitude'])
            lon = float(gem['longitude'])
            return lat, lon
        except (ValueError, TypeError):
            pass
    
    # Return None if no valid coordinates found
    return None

def is_in_bbox(lat, lon, bbox):
    """Check if coordinates are within the bounding box."""
    min_lat, min_lon, max_lat, max_lon = bbox
    return min_lat <= lat <= max_lat and min_lon <= lon <= max_lon

def assign_gems_to_cells(gems, cells):
    """
    Assign gems to grid cells based on their coordinates.
    
    Returns a dictionary mapping cell indices to lists of gems.
    """
    cell_gems = {i: [] for i in range(len(cells))}
    gems_without_cells = []
    
    for gem in gems:
        coords = get_gem_coordinates(gem)
        if not coords:
            gems_without_cells.append(gem)
            continue
            
        lat, lon = coords
        
        # Skip if outside the overall bounding box
        if not is_in_bbox(lat, lon, NORCAL_BBOX):
            gems_without_cells.append(gem)
            continue
        
        # Find which cell this gem belongs to
        assigned = False
        for i, cell in enumerate(cells):
            cell_min_lat, cell_min_lon, cell_max_lat, cell_max_lon = cell
            if (cell_min_lat <= lat <= cell_max_lat and 
                cell_min_lon <= lon <= cell_max_lon):
                cell_gems[i].append(gem)
                assigned = True
                break
        
        if not assigned:
            gems_without_cells.append(gem)
    
    return cell_gems, gems_without_cells

def create_balanced_batches(gems, batch_size=GEMS_PER_BATCH):
    """
    Create batches of gems with even geographical distribution.
    
    Returns a list of batches, where each batch is a list of gems.
    """
    # Create grid cells
    cells = get_grid_cells(NORCAL_BBOX, GRID_SIZE)
    print(f"Created {len(cells)} grid cells")
    
    # Assign gems to cells
    cell_gems, unassigned_gems = assign_gems_to_cells(gems, cells)
    
    # Count gems per cell and quadrant
    total_by_cell = {i: len(gems_list) for i, gems_list in cell_gems.items()}
    
    # Group cells by quadrant
    quadrant_cells = {q: [] for q in range(4)}
    for i, cell in enumerate(cells):
        quadrant = get_quadrant((cell[0] + cell[2])/2, (cell[1] + cell[3])/2)
        quadrant_cells[quadrant].append(i)
    
    # Create batches
    batches = []
    remaining_gems = {i: gems_list.copy() for i, gems_list in cell_gems.items()}
    
    # Add unassigned gems to a special "cell"
    remaining_gems[-1] = unassigned_gems
    
    # Determine how many batches we'll need
    total_gems = sum(len(gems_list) for gems_list in remaining_gems.values())
    num_batches = math.ceil(total_gems / batch_size)
    
    print(f"Creating {num_batches} batches with approximately {batch_size} gems each")
    print(f"Total gems: {total_gems}, including {len(unassigned_gems)} unassigned to cells")
    
    for batch_num in range(num_batches):
        batch = []
        
        # Try to get gems from each quadrant for better distribution
        for quadrant in range(4):
            # Get cell indices for this quadrant
            quad_cells = quadrant_cells[quadrant]
            
            # Skip if no cells in this quadrant
            if not quad_cells:
                continue
            
            # Calculate how many gems to take from this quadrant
            quadrant_target = min(MIN_GEMS_PER_QUADRANT, batch_size // 4)
            
            # Get gems from cells in this quadrant
            quad_gems = []
            cells_with_gems = [c for c in quad_cells if remaining_gems.get(c) and len(remaining_gems[c]) > 0]
            
            # Sort cells by number of remaining gems (descending)
            cells_with_gems.sort(key=lambda c: len(remaining_gems[c]), reverse=True)
            
            # Take gems from each cell
            gems_needed = quadrant_target
            for cell in cells_with_gems:
                cell_gems_available = len(remaining_gems[cell])
                if cell_gems_available == 0:
                    continue
                
                # Take either all available gems or what we need, whichever is less
                take_count = min(gems_needed, cell_gems_available)
                selected = remaining_gems[cell][:take_count]
                remaining_gems[cell] = remaining_gems[cell][take_count:]
                
                quad_gems.extend(selected)
                gems_needed -= take_count
                
                if gems_needed <= 0:
                    break
            
            # Add gems from this quadrant to the batch
            batch.extend(quad_gems)
        
        # Fill the rest of the batch with whatever gems are available
        remaining_needed = batch_size - len(batch)
        if remaining_needed > 0:
            # Collect all remaining gems
            all_remaining = []
            for i, gems_list in remaining_gems.items():
                all_remaining.extend(gems_list)
                remaining_gems[i] = []
            
            # Shuffle for randomness
            random.shuffle(all_remaining)
            
            # Take what we need
            take_count = min(remaining_needed, len(all_remaining))
            batch.extend(all_remaining[:take_count])
            
            # Put the rest back into "unassigned" pool
            remaining_gems[-1] = all_remaining[take_count:]
        
        if batch:  # Only add non-empty batches
            batches.append(batch)
    
    # Print batch statistics
    print(f"Created {len(batches)} batches")
    for i, batch in enumerate(batches):
        print(f"Batch {i+1}: {len(batch)} gems")
    
    return batches

def load_existing_reviews():
    """Load existing reviews from all batch files and the main reviews file."""
    all_reviews = {}
    
    # Create output directory if it doesn't exist
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Load from batch files
    batch_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith('reviews_batch_') and f.endswith('.json')]
    for batch_file in batch_files:
        try:
            with open(os.path.join(OUTPUT_DIR, batch_file), 'r') as f:
                batch_reviews = json.load(f)
                all_reviews.update(batch_reviews)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Error reading batch file {batch_file}: {e}")
    
    # Load from final output file if it exists
    if os.path.exists(FINAL_OUTPUT_PATH):
        try:
            with open(FINAL_OUTPUT_PATH, 'r') as f:
                final_reviews = json.load(f)
                all_reviews.update(final_reviews)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Error reading final reviews file: {e}")
    
    return all_reviews

def save_batch_reviews(batch_num, reviews):
    """Save a batch of reviews to a file."""
    batch_file = os.path.join(OUTPUT_DIR, f'reviews_batch_{batch_num:03d}.json')
    with open(batch_file, 'w') as f:
        json.dump(reviews, f, indent=2)
    print(f"Saved batch {batch_num} reviews to {batch_file}")

def update_main_reviews_file():
    """Combine all batch files into the main reviews file."""
    all_reviews = load_existing_reviews()
    
    with open(FINAL_OUTPUT_PATH, 'w') as f:
        json.dump(all_reviews, f, indent=2)
    
    print(f"Updated main reviews file with {len(all_reviews)} total reviews")
    return all_reviews

def generate_review(gem):
    """Generate a review for a single gem."""
    try:
        response = requests.post(
            REVIEWS_API_ENDPOINT,
            json=gem,
            headers={"Content-Type": "application/json"},
            timeout=30  # 30 second timeout
        )
        response.raise_for_status()
        result = response.json()
        return result.get("review", "No review available")
    except requests.exceptions.RequestException as e:
        print(f"Error generating review for gem {gem.get('id', 'unknown')}: {e}")
        # Return a fallback review
        return f"This location has unique features and is worth exploring."

def process_batch(batch_num, batch, existing_reviews):
    """Process a batch of gems, generating reviews for each."""
    batch_reviews = {}
    batch_start_time = time.time()
    
    print(f"\nProcessing Batch {batch_num} with {len(batch)} gems")
    
    for gem in tqdm(batch, desc=f"Batch {batch_num}"):
        gem_id = gem.get('id')
        if not gem_id:
            print(f"Skipping gem without ID: {gem.get('name', 'Unknown')}")
            continue
        
        # Skip if already have a review
        if gem_id in existing_reviews:
            batch_reviews[gem_id] = existing_reviews[gem_id]
            continue
        
        # Generate review
        review = generate_review(gem)
        batch_reviews[gem_id] = review
        
        # Add a small delay
        time.sleep(RATE_LIMIT_DELAY)
    
    batch_time = time.time() - batch_start_time
    print(f"Batch {batch_num} completed in {batch_time:.1f} seconds")
    
    # Save this batch
    save_batch_reviews(batch_num, batch_reviews)
    
    # Update the main reviews file
    update_main_reviews_file()
    
    return batch_reviews

def main():
    parser = argparse.ArgumentParser(description="Generate reviews for gems in batches")
    parser.add_argument("--max-batches", type=int, default=None, 
                        help="Maximum number of batches to process (default: all)")
    parser.add_argument("--start-batch", type=int, default=1,
                        help="Batch number to start with (default: 1)")
    args = parser.parse_args()
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Load all gems
    try:
        with open(GEM_DATA_PATH, 'r') as f:
            all_gems = json.load(f)
        print(f"Loaded {len(all_gems)} gems from {GEM_DATA_PATH}")
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error loading gems file: {e}")
        return
    
    # Load existing reviews
    existing_reviews = load_existing_reviews()
    print(f"Loaded {len(existing_reviews)} existing reviews")
    
    # Create batches with balanced geographical distribution
    batches = create_balanced_batches(all_gems, GEMS_PER_BATCH)
    
    # Process only the specified number of batches if requested
    max_batches = args.max_batches or len(batches)
    start_batch = max(1, min(args.start_batch, len(batches)))
    end_batch = min(start_batch + max_batches - 1, len(batches))
    
    # Report plan
    print(f"\nWill process batches {start_batch} to {end_batch} ({end_batch - start_batch + 1} batches)")
    
    # Initialize stats
    total_start = time.time()
    processed_gems = 0
    
    # Process each batch
    for batch_idx in range(start_batch - 1, end_batch):
        batch_num = batch_idx + 1
        batch = batches[batch_idx]
        
        print(f"\nProcessing batch {batch_num}/{len(batches)}")
        batch_reviews = process_batch(batch_num, batch, existing_reviews)
        
        # Update existing reviews
        existing_reviews.update(batch_reviews)
        processed_gems += len(batch)
        
        # Calculate and display stats
        elapsed = time.time() - total_start
        avg_time_per_gem = elapsed / processed_gems if processed_gems > 0 else 0
        remaining_batches = end_batch - batch_num
        remaining_gems = sum(len(batches[i]) for i in range(batch_idx + 1, end_batch))
        estimated_time_remaining = avg_time_per_gem * remaining_gems
        
        print(f"\nProgress: {processed_gems} gems processed")
        print(f"Average time per gem: {avg_time_per_gem:.2f} seconds")
        print(f"Estimated time remaining: {estimated_time_remaining/60:.1f} minutes")
    
    # Final update to main reviews file
    final_reviews = update_main_reviews_file()
    
    # Display final stats
    total_time = time.time() - total_start
    print(f"\nReview generation complete!")
    print(f"Processed {processed_gems} gems in {len(batches)} batches")
    print(f"Total time: {total_time/60:.1f} minutes")
    print(f"Average time per review: {total_time/processed_gems:.2f} seconds if {processed_gems} > 0 else 'N/A'")
    print(f"Final reviews file: {FINAL_OUTPUT_PATH} with {len(final_reviews)} reviews")

if __name__ == "__main__":
    main()