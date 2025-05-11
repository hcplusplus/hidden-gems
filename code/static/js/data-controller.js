/**
 * data-controller.js
 * Unified data management system for Northern California Hidden Gems
 * Handles all data loading, manipulation, shuffling, and persistence
 */

// Ensure the namespace exists
window.HiddenGems = window.HiddenGems || {};

// Create the data controller object
window.HiddenGems.data = {
  // Core data state
  gems: [],
  gemsLoaded: false,
  initialized: false,
  
  /**
   * Initialize the data controller
   */
  initialize: function() {
    if (this.initialized) {
      console.log('Data controller already initialized');
      return;
    }
    
    console.log('Initializing HiddenGems data controller');
    this.initialized = true;
    
    // Set up event listeners
    document.addEventListener('gemsLoaded', (event) => {
      if (event.detail && event.detail.gems) {
        this.gems = event.detail.gems;
        this.gemsLoaded = true;
      }
    });
    
    // Check for stored gems on initialization
    this.checkStoredGems();
  },
  
  /**
   * Load gems with various options
   * @param {Object} options - Loading options
   * @returns {Promise} Promise that resolves with loaded gems
   */
  loadGems: function(options = {}) {
    // Show loading animation
    this.showLoading('Loading gems...');
    
    // Default settings
    const defaultOptions = {
      limit: 10,
      random: true
    };
    
    options = { ...defaultOptions, ...options };
    
    return new Promise((resolve, reject) => {
      // First try to load from user-added gems in localStorage
      const userGems = JSON.parse(localStorage.getItem('userGems') || '[]');
      
      // Then load from the JSON file
      fetch('static/assets/data/hidden_gems.json')
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load gems data: ${response.status}`);
          }
          return response.json();
        })
        .then(jsonGems => {
          // Combine user gems with JSON gems
          const allGems = [...jsonGems, ...userGems];
          
          // Filter gems by distance from center if specified
          let filteredGems = allGems;
          
          if (options.center) {
            filteredGems = allGems.filter(gem => {
              const coords = gem.coords || gem.coordinates;
              if (!coords || coords.length !== 2) return false;
              
              // Calculate distance from center
              const distance = this.utils.calculateDistance(
                options.center[1], options.center[0],
                coords[1], coords[0]
              );
              
              // Add distance to gem object for display
              gem.distance = Math.round(distance * 10) / 10;
              
              // Include if within radius
              return distance <= (options.radius || 30);
            });
          }
          
          // Add ID if missing
          filteredGems = filteredGems.map((gem, index) => {
            if (!gem.id) {
              gem.id = `gem-${index}`;
            }
            return gem;
          });
          
          // Randomize if requested
          if (options.random) {
            filteredGems = this.utils.shuffleArray(filteredGems);
          }
          
          // Limit the number of gems
          if (options.limit && options.limit > 0) {
            filteredGems = filteredGems.slice(0, options.limit);
          }
          
          // Save to storage
          this.saveGems(filteredGems);
          
          // Dispatch event
          document.dispatchEvent(new CustomEvent('gemsLoaded', {
            detail: { gems: filteredGems }
          }));
          
          // Hide loading
          this.hideLoading();
          
          resolve(filteredGems);
        })
        .catch(error => {
          console.error('Error loading gems:', error);
          this.hideLoading();
          
          // Show error message
          alert('Error loading gems. Please try again.');
          reject(error);
        });
    });
  },
  
  /**
   * Save gems to storage
   * @param {Array} gems - Gems to save
   */
  saveGems: function(gems) {
    if (!Array.isArray(gems)) return;
    
    // Save to instance
    this.gems = gems;
    this.gemsLoaded = true;
    
    // Save to localStorage
    localStorage.setItem('hiddenGems_gems', JSON.stringify(gems));
    
    // Save to sessionStorage for page transitions
    sessionStorage.setItem('gems', JSON.stringify(gems));
    sessionStorage.setItem('shuffledGems', JSON.stringify(gems));
  },
  
  /**
   * Get all stored gems
   * @returns {Array} Array of gems
   */
  getGems: function() {
    // Return from memory if available
    if (this.gems && this.gems.length > 0) {
      return this.gems;
    }
    
    // Try to get from storage
    return this.getFromStorage();
  },
  
  /**
   * Get a specific gem by ID
   * @param {string|number} gemId - ID of the gem to find
   * @returns {Object|null} The gem or null if not found
   */
  getGemById: function(gemId) {
    const gems = this.getGems();
    return gems.find(g => (g.id || g.index).toString() === gemId.toString()) || null;
  },
  
  /**
   * Check for stored gems and load if available
   */
  checkStoredGems: function() {
    const storedGems = this.getFromStorage();
    
    if (storedGems && storedGems.length > 0) {
      this.gems = storedGems;
      this.gemsLoaded = true;
      
      // Shuffle stored gems if they exist
      this.shuffleStoredGems();
    }
  },
  
  /**
   * Get gems from storage (localStorage or sessionStorage)
   */
  getFromStorage: function() {
    // Check sessionStorage first (for page transitions)
    const sessionSources = ['shuffledGems', 'gems', 'routeFilteredGems'];
    
    for (const source of sessionSources) {
      const storedGems = sessionStorage.getItem(source);
      if (storedGems) {
        try {
          const parsedGems = JSON.parse(storedGems);
          if (Array.isArray(parsedGems) && parsedGems.length > 0) {
            return parsedGems;
          }
        } catch (e) {
          console.warn(`Error parsing gems from ${source}:`, e);
        }
      }
    }
    
    // Fall back to localStorage
    const localGems = localStorage.getItem('hiddenGems_gems');
    if (localGems) {
      try {
        const parsedGems = JSON.parse(localGems);
        if (Array.isArray(parsedGems) && parsedGems.length > 0) {
          return parsedGems;
        }
      } catch (e) {
        console.warn('Error parsing gems from localStorage:', e);
      }
    }
    
    return [];
  },
  
  /**
   * Show loading indicator
   * @param {string} message - Message to display
   */
  showLoading: function(message) {
    if (window.HiddenGems && window.HiddenGems.utils && window.HiddenGems.utils.showLoading) {
      return window.HiddenGems.utils.showLoading(message);
    }
    
    // Fallback if utils not available
    let loadingEl = document.getElementById('gems-loading');
    
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.id = 'gems-loading';
      loadingEl.style.position = 'fixed';
      loadingEl.style.top = '50%';
      loadingEl.style.left = '50%';
      loadingEl.style.transform = 'translate(-50%, -50%)';
      loadingEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      loadingEl.style.color = 'white';
      loadingEl.style.padding = '15px 20px';
      loadingEl.style.borderRadius = '5px';
      loadingEl.style.zIndex = '2000';
      
      document.body.appendChild(loadingEl);
    }
    
    loadingEl.innerHTML = message;
    loadingEl.style.display = 'block';
    
    return loadingEl;
  },
  
  /**
   * Hide loading indicator
   */
  hideLoading: function() {
    if (window.HiddenGems && window.HiddenGems.utils && window.HiddenGems.utils.hideLoading) {
      window.HiddenGems.utils.hideLoading();
      return;
    }
    
    // Fallback if utils not available
    const loadingEl = document.getElementById('gems-loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  },
  
  /**
   * Find nearby gems based on geolocation
   * @returns {Promise} Promise that resolves with found gems
   */
  findNearbyGems: function() {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        this.showLoading('Finding your location...');
        
        navigator.geolocation.getCurrentPosition(
          // Success callback
          (position) => {
            const userLocation = [position.coords.longitude, position.coords.latitude];
            
            this.loadGems({
              center: userLocation,
              radius: 10,
              limit: 10,
              random: true
            }).then(resolve).catch(reject);
          },
          // Error callback
          (error) => {
            console.error('Geolocation error:', error);
            
            // Use default location
            this.loadGems({
              random: true
            }).then(resolve).catch(reject);
          },
          // Options
          {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 60000
          }
        );
      } else {
        // Geolocation not supported
        this.loadGems({
          random: true
        }).then(resolve).catch(reject);
      }
    });
  },
  
  /**
   * Shuffle stored gems
   */
  shuffleStoredGems: function() {
    // Check if we've already shuffled the gems
    if (sessionStorage.getItem('shuffledGems') || !this.gems || this.gems.length === 0) {
      return;
    }
    
    // Shuffle the gems
    const shuffledGems = this.utils.shuffleArray([...this.gems]);
    
    // Store the shuffled gems
    this.saveGems(shuffledGems);
    
    console.log(`Shuffled ${shuffledGems.length} gems`);
  },
  
  /**
   * Find and shuffle gems near a location
   * @param {Array} allGems - All available gems
   * @param {Array} centerCoords - Center coordinates [lng, lat]
   * @param {number} radiusKm - Radius in kilometers
   * @param {number} maxGems - Maximum number of gems to return
   * @returns {Array} Filtered and shuffled gems
   */
  findGemsNearLocation: function(allGems, centerCoords, radiusKm = 20, maxGems = 20) {
    if (!Array.isArray(allGems) || !centerCoords || centerCoords.length !== 2) {
      console.error('Invalid parameters for finding gems near location');
      return [];
    }
    
    console.log(`Finding and shuffling gems near [${centerCoords}] with radius ${radiusKm}km`);
    
    // Filter gems within radius
    const nearbyGems = allGems.filter(gem => {
      const coords = gem.coordinates || gem.coords;
      if (!coords || coords.length !== 2) return false;
      
      // Calculate distance from center
      const distance = this.utils.calculateDistance(
        coords[1], coords[0],
        centerCoords[1], centerCoords[0]
      );
      
      // Save distance to gem for sorting
      gem.distanceFromCenter = distance;
      
      // Return true if within radius
      return distance <= radiusKm;
    });
    
    console.log(`Found ${nearbyGems.length} gems within ${radiusKm}km`);
    
    // Sort by distance from center
    nearbyGems.sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);
    
    // Take the closest maxGems
    const closestGems = nearbyGems.slice(0, maxGems);
    
    // Shuffle the closest gems
    const shuffledGems = this.utils.shuffleArray([...closestGems]);
    
    // Save the gems
    this.saveGems(shuffledGems);
    
    return shuffledGems;
  },
  
  /**
   * Get user's current location and find nearby gems
   * @param {Array} allGems - All available gems
   * @param {Array} fallbackCoords - Fallback coordinates if location unavailable
   * @param {number} radiusKm - Radius in kilometers
   * @param {number} maxGems - Maximum number of gems to return
   * @returns {Promise} Promise that resolves to filtered and shuffled gems
   */
  findGemsNearUser: function(allGems, fallbackCoords, radiusKm = 20, maxGems = 20) {
    return new Promise((resolve, reject) => {
      this.showLoading('Finding your location...');
      
      // Try to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          // Success callback
          (position) => {
            const userCoords = [position.coords.longitude, position.coords.latitude];
            console.log(`User location: [${userCoords}]`);
            
            // Store user location
            sessionStorage.setItem('userLocation', JSON.stringify(userCoords));
            
            // Hide loading since we'll show another when loading gems
            this.hideLoading();
            
            // Find and shuffle gems near user
            const shuffledGems = this.findGemsNearLocation(
              allGems, userCoords, radiusKm, maxGems
            );
            
            resolve(shuffledGems);
          },
          // Error callback
          (error) => {
            console.warn(`Geolocation error (${error.code}): ${error.message}`);
            console.log(`Using fallback location: [${fallbackCoords}]`);
            
            // Hide loading
            this.hideLoading();
            
            // Find and shuffle gems near fallback location
            const shuffledGems = this.findGemsNearLocation(
              allGems, fallbackCoords, radiusKm, maxGems
            );
            
            resolve(shuffledGems);
          },
          // Options
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 0
          }
        );
      } else {
        // Geolocation not supported
        console.warn('Geolocation not supported by this browser');
        console.log(`Using fallback location: [${fallbackCoords}]`);
        
        // Hide loading
        this.hideLoading();
        
        // Find and shuffle gems near fallback location
        const shuffledGems = this.findGemsNearLocation(
          allGems, fallbackCoords, radiusKm, maxGems
        );
        
        resolve(shuffledGems);
      }
    });
  },
  
  /**
   * Filter and shuffle gems along a route
   * @param {Array} allGems - All available gems
   * @param {Array} originCoords - Origin coordinates [lng, lat]
   * @param {Array} destinationCoords - Destination coordinates [lng, lat]
   * @param {number} bufferDistanceKm - Buffer distance in kilometers
   * @returns {Array} Filtered and shuffled gems
   */
  filterGemsAlongRoute: function(allGems, originCoords, destinationCoords, bufferDistanceKm = 30) {
    if (!Array.isArray(allGems) || !originCoords || !destinationCoords) {
      console.error('Invalid parameters for filtering gems along route');
      return [];
    }
    
    console.log(`Filtering and shuffling ${allGems.length} gems along route`);
    
    // Create a buffer around the route
    const buffer = this.createRouteBuffer(originCoords, destinationCoords, bufferDistanceKm);
    
    // Filter gems that are within the route buffer
    const filteredGems = allGems.filter(gem => {
      const coords = gem.coordinates || gem.coords;
      if (!coords || coords.length !== 2) return false;
      
      // Check if gem is within the buffer polygon
      if (this.isPointInPolygon(coords, buffer.bufferPoints)) {
        return true;
      }
      
      // If not in polygon, check if it's close to the route
      const distanceToRoute = this.distanceToLineSegment(
        coords, originCoords, destinationCoords
      );
      
      return distanceToRoute <= bufferDistanceKm;
    });
    
    console.log(`Found ${filteredGems.length} gems along route`);
    
    // Shuffle the filtered gems
    const shuffledGems = this.utils.shuffleArray([...filteredGems]);
    
    // Store in sessionStorage
    sessionStorage.setItem('routeFilteredGems', JSON.stringify(shuffledGems));
    sessionStorage.setItem('shuffledGems', JSON.stringify(shuffledGems));
    
    // Save to instance
    this.saveGems(shuffledGems);
    
    return shuffledGems;
  },
  
  /**
   * Create a buffer around the direct line between origin and destination
   * @param {Array} origin - [lng, lat] coordinates of origin
   * @param {Array} destination - [lng, lat] coordinates of destination
   * @param {number} bufferDistanceKm - Buffer distance in kilometers
   * @return {Object} Object with buffer polygon and bounding box
   */
  createRouteBuffer: function(origin, destination, bufferDistanceKm = 30) {
    // Calculate route direction vector
    const dx = destination[0] - origin[0];
    const dy = destination[1] - origin[1];
    
    // Calculate route length
    const routeLength = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction vector
    const nx = dx / routeLength;
    const ny = dy / routeLength;
    
    // Calculate perpendicular vector
    const px = -ny;
    const py = nx;
    
    // Convert buffer distance from km to degrees (rough approximation)
    // 1 degree is approximately 111 km at the equator
    const bufferDistanceDeg = bufferDistanceKm / 111;
    
    // Calculate buffer points (rectangular buffer around the route line)
    const bufferPoints = [
      [
        origin[0] + px * bufferDistanceDeg,
        origin[1] + py * bufferDistanceDeg
      ],
      [
        destination[0] + px * bufferDistanceDeg,
        destination[1] + py * bufferDistanceDeg
      ],
      [
        destination[0] - px * bufferDistanceDeg,
        destination[1] - py * bufferDistanceDeg
      ],
      [
        origin[0] - px * bufferDistanceDeg,
        origin[1] - py * bufferDistanceDeg
      ]
    ];
    
    // Calculate bounding box of the buffer
    let minLng = Math.min(...bufferPoints.map(p => p[0]), origin[0], destination[0]);
    let minLat = Math.min(...bufferPoints.map(p => p[1]), origin[1], destination[1]);
    let maxLng = Math.max(...bufferPoints.map(p => p[0]), origin[0], destination[0]);
    let maxLat = Math.max(...bufferPoints.map(p => p[1]), origin[1], destination[1]);
    
    // Add a small padding to the bounding box
    const padding = 0.01; // About 1km
    minLng -= padding;
    minLat -= padding;
    maxLng += padding;
    maxLat += padding;
    
    return {
      bufferPoints: bufferPoints,
      boundingBox: [minLng, minLat, maxLng, maxLat] // [west, south, east, north]
    };
  },
  
  /**
   * Check if a point is within a polygon defined by an array of points
   * @param {Array} point - [lng, lat] coordinates of the point
   * @param {Array} polygon - Array of [lng, lat] coordinates forming a polygon
   * @return {boolean} True if the point is within the polygon
   */
  isPointInPolygon: function(point, polygon) {
    // Ray casting algorithm
    let inside = false;
    const x = point[0];
    const y = point[1];
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      
      const intersect = ((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  },
  
  /**
   * Calculate the distance from a point to a line segment
   * @param {Array} point - [lng, lat] coordinates of the point
   * @param {Array} lineStart - [lng, lat] coordinates of line segment start
   * @param {Array} lineEnd - [lng, lat] coordinates of line segment end
   * @return {number} Distance in kilometers
   */
  distanceToLineSegment: function(point, lineStart, lineEnd) {
    // Convert to Cartesian coordinates for simplicity
    // This is an approximation that works for small distances
    const p = [point[0], point[1]];
    const v = [lineStart[0], lineStart[1]];
    const w = [lineEnd[0], lineEnd[1]];
    
    // Calculate squared length of line segment
    const lengthSquared = Math.pow(w[0] - v[0], 2) + Math.pow(w[1] - v[1], 2);
    
    // If line segment is a point, return distance to that point
    if (lengthSquared === 0) return this.utils.calculateDistance(
      point[1], point[0], lineStart[1], lineStart[0]
    );
    
    // Calculate projection of point onto line segment
    const t = Math.max(0, Math.min(1, 
      ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / lengthSquared
    ));
    
    // Calculate closest point on line segment
    const projection = [
      v[0] + t * (w[0] - v[0]),
      v[1] + t * (w[1] - v[1])
    ];
    
    // Return distance to closest point
    return this.utils.calculateDistance(
      point[1], point[0], projection[1], projection[0]
    );
  },
  
  // Utility functions
  utils: {
    /**
     * Calculate distance between two points in miles
     * @param {number} lat1 - Latitude of first point
     * @param {number} lon1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lon2 - Longitude of second point
     * @returns {number} Distance in miles
     */
    calculateDistance: function(lat1, lon1, lat2, lon2) {
      // If we have access to the main utils function, use that
      if (window.HiddenGems && window.HiddenGems.utils && 
          typeof window.HiddenGems.utils.calculateDistance === 'function') {
        return window.HiddenGems.utils.calculateDistance(lat1, lon1, lat2, lon2);
      }
      
      // Otherwise use our own implementation
      const R = 3958.8; // Earth's radius in miles
      const dLat = this.toRadians(lat2 - lat1);
      const dLon = this.toRadians(lon2 - lon1);
      
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    },
    
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    toRadians: function(degrees) {
      return degrees * Math.PI / 180;
    },
    
    /**
     * Fisher-Yates shuffle algorithm
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffleArray: function(array) {
      // If we have access to the main utils function, use that
      if (window.HiddenGems && window.HiddenGems.utils && 
          typeof window.HiddenGems.utils.shuffleArray === 'function') {
        return window.HiddenGems.utils.shuffleArray(array);
      }
      
      // Otherwise use our own implementation
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    },
    
    /**
     * Validate coordinates
     * @param {number} lng - Longitude
     * @param {number} lat - Latitude
     * @returns {boolean} True if coordinates are valid
     */
    isValidCoordinate: function(lng, lat) {
      if (window.HiddenGems && window.HiddenGems.utils && 
          typeof window.HiddenGems.utils.isValidCoordinate === 'function') {
        return window.HiddenGems.utils.isValidCoordinate(lng, lat);
      }
      
      if (isNaN(lng) || isNaN(lat)) return false;
      if (lng < -180 || lng > 180) return false;
      if (lat < -90 || lat > 90) return false;
      return true;
    }
  },
  

  preferences: {
    save: function(data) {
      localStorage.setItem('hiddenGems_preferences', JSON.stringify(data));
    },
    
    get: function() {
      const savedPrefs = localStorage.getItem('hiddenGems_preferences');
      return savedPrefs ? JSON.parse(savedPrefs) : {
        activities: [],
        amenities: [],
        accessibility: [],
        effortLevel: '',
        detourTime: 60,
        maxDetour: 15,
        selectedGems: [],
        origin: null,
        destination: null
      };
    },
    
    // Update specific preference value
    update: function(key, value) {
      const prefs = this.get();
      prefs[key] = value;
      this.save(prefs);
      return prefs;
    }
  },
  
  // Selected gems management
  selectedGems: {
    add: function(gemId) {
      const prefs = window.HiddenGems.data.preferences.get();
      if (!prefs.selectedGems) prefs.selectedGems = [];
      if (!prefs.selectedGems.includes(gemId.toString())) {
        prefs.selectedGems.push(gemId.toString());
        window.HiddenGems.data.preferences.save(prefs);
        return true;
      }
      return false;
    },
    
    remove: function(gemId) {
      const prefs = window.HiddenGems.data.preferences.get();
      if (!prefs.selectedGems) return false;
      
      const index = prefs.selectedGems.indexOf(gemId.toString());
      if (index !== -1) {
        prefs.selectedGems.splice(index, 1);
        window.HiddenGems.data.preferences.save(prefs);
        return true;
      }
      return false;
    },
    
    toggle: function(gemId) {
      const prefs = window.HiddenGems.data.preferences.get();
      if (!prefs.selectedGems) prefs.selectedGems = [];
      
      const gemIdStr = gemId.toString();
      const index = prefs.selectedGems.indexOf(gemIdStr);
      
      if (index === -1) {
        // Add to selected gems
        prefs.selectedGems.push(gemIdStr);
        window.HiddenGems.data.preferences.save(prefs);
        return true; // Added
      } else {
        // Remove from selected gems
        prefs.selectedGems.splice(index, 1);
        window.HiddenGems.data.preferences.save(prefs);
        return false; // Removed
      }
    },
    
    isSelected: function(gemId) {
      const prefs = window.HiddenGems.data.preferences.get();
      return prefs.selectedGems && prefs.selectedGems.includes(gemId.toString());
    },
    
    getAll: function() {
      const prefs = window.HiddenGems.data.preferences.get();
      return prefs.selectedGems || [];
    },
    
    count: function() {
      return this.getAll().length;
    },
    
    clear: function() {
      const prefs = window.HiddenGems.data.preferences.save();
      prefs.selectedGems = [];
      window.HiddenGems.data.preferences.save(prefs);
    }
  },
  
  // Trip state tracking
  tripState: {
    save: function(state) {
      localStorage.setItem('hiddenGems_tripState', JSON.stringify(state));
    },
    
    get: function() {
      const savedState = localStorage.getItem('hiddenGems_tripState');
      return savedState ? JSON.parse(savedState) : {
        currentStep: 'browse', // browse, planning, traveling, arrived
        lastGemVisited: null,
        currentRoute: null,
        progress: 0, // 0-100 percentage of journey completed
        timeRemaining: null // Time remaining in minutes
      };
    },
    
    update: function(key, value) {
      const state = this.get();
      state[key] = value;
      this.save(state);
      return state;
    },
    
    setProgress: function(percent) {
      const state = this.get();
      state.progress = Math.min(100, Math.max(0, percent));
      this.save(state);
      return state;
    },
    
    advanceToNextGem: function() {
      // Logic to move to the next gem in the journey
      const state = this.get();
      const selected = window.HiddenGems.data.selectedGems.getAll().map(id => 
        window.HiddenGems.data.getGemById(id)
      ).filter(g => g !== null);
      
      if (selected.length === 0) return state;
      
      let nextIndex = 0;
      if (state.lastGemVisited) {
        const currentIndex = selected.findIndex(g => 
          (g.id || g.index).toString() === state.lastGemVisited.toString());
        nextIndex = (currentIndex + 1) % selected.length;
      }
      
      state.lastGemVisited = (selected[nextIndex].id || selected[nextIndex].index).toString();
      state.progress = (nextIndex + 1) * 100 / selected.length;
      
      this.save(state);
      return state;
    }
  },
  
  // Statistics tracking
  stats: {
    increment: function(statName) {
      const stats = this.getAll();
      stats[statName] = (stats[statName] || 0) + 1;
      localStorage.setItem('hiddenGems_stats', JSON.stringify(stats));
      return stats[statName];
    },
    
    getAll: function() {
      const savedStats = localStorage.getItem('hiddenGems_stats');
      return savedStats ? JSON.parse(savedStats) : {
        gemsDiscovered: 0,
        tripsCompleted: 0,
        hiddenGemsFound: 0,
        totalDistance: 0,
        lastActive: new Date().toISOString()
      };
    },
    
    recordGemVisit: function(gemId) {
      // Record that user has visited this gem
      const visitedGems = JSON.parse(localStorage.getItem('hiddenGems_visited') || '[]');
      
      if (!visitedGems.includes(gemId.toString())) {
        visitedGems.push(gemId.toString());
        localStorage.setItem('hiddenGems_visited', JSON.stringify(visitedGems));
        
        // Increment stats
        this.increment('gemsDiscovered');
        
        // Check if it's a hidden gem
        const gem = window.HiddenGems.data.getGemById(gemId);
        if (gem && (gem.isHidden || gem.popularity < 2)) {
          this.increment('hiddenGemsFound');
        }
        
        return true;
      }
      return false;
    },
    
    isGemVisited: function(gemId) {
      const visitedGems = JSON.parse(localStorage.getItem('hiddenGems_visited') || '[]');
      return visitedGems.includes(gemId.toString());
    }
  }
};

// Initialize the data controller when the script loads
window.HiddenGems.data.initialize();

// Make common functions globally available
window.loadGems = function(options) {
  return window.HiddenGems.data.loadGems(options);
};

window.shuffleGems = function() {
  const gems = window.HiddenGems.data.getGems();
  const shuffled = window.HiddenGems.data.utils.shuffleArray(gems);
  window.HiddenGems.data.saveGems(shuffled);
  return shuffled;
};

window.findNearbyGems = function() {
  return window.HiddenGems.data.findNearbyGems();
};