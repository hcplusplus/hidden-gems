#!/usr/bin/env python3
"""
Chain Filter Module for Hidden Gems

This module provides functions to filter out chain establishments and franchises,
which don't qualify as "hidden gems" by definition.
"""

import re

# Comprehensive list of popular chains and franchises to exclude
CHAIN_ESTABLISHMENTS = {
    # Coffee Chains
    "coffee_chains": [
        "Starbucks", "Peet's Coffee", "Coffee Bean & Tea Leaf", "Dunkin'", "Dunkin Donuts",
        "Dutch Bros", "Philz Coffee", "Blue Bottle Coffee", "Intelligentsia", "Verve Coffee",
        "Costa Coffee", "Caribou Coffee", "Tim Hortons", "McCafe", "McDonalds", "McDonald's"
    ],
    
    # Fast Food Chains
    "fast_food_chains": [
        "McDonald's", "Burger King", "Wendy's", "In-N-Out", "Five Guys", "Jack in the Box",
        "Carl's Jr", "Carls Jr", "Hardee's", "Taco Bell", "Chipotle", "Del Taco", "Qdoba",
        "KFC", "Popeyes", "Chick-fil-A", "Subway", "Jimmy John's", "Jersey Mike's",
        "Panera Bread", "Panda Express", "Arby's", "Sonic Drive-In", "Whataburger",
        "Shake Shack", "White Castle", "Wingstop", "Little Caesars", "Domino's",
        "Pizza Hut", "Papa John's", "Round Table Pizza", "Sbarro", "Jamba Juice",
        "Smoothie King", "Dairy Queen", "Cold Stone Creamery", "Baskin-Robbins",
        "Auntie Anne's", "Cinnabon", "Wetzel's Pretzels", "El Pollo Loco", "Wienerschnitzel",
        "Rally's", "Checkers", "Church's Chicken", "Long John Silver's", "A&W"
    ],
    
    # Casual Dining Chains
    "casual_dining_chains": [
        "Applebee's", "Chili's", "TGI Fridays", "Olive Garden", "Red Lobster",
        "Outback Steakhouse", "Cheesecake Factory", "P.F. Chang's", "BJ's Restaurant",
        "Buffalo Wild Wings", "Yard House", "California Pizza Kitchen", "Denny's",
        "IHOP", "Waffle House", "Cracker Barrel", "Bob Evans", "Red Robin",
        "Bonefish Grill", "Ruby Tuesday", "Uno Pizzeria & Grill", "Dave & Buster's",
        "Hard Rock Cafe", "Rainforest Cafe", "Hooters", "Claim Jumper", "Mimi's Cafe",
        "Black Angus", "Sizzler", "Golden Corral", "Marie Callender's", "Sweet Tomatoes",
        "Souplantation", "Hometown Buffet", "Old Spaghetti Factory", "Romano's Macaroni Grill",
        "Maggiano's Little Italy", "Carrabba's Italian Grill", "Buca di Beppo", "Benihana",
        "Joe's Crab Shack", "Texas Roadhouse", "LongHorn Steakhouse", "Chili's", "Applebee's",
        "Chevy's", "Chevy's Fresh Mex", "Bubba Gump Shrimp Co.", "Ruth's Chris Steak House",
        "Morton's Steakhouse", "Chart House", "Lucille's BBQ", "Famous Dave's", "Claim Jumper",
        "Black Bear Diner", "Coco's Bakery", "Chuck E. Cheese", "Round Table", "BJ's"
    ],
    
    # Quick Service/Fast Casual Chains
    "fast_casual_chains": [
        "Chipotle", "Qdoba", "Panera Bread", "Panda Express", "Noodles & Company",
        "Shake Shack", "Sweetgreen", "Tender Greens", "Rubio's", "The Habit Burger Grill",
        "Firehouse Subs", "Jason's Deli", "McAlister's Deli", "Corner Bakery", "Au Bon Pain",
        "Veggie Grill", "Mendocino Farms", "Blaze Pizza", "MOD Pizza", "Pieology",
        "Which Wich", "Potbelly Sandwich Shop", "Newk's Eatery", "Zoup!", "Café Zupas",
        "Freddy's Frozen Custard & Steakburgers", "Smashburger", "MOOYAH", "Culver's",
        "Portillo's", "Raising Cane's", "El Pollo Loco", "Baja Fresh", "Wahoo's Fish Taco",
        "Rubio's Coastal Grill", "Taco Cabana", "Moe's Southwest Grill", "Tijuana Flats",
        "Freebirds World Burrito", "Fazoli's", "Nando's Peri-Peri", "Zaxby's", "Waba Grill",
        "Yoshinoya", "Noah's Bagels", "Einstein Bros. Bagels", "Bruegger's Bagels",
        "Krispy Kreme", "Dunkin'", "The Coffee Bean & Tea Leaf", "Pret A Manger",
        "Jamba Juice", "Smoothie King", "Tropical Smoothie Cafe", "Robeks"
    ],
    
    # Retail Chains (that often have cafes or food courts)
    "retail_chains": [
        "Walmart", "Target", "Costco", "Sam's Club", "IKEA", "Barnes & Noble",
        "Bass Pro Shops", "Cabela's", "Cracker Barrel", "Whole Foods Market",
        "Trader Joe's", "Safeway", "Vons", "Albertsons", "Kroger", "Ralph's",
        "Food 4 Less", "Ralphs", "Aldi", "Sprouts Farmers Market", "Gelson's",
        "Bristol Farms", "Raley's", "Save Mart", "Lucky", "Nob Hill Foods",
        "WinCo Foods", "Smart & Final", "Grocery Outlet", "99 Ranch Market",
        "H Mart", "Mitsuwa Marketplace", "Nijiya Market", "Marukai Market"
    ],
    
    # Dessert and Ice Cream Chains
    "dessert_chains": [
        "Baskin-Robbins", "Cold Stone Creamery", "Dairy Queen", "Ben & Jerry's",
        "Haagen-Dazs", "Yogurtland", "Pinkberry", "Menchie's", "Sweet Frog",
        "Tutti Frutti", "Dunkin'", "Krispy Kreme", "Cinnabon", "Auntie Anne's",
        "Wetzel's Pretzels", "Mrs. Fields", "Nothing Bundt Cakes", "Edible Arrangements",
        "Crumbl Cookies", "Insomnia Cookies", "See's Candies", "Godiva", "Rocky Mountain Chocolate Factory",
        "Ghirardelli Chocolate", "It's Sugar", "Mallow Mallow", "Somi Somi", "Salt & Straw",
        "Boba Guys", "Kung Fu Tea", "Gong Cha", "T4", "Quickly", "Happy Lemon", "Ding Tea",
        "Sharetea", "CoCo Fresh Tea & Juice", "Tastea", "85°C Bakery Cafe", "Paris Baguette",
        "Tous les Jours", "Beard Papa's", "Jamba Juice", "Orange Julius", "Tropical Smoothie Cafe",
        "Smoothie King", "Nekter Juice Bar", "Juice It Up!", "Planet Smoothie", "Robeks"
    ],
    
    # California-Specific Regional Chains
    "california_chains": [
        "In-N-Out Burger", "Fatburger", "Tommy's", "Original Tommy's", "Umami Burger",
        "Super Duper Burgers", "The Counter", "Boudin Bakery", "La Boulangerie",
        "Specialty's Café & Bakery", "Urth Caffé", "Le Pain Quotidien", "Lemonade",
        "Ike's Love & Sandwiches", "Erik's DeliCafe", "Noah's Bagels", "Togo's",
        "Habit Burger", "Zankou Chicken", "Claim Jumper", "Black Angus", "El Torito",
        "Acapulco Restaurant", "Chevys Fresh Mex", "Rubio's Coastal Grill",
        "Baja Fresh", "Wahoo's Fish Taco", "Flame Broiler", "Waba Grill", "L&L Hawaiian BBQ",
        "Ono Hawaiian BBQ", "Yoshinoya", "Curry House", "Souplantation", "Sweet Tomatoes",
        "BJ's Restaurant & Brewhouse", "Lazy Dog Restaurant & Bar", "Eureka!",
        "Yard House", "Gordon Biersch", "Rock & Brews", "Lucille's Smokehouse BBQ",
        "Pieology", "Blaze Pizza", "Philz Coffee", "Blue Bottle Coffee", "Peet's Coffee",
        "Equator Coffees", "The Coffee Bean & Tea Leaf", "Pinkberry", "Yogurtland",
        "Pressed Juicery", "Jamba Juice", "Vitality Bowls", "Mendocino Farms",
        "Urban Plates", "Asian Box", "Veggie Grill", "Native Foods", "Tender Greens",
        "Sweetgreen", "Mixt", "The Plant Cafe", "Amy's Drive Thru", "Mary's Pizza Shack"
    ],
    
    # Gas Station Convenience Stores
    "gas_stations": [
        "7-Eleven", "ampm", "ARCO", "Chevron", "Circle K", "Shell", "Mobil", "Exxon",
        "Valero", "Texaco", "Speedway", "Casey's", "Wawa", "Sheetz", "QuikTrip",
        "RaceTrac", "Kum & Go", "Pilot", "Flying J", "Love's", "Kwik Trip", "Kwik Star",
        "GetGo", "Maverik", "Sinclair", "Phillips 66", "76", "Sunoco", "BP",
        "Citgo", "Marathon", "Cumberland Farms", "Holiday", "Thorntons"
    ],
    
    # Drug Store Chains
    "drug_stores": [
        "CVS", "Walgreens", "Rite Aid", "Duane Reade", "Bartell Drugs"
    ]
}

