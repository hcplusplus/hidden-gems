/**
 * delayed-initialization.js
 * Handles delayed initialization of app components after user interaction with welcome overlay
 */

// Ensure HiddenGems namespace exists
window.HiddenGems = window.HiddenGems || {};

// Flag to track initialization status
window.HiddenGems.initialized = false;

// Listen for the initialization event
document.addEventListener('initializeApp', function(event) {
    // Prevent double initialization
    if (window.HiddenGems.initialized) return;
    
    console.log('Initializing app components after user interaction');
    const detail = event.detail || {};
    const useGeolocation = detail.useGeolocation || false;
    const coordinates = detail.coordinates || window.HiddenGems.constants.DEFAULT_CENTER;
    
    // Show loading indicator
    if (window.HiddenGems && window.HiddenGems.utils) {
        window.HiddenGems.utils.showLoading('Initializing map...');
    }
    
    // Initialize map if not already initialized
    initializeMapAndData(useGeolocation, coordinates);
    
    // Mark as initialized
    window.HiddenGems.initialized = true;
});

/**
 * Initialize map and load data
 * @param {boolean} useGeolocation - Whether to use geolocation
 * @param {Array} coordinates - Coordinates to center map on [lng, lat]
 */
function initializeMapAndData(useGeolocation, coordinates) {
    // 1. Initialize the map
    if (window.map) {
        console.log('Map already initialized, reconfiguring');
        // Just reconfigure the existing map
        window.map.setCenter(coordinates);
        window.map.easeTo({
            center: coordinates,
            zoom: 12,
            duration: 1000
        });
    } else if (typeof window.initializeMap === 'function') {
        console.log('Initializing map with coordinates', coordinates);
        window.initializeMap();
        
        // Wait for map to be ready
        const checkMapInterval = setInterval(() => {
            if (window.map) {
                clearInterval(checkMapInterval);
                window.map.setCenter(coordinates);
                
                // Add "You are here" marker if using geolocation
                if (useGeolocation && typeof window.addYouAreHereMarker === 'function') {
                    window.addYouAreHereMarker(coordinates);
                }
            }
        }, 100);
    }
    
    // 2. Load the gem data
    loadGemData(coordinates);
}

/**
 * Load gem data and render on map
 * @param {Array} coordinates - Center coordinates [lng, lat]
 */
