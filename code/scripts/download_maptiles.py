import math, os, random, requests, time
from concurrent.futures import ThreadPoolExecutor
from tqdm import tqdm


# bbox full extent for northern california region
min_lat = 36.44
min_lon = -124.41
max_lat = 41.76
max_lon = -117.96

api_key = "hbvo5fWE9HuC6JUHKB9q"


def deg2num(lat_deg, lon_deg, zoom):
    """Convert latitude, longitude to tile coordinates"""
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)

def download_tile(args):
    """Download a single tile"""
    x, y, z, style, api_key, output_dir, delay, debug = args
    
    # Construct the MapTiler URL - MapTiler uses different URL formats depending on the map type
    # Basic format: https://api.maptiler.com/maps/{style}/tiles/{z}/{x}/{y}.png?key={api_key}
    # Satellite format: https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key={api_key}
    
    if style == "satellite":
        url = f"https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key={api_key}"
    else:
        url = f"https://api.maptiler.com/maps/{style}/tiles/{z}/{x}/{y}.png?key={api_key}"
    
    # For first tile only in debug mode, print full URL for verification
    if debug and x == 0 and y == 0:
        print(f"DEBUG: Sample URL: {url.replace(api_key, 'API_KEY_HIDDEN')}")
    
    # Create directory structure if it doesn't exist
    try:
        # Determine file extension based on style
        ext = "jpg" if style == "satellite" else "png"
        tile_dir = os.path.join(output_dir, str(z), str(x))
        os.makedirs(tile_dir, exist_ok=True)
        tile_path = os.path.join(tile_dir, f"{y}.{ext}")
    except OSError as e:
        return f"Error creating directories: {e}"
    
    # Skip if the tile already exists
    if os.path.exists(tile_path):
        return f"Skipped existing tile: {z}/{x}/{y}"
    
    # Add a small random delay to avoid hitting rate limits
    if delay > 0:
        # Add slight randomization to avoid synchronized requests
        time.sleep(delay * (0.8 + 0.4 * random.random()))
    
    # Download the tile with exponential backoff for rate limits
    max_retries = 5
    retry_delay = 1.0
    
    for attempt in range(max_retries):
        try:
            # Add user agent to avoid blocking
            headers = {
                'User-Agent': 'MapTilerDownloader/1.0',
                'Referer': 'https://www.maptiler.com/'
            }
            
            response = requests.get(url, timeout=10, headers=headers)
            
            # For first request in debug mode, print response details
            if debug and attempt == 0 and x == 0 and y == 0:
                print(f"DEBUG: Response status: {response.status_code}")
                print(f"DEBUG: Response headers: {response.headers}")
                if response.status_code != 200:
                    print(f"DEBUG: Response content: {response.text[:200]}")
            
            if response.status_code == 200:
                # Verify we got actual image data (not an error page)
                content_type = response.headers.get('Content-Type', '')
                if not ('image/png' in content_type or 'image/jpeg' in content_type):
                    if debug and x == 0 and y == 0:
                        print(f"DEBUG: Unexpected content type: {content_type}")
                        print(f"DEBUG: Content preview: {response.content[:50]}")
                    return f"Failed to download tile: {z}/{x}/{y} (Wrong content type: {content_type})"
                
                # Save the tile
                try:
                    with open(tile_path, 'wb') as f:
                        f.write(response.content)
                    return f"Downloaded tile: {z}/{x}/{y}"
                except OSError as e:
                    return f"Error saving tile: {z}/{x}/{y} (IO Error: {str(e)})"
                    
            elif response.status_code == 401 or response.status_code == 403:
                # Authentication failure - no point retrying
                err_msg = f"API key error: {response.status_code}"
                if debug:
                    err_msg += f" - {response.text[:200]}"
                return err_msg
                
            elif response.status_code == 429:  # Too Many Requests
                retry_delay *= 2  # Exponential backoff
                time.sleep(retry_delay)
                continue
                
            elif response.status_code == 404:
                # Tile doesn't exist - might be outside the map bounds
                return f"Tile not found: {z}/{x}/{y}"
                
            else:
                err_msg = f"Failed to download tile: {z}/{x}/{y} (Status code: {response.status_code})"
                if debug:
                    err_msg += f" - {response.text[:200]}"
                return err_msg
                
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                retry_delay *= 2
                time.sleep(retry_delay)
            else:
                return f"Network error: {z}/{x}/{y} (Error: {str(e)})"
        except Exception as e:
            return f"Unexpected error: {z}/{x}/{y} (Error: {str(e)})"

