#!/usr/bin/env python3
"""
Content Generator Module for Hidden Gems

This module provides functions to generate descriptions, reviews, addresses,
opening hours, and other content for hidden gems.
"""

import random

def generate_category_text(category):
    """
    Generate a readable category text.
    
    Parameters:
    -----------
    category: str
        The raw category
        
    Returns:
    --------
    str: A readable category text
    """
    category_mapping = {
        'nature': 'Nature & Outdoors',
        'natural': 'Nature & Outdoors',
        'food': 'Food & Drink',
        'historic': 'Historical Site',
        'leisure': 'Recreation',
        'amenity': 'Local Amenity',
        'scenic': 'Scenic Views',
        'tourism': 'Tourism Spot'
    }
    
    return category_mapping.get(category, 'Hidden Gem')

def generate_secondary_category():
    """
    Generate a secondary category for variety.
    
    Returns:
    --------
    str: A secondary category description
    """
    possible_categories = [
        'Local favorite', 
        'Off the beaten path',
        'Hidden gem', 
        'Nature escape',
        'Outdoor adventure', 
        'Historical site', 
        'Family-friendly',
        'Peaceful retreat',
        'Scenic viewpoint',
        'Cultural experience',
        'Photography spot',
        'Unique find'
    ]
    return random.choice(possible_categories)

def generate_description(place):
    """
    Generate a compelling description for a place.
    
    Parameters:
    -----------
    place: dict
        The place data
        
    Returns:
    --------
    str: A description for the place
    """
    category = place.get('category', '')
    subcategory = place.get('subcategory', '')
    
    # Format subcategory for display
    if subcategory:
        subcategory = subcategory.replace('_', ' ').title()
    
    # Description templates by category
    description_templates = {
        'nature': [
            "A serene natural escape away from tourist crowds",
            "Experience untouched nature in this hidden {subcategory}",
            "A peaceful natural retreat with stunning views",
            "Discover this lesser-known {subcategory} perfect for nature lovers",
            "A local nature secret that offers tranquility and beauty"
        ],
        'food': [
            "Authentic local cuisine in a charming setting off the tourist path",
            "A culinary gem where locals enjoy {subcategory} without the crowds",
            "Savor delicious food in this hidden spot known mainly to locals",
            "Experience genuine Northern California flavors in this unassuming {subcategory}",
            "A foodie's hidden treasure with character and authentic taste"
        ],
        'historic': [
            "Explore this fascinating piece of history overlooked by most visitors",
            "Step back in time at this hidden historic {subcategory}",
            "A historical treasure with rich stories and few tourists",
            "Discover forgotten history in this overlooked {subcategory}",
            "Experience the past in this atmospheric historical site"
        ],
        'leisure': [
            "Relax and unwind at this local favorite recreation spot",
            "A peaceful {subcategory} where you can escape the tourist crowds",
            "Enjoy leisure activities in this tranquil setting",
            "A hidden recreational gem frequented by locals",
            "Experience authentic local culture at this laid-back spot"
        ],
        'scenic': [
            "Breathtaking views without the typical tourist crowds",
            "A spectacular vista point that remains a local secret",
            "Capture amazing photos at this hidden viewpoint",
            "Enjoy panoramic scenery in peaceful solitude",
            "A stunning lookout spot off the beaten tourist path"
        ],
        'amenity': [
            "A local establishment with unique character and charm",
            "Experience authentic Northern California at this hidden {subcategory}",
            "A gem of a {subcategory} that tourists rarely discover",
            "Enjoy this local favorite away from typical tourist routes",
            "A charming spot where you can experience local culture"
        ]
    }
    
    # Select template based on category
    templates = description_templates.get(category, description_templates['scenic'])
    template = random.choice(templates)
    
    # Fill in the template
    if '{subcategory}' in template and subcategory:
        return template.replace('{subcategory}', subcategory)
    else:
        return template.replace('{subcategory}', 'spot')

def generate_address(place, california_cities=None):
    """
    Generate a plausible address for the place.
    
    Parameters:
    -----------
    place: dict
        The place data
    california_cities: dict, optional
        Dictionary of California cities and their coordinates
        
    Returns:
    --------
    str: An address for the place
    """
    tags = place.get('tags', {})
    
    # Try to use actual address data if available
    address_parts = []
    
    if 'addr:housenumber' in tags and 'addr:street' in tags:
        address_parts.append(f"{tags['addr:housenumber']} {tags['addr:street']}")
    elif 'addr:street' in tags:
        # Generate a plausible house number
        house_number = random.randint(1, 9999)
        address_parts.append(f"{house_number} {tags['addr:street']}")
    
    if 'addr:city' in tags:
        address_parts.append(tags['addr:city'])
    elif 'is_in:city' in tags:
        address_parts.append(tags['is_in:city'])
    elif california_cities:
        # Find the nearest city based on coordinates
        coords = place.get('coordinates', [0, 0])
        
        # For simplicity, just pick a random city
        # In a real implementation, you'd calculate distances
        city = random.choice(list(california_cities.keys()))
        address_parts.append(city)
    
    # Add state
    if 'addr:state' in tags:
        address_parts.append(tags['addr:state'])
    else:
        address_parts.append('CA')
    
    # Add ZIP code
    if 'addr:postcode' in tags:
        address_parts.append(tags['addr:postcode'])
    elif len(address_parts) > 1:  # If we have at least a city
        # Generate a plausible ZIP code for Northern California
        zip_code = random.randint(94000, 96000)
        address_parts.append(str(zip_code))
    
    # If we have enough parts to make a reasonable address
    if len(address_parts) >= 3:
        return ', '.join(address_parts)
    
    # If we don't have enough address parts, generate a more generic location description
    name = place.get('name', '')
    category = place.get('category', '')
    if name and not name.startswith('Unnamed'):
        if category == 'nature':
            return f"Near {name}, Northern California"
        else:
            return f"{name}, Northern California"
    else:
        # Truly generic address
        return "Northern California"