function loadGemData(coordinates) {
    console.log('Loading gem data near coordinates', coordinates);
    
    // Check if we have the data controller available
    if (window.HiddenGems && window.HiddenGems.data) {
        // Use data controller's findGemsNearUser
        if (typeof window.HiddenGems.data.findGemsNearUser === 'function') {
            console.log('Using data controller to find gems');
            
            // Load all gems data first
            fetch('static/assets/data/hidden_gems.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load gems data: ${response.status}`);
                    }
                    return response.json();
                })
                .then(allGems => {
                    console.log(`Loaded ${allGems.length} gems from data file`);
                    
                    // Find gems near coordinates
                    return window.HiddenGems.data.findGemsNearUser(
                        allGems, coordinates, 20, 10 // 20km radius, max 10 gems
                    );
                })
                .then(shuffledGems => {
                    console.log(`Found and shuffled ${shuffledGems.length} gems near location`);
                    
                    // Initialize cards with the shuffled gems
                    const indexCards = document.querySelector('gem-cards[variant="index"]');
                    if (indexCards) {
                        indexCards.setGems(shuffledGems);
                    }
                    
                    // Update map markers
                    if (window.renderGems && typeof window.renderGems === 'function') {
                        window.renderGems(shuffledGems);
                    }
                    
                    // Hide loading
                    if (window.HiddenGems && window.HiddenGems.utils) {
                        window.HiddenGems.utils.hideLoading();
                    }
                })
                .catch(error => {
                    console.error('Error finding nearby gems:', error);
                    
                    // Fallback to original method
                    if (window.HiddenGems.data.findNearbyGems) {
                        window.HiddenGems.data.findNearbyGems();
                    }
                    
                    // Hide loading
                    if (window.HiddenGems && window.HiddenGems.utils) {
                        window.HiddenGems.utils.hideLoading();
                    }
                });
        } else {
            // Fallback to legacy loading methods
            console.log('Using legacy method to load gems');
            if (typeof window.loadAdaptiveGems === 'function') {
                window.loadAdaptiveGems(coordinates);
            } else if (typeof window.renderGems === 'function' && window.HiddenGems.constants && window.HiddenGems.constants.DATA_PATH) {
                // Simplest fallback - just fetch and render gems
                fetch(window.HiddenGems.constants.DATA_PATH)
                    .then(response => response.json())
                    .then(gems => {
                        window.renderGems(gems);
                        
                        // Hide loading
                        if (window.HiddenGems && window.HiddenGems.utils) {
                            window.HiddenGems.utils.hideLoading();
                        }
                    })
                    .catch(error => {
                        console.error('Error loading gems:', error);
                        
                        // Hide loading
                        if (window.HiddenGems && window.HiddenGems.utils) {
                            window.HiddenGems.utils.hideLoading();
                        }
                    });
            }
        }
    } else {
        // Very basic fallback
        console.warn('No data controller available, using basic gem loading');
        
        if (typeof window.renderGems === 'function') {
            fetch('static/assets/data/hidden_gems.json')
                .then(response => response.json())
                .then(gems => {
                    window.renderGems(gems);
                    
                    // Hide loading
                    if (window.HiddenGems && window.HiddenGems.utils) {
                        window.HiddenGems.utils.hideLoading();
                    }
                })
                .catch(error => {
                    console.error('Error loading gems:', error);
                    
                    // Hide loading
                    if (window.HiddenGems && window.HiddenGems.utils) {
                        window.HiddenGems.utils.hideLoading();
                    }
                });
        }
    }
    
    // Initialize any other components that need to start after user interaction
    initializeRemainingComponents();
}

/**
 * Initialize remaining components
 */
function initializeRemainingComponents() {
    // Initialize nav wheel if present
    const navWheel = document.querySelector('nav-wheel');
    if (navWheel && typeof navWheel._initializeNavItems === 'function') {
        console.log('Initializing nav wheel');
        navWheel._initializeNavItems();
        navWheel._positionNavItems();
    }
    
    // Initialize preferences if function exists
    if (typeof initializePreferences === 'function') {
        console.log('Initializing preferences');
        initializePreferences();
    }
    
    // Dispatch ready event for any other components
    document.dispatchEvent(new CustomEvent('appReady', {
        bubbles: true
    }));
}

/**
 * Helper function to check if user already has granted location permission
 * @returns {boolean} True if location permission has been granted
 */
function hasLocationPermission() {
    return localStorage.getItem('locationPermissionGranted') === 'true';
}

/**
 * Helper function to get stored coordinates
 * @returns {Array|null} Coordinates [lng, lat] or null if not found
 */
function getStoredCoordinates() {
    const userCoordsString = localStorage.getItem('userCoords');
    if (userCoordsString) {
        try {
            return JSON.parse(userCoordsString);
        } catch (e) {
            console.warn('Error parsing stored coordinates:', e);
        }
    }
    return null;
}

/**
 * Initialize app directly if welcome screen should be skipped
 * For use in other pages that don't show the welcome screen
 */
function initializeAppDirectly() {
    // Check if we have stored coordinates
    const storedCoords = getStoredCoordinates();
    
    if (storedCoords) {
        console.log('Initializing app with stored coordinates', storedCoords);
        document.dispatchEvent(new CustomEvent('initializeApp', { 
            detail: { 
                useGeolocation: hasLocationPermission(),
                coordinates: storedCoords
            }
        }));
    } else {
        // Use default Berkeley coordinates
        const berkeleyCoords = [-122.2714, 37.8705];
        console.log('Initializing app with default coordinates', berkeleyCoords);
        document.dispatchEvent(new CustomEvent('initializeApp', { 
            detail: { 
                useGeolocation: false,
                coordinates: berkeleyCoords
            }
        }));
    }
}

// Make initializeAppDirectly available globally
window.initializeAppDirectly = initializeAppDirectly;