def download_tiles(
    north_lat,
    south_lat,
    west_lon,
    east_lon,
    min_zoom,
    max_zoom,
    style,
    api_key,
    output_dir="tiles",
    max_workers=3,
    request_delay=0.2,
    zoom_batch_size=None,
    debug=True,
    validate_api_key=True
):
    """Download all tiles within a bounding box for a range of zoom levels"""
    
    # Create the output directory if it doesn't exist
    try:
        os.makedirs(output_dir, exist_ok=True)
    except OSError as e:
        print(f"Error creating output directory: {e}")
        print(f"Please check your permissions or specify a different output directory.")
        return
    
    # Track API usage statistics
    download_stats = {
        "requested": 0,
        "downloaded": 0,
        "skipped": 0,
        "failed": 0,
        "failure_reasons": {}
    }
    
    # Validate API key if requested
    if validate_api_key:
        print("Validating API key...")
        # Test URL - just requesting metadata
        test_url = f"https://api.maptiler.com/maps/{style}/metadata.json?key={api_key}"
 
        try:
            response = requests.get(test_url, timeout=10)
            if response.status_code == 200:
                print("✓ API key validation successful")
            else:
                print(f"✗ API key validation failed: Status code {response.status_code}")
                if debug:
                    print(f"Response: {response.text[:200]}...")
                print("Please check your API key and try again.")
                if "Plan limit reached" in response.text:
                    print("It appears you've reached your plan limits. Check your MapTiler dashboard.")
                return
        except Exception as e:
            print(f"✗ API key validation error: {e}")
            print("Please check your internet connection and try again.")
            return
    
    # Process zoom levels one at a time or in batches
    zoom_levels = list(range(min_zoom, max_zoom + 1))
    
    if zoom_batch_size:
        zoom_batches = [zoom_levels[i:i+zoom_batch_size] for i in range(0, len(zoom_levels), zoom_batch_size)]
    else:
        zoom_batches = [zoom_levels]
    
    for batch_idx, zoom_batch in enumerate(zoom_batches):
        print(f"\nProcessing zoom batch {batch_idx+1}/{len(zoom_batches)}: {zoom_batch}")
        
        # Prepare all tile download tasks for this zoom batch
        tasks = []
        
        for zoom in zoom_batch:
            # Get tile coordinates for the bounding box
            north_west_tile = deg2num(north_lat, west_lon, zoom)
            south_east_tile = deg2num(south_lat, east_lon, zoom)
            
            # Ensure correct order
            min_x, max_x = min(north_west_tile[0], south_east_tile[0]), max(north_west_tile[0], south_east_tile[0])
            min_y, max_y = min(north_west_tile[1], south_east_tile[1]), max(north_west_tile[1], south_east_tile[1])
            
            # Calculate number of tiles for this zoom level
            num_tiles = (max_x - min_x + 1) * (max_y - min_y + 1)
            print(f"Zoom level {zoom}: {num_tiles} tiles to download")
            download_stats["requested"] += num_tiles
            
            # Add download tasks
            for x in range(min_x, max_x + 1):
                for y in range(min_y, max_y + 1):
                    tasks.append((x, y, zoom, style, api_key, output_dir, request_delay, debug))
        
        # Shuffle tasks to distribute load across the map area
        random.shuffle(tasks)
        
        # Download all tiles using thread pool
        total_tiles = len(tasks)
        print(f"Batch total: {total_tiles} tiles to download")
        
        # Set up threading - allow serial processing with max_workers=1
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            results = list(tqdm(executor.map(download_tile, tasks), total=total_tiles))
            
            # Update statistics and collect error types
            for result in results:
                if "Downloaded" in result:
                    download_stats["downloaded"] += 1
                elif "Skipped" in result:
                    download_stats["skipped"] += 1
                else:
                    download_stats["failed"] += 1
                    
                    # Categorize errors for better debugging
                    error_type = "Unknown"
                    if "API key error" in result:
                        error_type = "API Key"
                    elif "Tile not found" in result:
                        error_type = "Tile Not Found"
                    elif "Network error" in result:
                        error_type = "Network"
                    elif "Error saving tile" in result:
                        error_type = "File System"
                    elif "Error creating directories" in result:
                        error_type = "File System"
                    elif "Wrong content type" in result:
                        error_type = "Content Type"
                    elif "Status code: 429" in result:
                        error_type = "Rate Limited"
                    elif "Status code:" in result:
                        error_type = "HTTP Error"
                    
                    if error_type not in download_stats["failure_reasons"]:
                        download_stats["failure_reasons"][error_type] = 0
                    download_stats["failure_reasons"][error_type] += 1
        
        print("\nBatch statistics:")
        print(f"  Downloaded: {download_stats['downloaded']}")
        print(f"  Skipped: {download_stats['skipped']}")
        print(f"  Failed: {download_stats['failed']}")
        
        # If there were failures, show the breakdown
        if download_stats["failed"] > 0 and download_stats["failure_reasons"]:
            print("\nFailure reasons:")
            for reason, count in download_stats["failure_reasons"].items():
                print(f"  {reason}: {count}")
            
            # If debugging is on and we have sample errors, show them
            if debug and batch_idx == 0:
                # Find a sample error of each type to display
                error_samples = {}
                for result in results:
                    if "Downloaded" not in result and "Skipped" not in result:
                        for reason in download_stats["failure_reasons"].keys():
                            if reason in result and reason not in error_samples:
                                error_samples[reason] = result
                
                if error_samples:
                    print("\nSample errors:")
                    for reason, sample in error_samples.items():
                        print(f"  {reason}: {sample}")
        
        # Add a pause between zoom batches to let API cool down
        if batch_idx < len(zoom_batches) - 1:
            pause_time = 10
            print(f"\nPausing for {pause_time} seconds before next batch...")
            time.sleep(pause_time)


if __name__ == "__main__":

    # Example for Northern California region (You'll provide your exact coordinates)
    download_tiles(
        north_lat=max_lat,
        south_lat=min_lat,
        west_lon=min_lon,
        east_lon=max_lon,
        min_zoom=6,
        max_zoom=6,
        style='basic-v2',
        api_key=api_key,
        max_workers=4,
        request_delay=1  # seconds
    )