def get_california_cities():
    """
    Return a dictionary of major Northern California cities and their coordinates.
    
    Returns:
    --------
    dict: Cities and their coordinates
    """
    return {
        "San Francisco": [-122.4194, 37.7749],
        "Oakland": [-122.2711, 37.8044],
        "San Jose": [-121.8853, 37.3382],
        "Sacramento": [-121.4944, 38.5816],
        "Berkeley": [-122.2730, 37.8715],
        "Santa Rosa": [-122.7141, 38.4404],
        "Napa": [-122.2856, 38.2975],
        "Stockton": [-121.2908, 37.9577],
        "Modesto": [-121.0000, 37.6391],
        "Redding": [-122.3917, 40.5865],
        "Chico": [-121.8374, 39.7285],
        "Eureka": [-124.1636, 40.8021],
        "Santa Cruz": [-122.0308, 36.9741],
        "South Lake Tahoe": [-119.9984, 38.9399],
        "Fort Bragg": [-123.8053, 39.4457],
        "Auburn": [-121.0768, 38.8966],
        "Truckee": [-120.1832, 39.3280],
        "Placerville": [-120.7983, 38.7296],
        "Ukiah": [-123.2078, 39.1502],
        "Monterey": [-121.8916, 36.6002]
    }

def generate_cost(place):
    """
    Generate a cost indicator based on the type of place.
    
    Parameters:
    -----------
    place: dict
        The place data
        
    Returns:
    --------
    str: A cost indicator ($, $$, or $$$)
    """
    category = place.get('category', '')
    tags = place.get('tags', {})
    
    # Free locations
    if category in ['nature', 'scenic'] or any(tag in tags.values() for tag in ['park', 'beach', 'viewpoint', 'nature_reserve']):
        return "$"
    
    # Potentially costly places
    if category == 'food' or any(tag in tags.values() for tag in ['restaurant', 'cafe', 'pub', 'bar']):
        return random.choice(["$$", "$$$"])
    
    # Museums, attractions, etc.
    if category == 'historic' or any(tag in tags.values() for tag in ['museum', 'gallery', 'theme_park']):
        return random.choice(["$", "$$"])
    
    # Default for other types
    return random.choice(["$", "$$"])

def generate_opening_hours(place):
    """
    Generate plausible opening hours based on the type of place.
    
    Parameters:
    -----------
    place: dict
        The place data
        
    Returns:
    --------
    str: Opening hours for the place
    """
    tags = place.get('tags', {})
    category = place.get('category', '')
    
    # If OSM data has opening hours, use those
    if 'opening_hours' in tags:
        return format_osm_hours(tags['opening_hours'])
    
    # Natural places are typically open during daylight
    if category in ['nature', 'scenic'] or any(tag in tags.values() for tag in ['park', 'beach', 'nature_reserve']):
        return "Sunrise to Sunset"
    
    # Restaurants and cafes
    if category == 'food' or any(tag in tags.values() for tag in ['restaurant', 'cafe']):
        return random.choice([
            "11:00 AM - 10:00 PM",
            "8:00 AM - 9:00 PM",
            "10:00 AM - 8:00 PM"
        ])
    
    # Museums and attractions
    if category == 'historic' or any(tag in tags.values() for tag in ['museum', 'gallery']):
        return random.choice([
            "10:00 AM - 5:00 PM, Closed Mondays",
            "9:00 AM - 4:00 PM, Tuesday to Sunday",
            "11:00 AM - 6:00 PM, Wednesday to Monday"
        ])
    
    # Default for other types
    return random.choice([
        "9:00 AM - 5:00 PM",
        "8:00 AM - 6:00 PM",
        "10:00 AM - 4:00 PM"
    ])

