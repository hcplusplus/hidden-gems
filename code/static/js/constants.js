/**
 * constants.js
 * Central location for all Hidden Gems application constants
 */

// Ensure the namespace exists
window.HiddenGems = window.HiddenGems || {};

// Define application-wide constants in one place
window.HiddenGems.constants = {

    // API settings
    NETWORK_API: ' http://192.168.7.168:5000', // Placeholder for actual API URL

    // Location settings
    // Default location (Berkeley, CA)
    DEFAULT_CENTER: [-122.2730, 37.8715],
    DEFAULT_ORIGIN: [-122.2714, 37.8705],
    DEFAULT_DESTINATION: [-121.4944, 38.5816],
    
    // Default map zoom level
    DEFAULT_ZOOM: 11,

    // Search settings (ALL IN KILOMETERS)
    DEFAULT_RADIUS: 8, // 8 km 
    DEFAULT_BUFFER: 30, // 30 km deviation from route
    DEFAULT_LIMIT: 10, // number of gems to sample
    MIN_GEMS: 5,
    MAX_ATTEMPTS: 3,

    // JSON data path
    DATA_PATH: 'static/assets/data/hidden_gems.json',

    // Icon paths
    ICON_PATHS: {
        red: "static/icons/gem-red.svg",
        purple: "static/icons/gem-purple.svg",
        blue: "static/icons/gem-blue.svg"
    },

    // Category emoji mapping
    CATEGORY_EMOJI: {
        'nature': '🌲',
        'food': '🍽️',
        'cultural': '🏛️',
        'viewpoint': '🌄',
        'hidden-beach': '🏖️',
        'historic-site': '🏛️',
        'local-eatery': '🍽️',
        'natural-wonder': '🌲',
        'secret-trail': '🥾',
        'winery': '🍷',
        'coffee-shop': '☕'
    },

    // Swipe settings
    SWIPE_THRESHOLD: 80
};

// Unit conversion helpers (added to the constants namespace)
window.HiddenGems.units = {
    // Convert kilometers to miles
    kmToMiles: function(km) {
        return km * 0.621371;
    },
    
    // Convert miles to kilometers
    milesToKm: function(miles) {
        return miles * 1.60934;
    },
    
    // Format distance with appropriate unit
    formatDistance: function(distance, inKm = true) {
        if (inKm) {
            // Input is in kilometers
            if (distance < 1) {
                // Show in meters if less than 1 km
                return `${Math.round(distance * 1000)} m`;
            } else {
                // Show in kilometers with 1 decimal place
                return `${distance.toFixed(1)} km`;
            }
        } else {
            // Input is in miles
            if (distance < 0.1) {
                // Show in feet if less than 0.1 miles
                return `${Math.round(distance * 5280)} ft`;
            } else {
                // Show in miles with 1 decimal place
                return `${distance.toFixed(1)} mi`;
            }
        }
    },
    
    // Get user's preferred unit system based on locale
    // This can be used to display distances in the user's preferred unit
    getUserPreferredUnit: function() {
        // List of countries using imperial system (miles)
        const imperialCountries = ['US', 'GB', 'LR', 'MM'];
        
        try {
            // Try to get user's country from navigator
            const userLocale = navigator.language || 'en-US';
            const userCountry = userLocale.split('-')[1] || 'US';
            
            return imperialCountries.includes(userCountry) ? 'imperial' : 'metric';
        } catch (e) {
            // Default to metric if can't determine
            return 'metric';
        }
    },
    
    // Display distance in user's preferred unit
    displayDistance: function(distanceInKm) {
        const userUnit = this.getUserPreferredUnit();
        
        if (userUnit === 'imperial') {
            // Convert to miles for users in countries using imperial
            const miles = this.kmToMiles(distanceInKm);
            return this.formatDistance(miles, false);
        } else {
            // Keep as kilometers for everyone else
            return this.formatDistance(distanceInKm, true);
        }
    }
};