# Flatten the chains list for easier checking
ALL_CHAINS = []
for category in CHAIN_ESTABLISHMENTS.values():
    ALL_CHAINS.extend(category)

# Remove duplicates and sort
ALL_CHAINS = sorted(set(ALL_CHAINS))

def is_chain_establishment(name):
    """
    Check if a place name matches a known chain or franchise.
    
    Parameters:
    -----------
    name: str
        The name of the place to check
        
    Returns:
    --------
    bool: True if the place is a chain establishment, False otherwise
    """
    if not name:
        return False
    
    # Normalize name for comparison
    normalized_name = name.lower().strip()
    
    # Direct match
    for chain in ALL_CHAINS:
        if chain.lower() == normalized_name:
            return True
        
        # Check if chain name is contained within place name
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(chain.lower()) + r'\b'
        if re.search(pattern, normalized_name):
            return True
    
    # Check for common chain indicators in the name
    chain_indicators = [
        r'\bfranchise\b', r'\bchain\b', r'\blocation\b', r'\bbranch\b',
        r'#\d+', r'\bstore #', r'\blocation #'
    ]
    
    for indicator in chain_indicators:
        if re.search(indicator, normalized_name):
            return True
    
    return False

def is_unnamed_place(name):
    """
    Check if a place has no name or a generic "Unnamed X" name.
    
    Parameters:
    -----------
    name: str
        The name of the place to check
        
    Returns:
    --------
    bool: True if the place is unnamed, False otherwise
    """
    if not name:
        return True
    
    normalized_name = name.lower().strip()
    
    # Check for 'unnamed' prefix
    if normalized_name.startswith('unnamed'):
        return True
    
    # Check for other generic names
    generic_patterns = [
        r'^unknown\b', r'^no name\b', r'^unlabeled\b', r'^untitled\b',
        r'^generic\b', r'^nameless\b'
    ]
    
    for pattern in generic_patterns:
        if re.search(pattern, normalized_name):
            return True
    
    return False

def filter_place(place):
    """
    Check if a place should be filtered out (chain or unnamed).
    
    Parameters:
    -----------
    place: dict
        The place data dictionary
        
    Returns:
    --------
    filter_result: dict
        Dictionary with filter decision and reason
    """
    name = place.get('name', '')
    
    if is_unnamed_place(name):
        return {'filter': True, 'reason': 'unnamed_place'}
    
    if is_chain_establishment(name):
        return {'filter': True, 'reason': 'chain_establishment'}
    
    return {'filter': False, 'reason': None}

def get_chain_categories():
    """
    Get a dictionary of all chain categories and their establishments.
    
    Returns:
    --------
    dict: Chain categories and establishments
    """
    return CHAIN_ESTABLISHMENTS

def get_all_chains():
    """
    Get a sorted list of all chain establishments.
    
    Returns:
    --------
    list: All chain establishments
    """
    return ALL_CHAINS