def format_osm_hours(osm_hours):
    """
    Format OSM opening_hours tag to a more readable format.
    
    Parameters:
    -----------
    osm_hours: str
        The raw OSM opening_hours tag
        
    Returns:
    --------
    str: Formatted opening hours
    """
    # OSM format can be complex, this is a simplified conversion
    # For simplicity, we'll just pass through some common formats
    # and convert others to a more readable version
    
    # Simple cases with typical formats
    if ";" in osm_hours:
        parts = osm_hours.split(";")
        return ", ".join(parts)
    
    # Convert 24-hour time to 12-hour time
    try:
        # Simple case like "08:00-17:00"
        if "-" in osm_hours and ":" in osm_hours:
            times = osm_hours.split("-")
            if len(times) == 2 and ":" in times[0] and ":" in times[1]:
                start = times[0].strip()
                end = times[1].strip()
                
                # Convert to 12-hour format
                start_hour, start_min = map(int, start.split(":"))
                end_hour, end_min = map(int, end.split(":"))
                
                start_ampm = "AM" if start_hour < 12 else "PM"
                end_ampm = "AM" if end_hour < 12 else "PM"
                
                start_hour = start_hour if start_hour <= 12 else start_hour - 12
                start_hour = 12 if start_hour == 0 else start_hour
                
                end_hour = end_hour if end_hour <= 12 else end_hour - 12
                end_hour = 12 if end_hour == 0 else end_hour
                
                return f"{start_hour}:{start_min:02d} {start_ampm} - {end_hour}:{end_min:02d} {end_ampm}"
    except:
        pass
    
    # If we can't parse it nicely, just return the original
    return osm_hours

def generate_time_estimate(place):
    """
    Generate an estimated time to spend at the location.
    
    Parameters:
    -----------
    place: dict
        The place data
        
    Returns:
    --------
    int: Estimated time in minutes
    """
    category = place.get('category', '')
    tags = place.get('tags', {})
    
    # Time ranges by type of place (in minutes)
    time_ranges = {
        'nature_short': (30, 60),      # Quick nature stops
        'nature_long': (90, 180),      # Longer nature experiences
        'food': (60, 120),             # Eating experiences
        'historic_quick': (30, 60),    # Quick historical sites
        'historic_long': (60, 120),    # Museums, etc.
        'leisure': (60, 120),          # General leisure activities
        'default': (30, 90)            # Default for other types
    }
    
    # Determine the appropriate time range
    if category == 'nature':
        subcats = ['peak', 'forest', 'wood', 'water', 'waterfall']
        has_long_natural = any(subcat in tags.values() for subcat in subcats)
        if has_long_natural:
            time_range = time_ranges['nature_long']
        else:
            time_range = time_ranges['nature_short']
    elif category == 'food':
        time_range = time_ranges['food']
    elif category == 'historic':
        subcats = ['museum', 'ruins', 'archaeological_site', 'castle']
        has_long_historic = any(subcat in tags.values() for subcat in subcats)
        if has_long_historic:
            time_range = time_ranges['historic_long']
        else:
            time_range = time_ranges['historic_quick']
    elif category == 'leisure':
        time_range = time_ranges['leisure']
    else:
        time_range = time_ranges['default']
    
    # Generate a random time within the range
    minutes = random.randint(time_range[0], time_range[1])
    
    # Return just the number in minutes
    return minutes

def determine_rarity(place):
    """
    Determine how hidden/rare a place is.
    
    Parameters:
    -----------
    place: dict
        The place data
        
    Returns:
    --------
    tuple: (rarity_level, color)
    """
    # Use popularity score if available
    if 'popularity_score' in place:
        score = place['popularity_score']
        if score is None or score < 10:
            return 'most hidden', 'red'
        elif score < 25:
            return 'moderately hidden', 'purple'
        else:
            return 'least hidden', 'blue'
    
    # If no popularity score, use a heuristic
    tags = place.get('tags', {})
    
    # Check if it has common amenities that would make it less hidden
    common_amenities = ['parking', 'toilets', 'information', 'restaurant', 'cafe']
    has_amenities = any(amenity in tags.values() for amenity in common_amenities)
    
    if has_amenities:
        return 'least hidden', 'blue'
    
    # Default to moderately hidden
    return 'moderately hidden', 'purple'

def format_place_to_schema(place, include_generated_content=True):
    """
    Format a place to match the Hidden Gems schema.
    
    Parameters:
    -----------
    place: dict
        The raw place data
    include_generated_content: bool
        Whether to include generated content or just required fields
        
    Returns:
    --------
    dict: Place formatted to the Hidden Gems schema
    """
    # Ensure place has required fields
    if not place or 'coordinates' not in place or 'name' not in place:
        return None
    
    # Get basic fields from the place
    gem = {
        'id': place.get('id', str(random.randint(10000, 99999))),
        'name': place.get('name', ''),
        'coordinates': place.get('coordinates', [0, 0]),
        'category': place.get('category', 'scenic')
    }
    
    # Add generated content if requested
    if include_generated_content:
        # Determine rarity and color
        rarity, color = determine_rarity(place)
        
        # Get California cities for address generation
        california_cities = get_california_cities()
        
        # Add generated fields
        gem.update({
            'address': place.get('address', generate_address(place, california_cities)),
            'opening_hours': place.get('opening_hours', generate_opening_hours(place)),
            'dollar_sign': place.get('dollar_sign', generate_cost(place)),
            'category_1': generate_category_text(gem['category']),
            'category_2': place.get('category_2', generate_secondary_category()),
            'description': place.get('description', generate_description(place)),
            'rarity': rarity,
            'color': color,
            'time': place.get('time', generate_time_estimate(place))
        })
    
    return gem