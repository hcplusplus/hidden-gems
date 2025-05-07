# geocoder.py
import requests
import time

def geocode_place(place_name, region="us"):
    """
    Geocode a place name to coordinates using Nominatim API
    
    Parameters:
    -----------
    place_name: str
        Name of the place to geocode
    region: str
        Country code to limit search
        
    Returns:
    --------
    tuple: (longitude, latitude) or None if not found
    """
    # Use Nominatim API (OpenStreetMap)
    base_url = "https://nominatim.openstreetmap.org/search"
    
    # Add northern California bounding box to improve accuracy
    # Coordinates: (north of San Jose, south of Crescent City, west of Bishop, south of Truckee)
    bbox = "37.336962631031504,-124.1095344585807,41.74746217345373,-118.28222302824624"
    
    params = {
        "q": place_name,
        "format": "json",
        "countrycodes": region,
        "limit": 1,
        "viewbox": bbox,
        "bounded": 1  # Prefer results within the viewbox
    }
    
    headers = {
        "User-Agent": "NorCalHiddenGems/1.0"  # Required by Nominatim
    }
    
    try:
        response = requests.get(base_url, params=params, headers=headers)
        response.raise_for_status()
        
        results = response.json()
        
        if not results:
            print(f"No geocoding results found for: {place_name}")
            return None
        
        # Get first result
        result = results[0]
        
        # Extract coordinates
        lon = float(result['lon'])
        lat = float(result['lat'])
        
        print(f"Geocoded {place_name} to {lon}, {lat}")
        
        # Be nice to the API and respect rate limits
        time.sleep(1)
        
        return (lon, lat)
        
    except Exception as e:
        print(f"Error geocoding {place_name}: {e}")
        return None