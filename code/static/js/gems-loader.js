/**
 * gems-loader.js
 * Handles loading and filtering gem data from JSON with card integration
 */

// Ensure HiddenGems namespace exists
window.HiddenGems = window.HiddenGems || {};

// Create gems loader namespace
window.HiddenGems.loadGems = loadGems;

// Load gems with options
function loadGems(options = {}) {
  // Show loading animation
  window.HiddenGems.utils.showLoading('Finding gems...');
  
  // Get constants from main.js
  const DEFAULT_CENTER = window.HiddenGems.constants.DEFAULT_CENTER;
  const DEFAULT_RADIUS = window.HiddenGems.constants.DEFAULT_RADIUS;
  const DEFAULT_LIMIT = window.HiddenGems.constants.DEFAULT_LIMIT;
  const DATA_PATH = window.HiddenGems.constants.DATA_PATH;
  
  // Merge options with defaults
  const defaultOptions = {
    center: DEFAULT_CENTER,
    radius: DEFAULT_RADIUS,
    limit: DEFAULT_LIMIT,
    random: true
  };
  
  options = { ...defaultOptions, ...options };
  
  // First try to load from user-added gems in localStorage
  const userGems = JSON.parse(localStorage.getItem('userGems') || '[]');
  
  // Then load from the JSON file
  fetch(DATA_PATH)
    .then(response => response.json())
    .then(jsonGems => {
      // Combine user gems with JSON gems
      const allGems = [...jsonGems, ...userGems];
      
      // Process the gems based on options
      const processedGems = processGems(allGems, options);
      
      // Store gems in the HiddenGems namespace
      window.HiddenGems.data.loadGems(processedGems);
      
      // Render the gems on the map using the function from map-controller.js
      if (window.renderGems) {
        window.renderGems(processedGems);
      }
      
      // Hide loading animation
      window.HiddenGems.utils.hideLoading();
    })
    .catch(error => {
      console.error('Error loading gems:', error);
      
      // Fallback to just user gems if available
      if (userGems.length > 0) {
        const processedGems = processGems(userGems, options);
        
        // Store gems in the HiddenGems namespace
        window.HiddenGems.data.loadGems(processedGems);
        
        if (window.renderGems) {
          window.renderGems(processedGems);
        }
      }
      
      // Hide loading animation
      window.HiddenGems.utils.hideLoading();
    });
}

// Process gems based on provided options
function processGems(gems, options) {
  // Filter gems by distance from center if specified
  let filteredGems = gems;
  
  if (options.center) {
    filteredGems = gems.filter(gem => {
      const coords = gem.coords || gem.coordinates;
      if (!coords || coords.length !== 2) return false;
      
      // Calculate distance from center using utility function
      const distance = window.HiddenGems.utils.calculateDistance(
        options.center[1], options.center[0],
        coords[1], coords[0]
      );
      
      // Add distance to gem object for display
      gem.distance = Math.round(distance * 10) / 10;
      
      // Include if within radius
      return distance <= options.radius;
    });
  }
  
  // Add an ID if missing (needed for cards)
  filteredGems = filteredGems.map((gem, index) => {
    if (!gem.id) {
      gem.id = `gem-${index}`;
    }
    return gem;
  });
  
  // Randomize if requested
  if (options.random) {
    filteredGems = window.HiddenGems.utils.shuffleArray(filteredGems);
  }
  
  // Limit the number of gems
  if (options.limit && options.limit > 0) {
    filteredGems = filteredGems.slice(0, options.limit);
  }
  
  return filteredGems;
}

// Function for shuffling gems (used by nav-wheel)
function shuffleGems() {
  // Show loading animation
  window.HiddenGems.utils.showLoading('Shuffling gems...');
  
  // Load new random gems
  loadGems({
    limit: window.HiddenGems.constants.DEFAULT_LIMIT,
    random: true
  });
}

// Function for finding nearby gems (used by nav-wheel)
function findNearbyGems() {
  // Show loading animation
  window.HiddenGems.utils.showLoading('Finding nearby gems...');
  
  // Try to get the user's location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        const userLocation = [position.coords.longitude, position.coords.latitude];
        loadGems({
          center: userLocation,
          radius: window.HiddenGems.constants.DEFAULT_RADIUS,
          limit: window.HiddenGems.constants.DEFAULT_LIMIT
        });
      },
      // Error callback
      (error) => {
        console.error('Geolocation error:', error);
        // Fall back to default location (Berkeley)
        loadGems({
          center: window.HiddenGems.constants.DEFAULT_CENTER,
          radius: window.HiddenGems.constants.DEFAULT_RADIUS,
          limit: window.HiddenGems.constants.DEFAULT_LIMIT
        });
      }
    );
  } else {
    // Geolocation not supported, fallback to default
    loadGems({
      center: window.HiddenGems.constants.DEFAULT_CENTER,
      radius: window.HiddenGems.constants.DEFAULT_RADIUS,
      limit: window.HiddenGems.constants.DEFAULT_LIMIT
    });
  }
}

// Make functions available globally

window.loadGems = loadGems;
window.shuffleGems = shuffleGems;
window.findNearbyGems = findNearbyGems;