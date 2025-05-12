/**
 * data-controller.js
 * Streamlined data management system for Northern California Hidden Gems
 * Handles data loading, regional filtering, and random sampling
 */

// Ensure the namespace exists
window.HiddenGems = window.HiddenGems || {};

// Create the data controller object
window.HiddenGems.data = {
  // Core data state
  allGems: [],             // Complete dataset from JSON
  allGemsLoaded: false,    // Flag to track if full dataset is loaded
  regionGems: {},          // Regional subsets indexed by region name
  pageGems: [],            // Current page's display gems (random sample)
  initialized: false,
  
  /**
   * Initialize the data controller
   * @returns {Promise} Promise that resolves when initialization is complete
   */
  initialize: function() {
    if (this.initialized) {
      console.log('Data controller already initialized');
      return Promise.resolve();
    }
    
    console.log('Initializing HiddenGems data controller');
    this.initialized = true;
    
    // Check if we already have the full dataset in storage
    const storedAllGems = this.storage.get('allGems');
    if (storedAllGems && storedAllGems.length > 0) {
      this.allGems = storedAllGems;
      this.allGemsLoaded = true;
      console.log(`Loaded ${this.allGems.length} gems from storage`);
      return Promise.resolve(this.allGems);
    }
    
    // Otherwise, load the full dataset from JSON
    return this.loadAllGems();
  },
  
  /**
   * Load the complete dataset of gems from JSON file
   * @returns {Promise} Promise that resolves with loaded gems
   */
  loadAllGems: function() {
    console.log('Loading all gems from JSON...');
    this.showLoading('Loading gems database...');
    
    return fetch('static/assets/data/hidden_gems.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load gems data: ${response.status}`);
        }
        return response.json();
      })
      .then(jsonGems => {
        // Load user-added gems from localStorage
        const userGems = JSON.parse(window.HiddenGems.data.storage.get('userGems') || '[]');
        
        // Combine and ensure all gems have unique IDs
        const allGems = [...jsonGems, ...userGems].map((gem, index) => {
          if (!gem.id) {
            gem.id = `gem-${index}`;
          }
          return gem;
        });
        
        // Save to instance and storage
        this.allGems = allGems;
        this.allGemsLoaded = true;
        this.storage.set('allGems', allGems);
        
        console.log(`Loaded ${allGems.length} gems from JSON and user data`);
        this.hideLoading();
        
        return allGems;
      })
      .catch(error => {
        console.error('Error loading gems:', error);
        this.hideLoading();
        alert('Error loading gems database. Please try again.');
        throw error;
      });
  },
  
  /**
   * Get or create a regional subset of gems
   * @param {Object} options - Regional filtering options
   * @param {string} options.regionName - Unique name for this region
   * @param {Array} [options.center] - Center coordinates [lng, lat]
   * @param {number} [options.radius] - Radius in kilometers (default: 30)
   * @param {Function} [options.filterFn] - Custom filter function
   * @returns {Promise} Promise that resolves with regional gems
   */
  getRegionalGems: function(options) {
    if (!options || !options.regionName) {
      return Promise.reject(new Error('Region name is required'));
    }
    
    // Initialize if needed
    if (!this.initialized || !this.allGemsLoaded) {
      return this.initialize().then(() => this.getRegionalGems(options));
    }
    
    // Check if we already have this region cached
    const cachedRegion = this.storage.get(`region_${options.regionName}`);
    if (cachedRegion && cachedRegion.length > 0) {
      this.regionGems[options.regionName] = cachedRegion;
      console.log(`Loaded ${cachedRegion.length} gems for region "${options.regionName}" from cache`);
      return Promise.resolve(cachedRegion);
    }
    
    // Otherwise, create the regional subset
    console.log(`Creating regional subset "${options.regionName}"...`);
    this.showLoading('Finding gems in your area...');
    
    // Select filtering method based on options
    let filteredGems;
    
    if (options.filterFn && typeof options.filterFn === 'function') {
      // Use custom filter function if provided
      filteredGems = this.allGems.filter(options.filterFn);
    } 
    else if (options.center && options.center.length === 2) {
      // Filter by distance from center
      const radius = options.radius || 30;
      
      filteredGems = this.allGems.filter(gem => {
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
        return distance <= radius;
      });
    } 
    else {
      // Default: return all gems
      filteredGems = [...this.allGems];
    }
    
    // Store the regional subset
    this.regionGems[options.regionName] = filteredGems;
    this.storage.set(`region_${options.regionName}`, filteredGems);
    
    console.log(`Created regional subset "${options.regionName}" with ${filteredGems.length} gems`);
    this.hideLoading();
    
    return Promise.resolve(filteredGems);
  },
  
  /**
   * Get a random sample of gems for the current page
   * @param {Object} options - Sampling options
   * @param {string} options.regionName - Region name to sample from
   * @param {string} options.pageName - Unique name for this page
   * @param {number} [options.sampleSize] - Number of gems to sample (default: 10)
   * @param {boolean} [options.forceNew] - Force new sample even if one exists
   * @returns {Promise} Promise that resolves with sampled gems
   */
  getPageGems: function(options) {
    if (!options || !options.regionName || !options.pageName) {
      return Promise.reject(new Error('Region name and page name are required'));
    }
    
    const sampleSize = options.sampleSize || 10;
    const storageName = `page_${options.pageName}`;
    
    // Check if we already have this page's gems and aren't forcing new
    if (!options.forceNew) {
      const cachedPageGems = this.storage.get(storageName);
      if (cachedPageGems && cachedPageGems.length > 0) {
        this.pageGems = cachedPageGems;
        console.log(`Loaded ${cachedPageGems.length} gems for page "${options.pageName}" from cache`);
        return Promise.resolve(cachedPageGems);
      }
    }
    
    // Get or create the regional subset first
    return this.getRegionalGems({ regionName: options.regionName })
      .then(regionGems => {
        // If we have fewer gems than the sample size, use all of them
        if (regionGems.length <= sampleSize) {
          this.pageGems = [...regionGems];
        } else {
          // Otherwise, take a random sample
          this.pageGems = this.utils.sampleArray(regionGems, sampleSize);
        }
        
        // Store the page gems (in session storage, as these are temporary)
        this.storage.setSession(storageName, this.pageGems);
        
        console.log(`Created page sample "${options.pageName}" with ${this.pageGems.length} gems`);
        return this.pageGems;
      });
  },
  
  /**
   * Get a specific gem by ID
   * @param {string|number} gemId - ID of the gem to find
   * @returns {Object|null} The gem or null if not found
   */
  getGemById: function(gemId) {
    // First, initialize if needed
    if (!this.initialized || !this.allGemsLoaded) {
      console.warn('Trying to get gem by ID before initialization');
      return null;
    }
    
    // Search in all gems
    return this.allGems.find(g => (g.id || g.index).toString() === gemId.toString()) || null;
  },
  
  /**
   * Storage abstraction to handle localStorage and sessionStorage
   */
  storage: {
    /**
     * Get item from storage (localStorage)
     * @param {string} key - Storage key
     * @returns {*} Parsed value or null
     */
    get: function(key) {
      try {
        const item = localStorage.getItem(`hiddenGems_${key}`);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        console.warn(`Error reading ${key} from localStorage:`, e);
        return null;
      }
    },
    
    /**
     * Save item to storage (localStorage)
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     */
    set: function(key, value) {
      try {
        localStorage.setItem(`hiddenGems_${key}`, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error(`Error saving ${key} to localStorage:`, e);
        return false;
      }
    },
    
    /**
     * Get item from session storage
     * @param {string} key - Storage key
     * @returns {*} Parsed value or null
     */
    getSession: function(key) {
      try {
        const item = sessionStorage.getItem(`hiddenGems_${key}`);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        console.warn(`Error reading ${key} from sessionStorage:`, e);
        return null;
      }
    },
    
    /**
     * Save item to session storage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     */
    setSession: function(key, value) {
      try {
        sessionStorage.setItem(`hiddenGems_${key}`, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error(`Error saving ${key} to sessionStorage:`, e);
        return false;
      }
    },
    
    /**
     * Remove item from storage
     * @param {string} key - Storage key
     * @param {boolean} [session] - Whether to remove from sessionStorage
     */
    remove: function(key, session = false) {
      try {
        if (session) {
          sessionStorage.removeItem(`hiddenGems_${key}`);
        } else {
          localStorage.removeItem(`hiddenGems_${key}`);
        }
        return true;
      } catch (e) {
        console.error(`Error removing ${key} from storage:`, e);
        return false;
      }
    },
    
    /**
     * Clear all HiddenGems data from storage
     * @param {boolean} [clearAll] - Whether to clear non-HiddenGems data
     */
    clear: function(clearAll = false) {
      try {
        if (clearAll) {
          localStorage.clear();
          sessionStorage.clear();
        } else {
          // Only clear HiddenGems-related items
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('hiddenGems_')) {
              localStorage.removeItem(key);
            }
          });
          
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('hiddenGems_')) {
              sessionStorage.removeItem(key);
            }
          });
        }
        return true;
      } catch (e) {
        console.error('Error clearing storage:', e);
        return false;
      }
    }
  },
  
  /**
   * Find nearby gems based on geolocation
   * @param {string} pageName - Name of the page for gem sample
   * @param {number} [sampleSize] - Number of gems to sample (default: 10)
   * @param {number} [radius] - Radius in kilometers (default: 30)
   * @returns {Promise} Promise that resolves with gems
   */
  findNearbyGems: function(pageName, sampleSize = 10, radius = 30) {
    return new Promise((resolve, reject) => {
      if (!pageName) {
        reject(new Error('Page name is required'));
        return;
      }

      if (pageName === "index") {
        const defaultLocation = window.HiddenGems.constants.DEFAULT_CENTER;
            
            this.getRegionalGems({
              regionName: 'default',
              center: defaultLocation,
              radius: radius
            })
            .then(() => {
              // Get a page sample
              return this.getPageGems({
                regionName: 'default',
                pageName: pageName,
                sampleSize: sampleSize,
                forceNew: true
              });
            })
            .then(resolve)
            .catch(reject);
      }

      
      this.showLoading('Finding your location...');
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          // Success callback
          (position) => {
            const userLocation = [position.coords.longitude, position.coords.latitude];
            
            // Store user location
            this.storage.set('userLocation', userLocation);
            
            // Create a region based on user location
            this.getRegionalGems({
              regionName: 'nearby',
              center: userLocation,
              radius: radius
            })
            .then(() => {
              // Get a page sample
              return this.getPageGems({
                regionName: 'nearby',
                pageName: pageName,
                sampleSize: sampleSize,
                forceNew: true
              });
            })
            .then(resolve)
            .catch(reject);
          },
          // Error callback
          (error) => {
            console.error('Geolocation error:', error);
            
            const defaultLocation = window.HiddenGems.constants.DEFAULT_CENTER;
            
            this.getRegionalGems({
              regionName: 'default',
              center: defaultLocation,
              radius: radius
            })
            .then(() => {
              // Get a page sample
              return this.getPageGems({
                regionName: 'default',
                pageName: pageName,
                sampleSize: sampleSize,
                forceNew: true
              });
            })
            .then(resolve)
            .catch(reject);
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
        console.warn('Geolocation not supported by this browser');
        
        // Use default location (San Francisco)
        const defaultLocation =  window.HiddenGems.constants.DEFAULT_CENTER;
        
        this.getRegionalGems({
          regionName: 'default',
          center: defaultLocation,
          radius: radius
        })
        .then(() => {
          // Get a page sample
          return this.getPageGems({
            regionName: 'default',
            pageName: pageName,
            sampleSize: sampleSize,
            forceNew: true
          });
        })
        .then(resolve)
        .catch(reject);
      }
    });
  },
  
  /**
   * Filter gems along a route for road trip planning
   * @param {string} pageName - Name of the page for gem sample
   * @param {Array} originCoords - Origin coordinates [lng, lat]
   * @param {Array} destinationCoords - Destination coordinates [lng, lat]
   * @param {number} [bufferDistanceKm] - Buffer distance in kilometers (default: 30)
   * @param {number} [sampleSize] - Number of gems to sample (default: 10)
   * @returns {Promise} Promise that resolves with gems
   */
  findGemsAlongRoute: function(pageName, originCoords, destinationCoords, bufferDistanceKm = 30, sampleSize = 10) {
    if (!pageName || !originCoords || !destinationCoords) {
      return Promise.reject(new Error('Page name, origin, and destination are required'));
    }
    
    // Create a region filter function for route
    const routeFilterFn = (gem) => {
      const coords = gem.coords || gem.coordinates;
      if (!coords || coords.length !== 2) return false;
      
      // Calculate distance to route line
      const distanceToRoute = this.distanceToLineSegment(
        coords, originCoords, destinationCoords
      );
      
      // Save distance to gem for sorting
      gem.distanceFromRoute = distanceToRoute;
      
      // Return true if within buffer distance
      return distanceToRoute <= bufferDistanceKm;
    };
    
    // Define unique region name based on origin/destination
    const regionName = `route_${originCoords.join('_')}_${destinationCoords.join('_')}`;
    
    // Store route info
    this.storage.set('currentRoute', {
      origin: originCoords,
      destination: destinationCoords,
      bufferDistance: bufferDistanceKm
    });
    
    return this.getRegionalGems({
      regionName: regionName,
      filterFn: routeFilterFn
    })
    .then(() => {
      // Get a page sample
      return this.getPageGems({
        regionName: regionName,
        pageName: pageName,
        sampleSize: sampleSize,
        forceNew: true
      });
    });
  },
  
  /**
 * Show loading indicator with safety checks for document.body
 * @param {string} message - Message to display
 */
showLoading: function(message) {
  // First check if document and body are available
  if (!document || !document.body) {
    console.log('Loading indicator requested but document.body not available yet:', message);
    
    // Return a dummy element that won't cause errors
    return {
      remove: function() {},
      style: {}
    };
  }
  
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
 * Hide loading indicator with safety checks
 */
hideLoading: function() {
  // Check if document is available
  if (!document) return;
  
  const loadingEl = document.getElementById('gems-loading');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
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
     * Calculate distance between two points in kilometers
     * @param {number} lat1 - Latitude of first point
     * @param {number} lon1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lon2 - Longitude of second point
     * @returns {number} Distance in kilometers
     */
    calculateDistance: function(lat1, lon1, lat2, lon2) {
      const R = 6371; // Earth's radius in kilometers
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
     * @returns {Array} New shuffled array (original not modified)
     */
    shuffleArray: function(array) {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    },
    
    /**
     * Take a random sample from an array
     * @param {Array} array - Source array
     * @param {number} size - Sample size
     * @returns {Array} New array with random samples
     */
    sampleArray: function(array, size) {
      // If size is greater than array length, return the shuffled array
      if (size >= array.length) {
        return this.shuffleArray(array);
      }
      
      // Otherwise, take a random sample
      const shuffled = this.shuffleArray(array);
      return shuffled.slice(0, size);
    }
  }
};

/**
 * Enhanced coordinate handling utility
 * This will standardize all coordinate operations throughout the application
 */
function createCoordinateUtility() {
  return {
    /**
     * Normalize coordinates to ensure consistent [lng, lat] format
     * @param {Array|Object} coords - Input coordinates
     * @returns {Array|null} Normalized [lng, lat] array or null if invalid
     */
    normalize: function(coords) {
      // Handle different input formats
      let lng, lat;
      
      // Array format
      if (Array.isArray(coords)) {
        if (coords.length !== 2) return null;
        
        const [a, b] = coords;
        
        // Skip if either value is not a number
        if (isNaN(a) || isNaN(b)) return null;
        
        // Determine correct order based on typical ranges
        // Longitude: -180 to 180, Latitude: -90 to 90
        if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
          // Already in [lng, lat] format
          lng = a;
          lat = b;
        } else if (Math.abs(a) <= 90 && Math.abs(b) > 90) {
          // Swapped order, needs to be [lng, lat]
          lng = b;
          lat = a;
        } else {
          // For Northern California context, longitude is negative and latitude is positive
          lng = a < 0 ? a : b;
          lat = a < 0 ? b : a;
        }
      } 
      // Object format (e.g. {lng: x, lat: y} or {longitude: x, latitude: y})
      else if (typeof coords === 'object' && coords !== null) {
        if (coords.lng !== undefined && coords.lat !== undefined) {
          lng = coords.lng;
          lat = coords.lat;
        } else if (coords.longitude !== undefined && coords.latitude !== undefined) {
          lng = coords.longitude;
          lat = coords.latitude;
        } else {
          return null; // Unrecognized object format
        }
      } else {
        return null; // Unrecognized input
      }
      
      // Final validation
      if (!this.isValid(lng, lat)) return null;
      
      return [lng, lat];
    },
    
    /**
     * Check if coordinates are valid
     * @param {number} lng - Longitude
     * @param {number} lat - Latitude
     * @returns {boolean} True if valid
     */
    isValid: function(lng, lat) {
      if (isNaN(lng) || isNaN(lat)) return false;
      if (lng < -180 || lng > 180) return false;
      if (lat < -90 || lat > 90) return false;
      return true;
    },
    
    /**
     * Get consistent coordinates from a gem object
     * @param {Object} gem - Gem object
     * @returns {Array|null} Normalized [lng, lat] array or null if invalid
     */
    fromGem: function(gem) {
      if (!gem) return null;
      
      // Try various property names used in the application
      const coords = gem.coordinates || gem.coords || null;
      return this.normalize(coords);
    },
    
    /**
     * Debug logging of coordinates
     * @param {Array} coords - Coordinates to log
     * @param {string} label - Label for logging
     */
    debug: function(coords, label) {
      console.log(`[Coordinates ${label}]:`, coords ? 
                 `[${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}]` : 'Invalid');
    }
  };
}

// Create the utility
const coordUtil = createCoordinateUtility();
// Attach to the HiddenGems namespace
window.HiddenGems.coordUtil = coordUtil;

/**
 * Safe initialization for data controller
 * Replace the current initialization code at the bottom of data-controller.js
 */

// Safely initialize the data controller when the DOM is ready
function safeInitializeDataController() {
  // Check if document.body exists
  if (document && document.body) {
    // Safe to initialize now
    window.HiddenGems.data.initialize().catch(err => {
      console.error('Failed to initialize data controller:', err);
    });
  } else {
    // Wait for DOM to be ready
    if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', function() {
        window.HiddenGems.data.initialize().catch(err => {
          console.error('Failed to initialize data controller:', err);
        });
      });
    } else {
      // Fallback for older browsers
      window.addEventListener('load', function() {
        window.HiddenGems.data.initialize().catch(err => {
          console.error('Failed to initialize data controller:', err);
        });
      });
    }
  }
}

// Make common functions available
window.HiddenGems.getPageGems = function(options) {
  return window.HiddenGems.data.getPageGems(options);
};

window.HiddenGems.findNearbyGems = function(pageName, sampleSize, radius) {
  return window.HiddenGems.data.findNearbyGems(pageName, sampleSize, radius);
};

window.HiddenGems.findGemsAlongRoute = function(pageName, origin, destination, buffer, sampleSize) {
  return window.HiddenGems.data.findGemsAlongRoute(pageName, origin, destination, buffer, sampleSize);
};

// Legacy support for older code
window.loadGems = function(options = {}) {
  console.log('Legacy loadGems function called');
  
  const defaultOptions = {
    limit: window.HiddenGems.constants.DEFAULT_LIMIT,
    random: true,
    center: null,
    radius: window.HiddenGems.constants.DEFAULT_RADIUS
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  // If options have center coordinates, create a regional filter
  if (options.center) {
    return window.HiddenGems.data.getRegionalGems({
      regionName: `region_${Date.now()}`,
      center: options.center,
      radius: options.radius || window.HiddenGems.constants.DEFAULT_RADIUS
    })
    .then(regionalGems => {
      // Either return all gems or shuffle and limit as requested
      if (!options.random) {
        const result = regionalGems.slice(0, mergedOptions.limit);
        window.HiddenGems.data.saveGems(result);
        return result;
      } else {
        const shuffled = window.HiddenGems.data.utils.shuffleArray(regionalGems);
        const result = shuffled.slice(0, mergedOptions.limit);
        window.HiddenGems.data.saveGems(result);
        return result;
      }
    })
    .catch(err => {
      console.error('Error in legacy loadGems:', err);
      return [];
    });
  } 
  // Otherwise just load all gems and shuffle/limit
  else {
    return window.HiddenGems.data.initialize()
      .then(() => {
        const allGems = window.HiddenGems.data.allGems;
        let result;
        
        if (mergedOptions.random) {
          const shuffled = window.HiddenGems.data.utils.shuffleArray(allGems);
          result = shuffled.slice(0, mergedOptions.limit);
        } else {
          result = allGems.slice(0, mergedOptions.limit);
        }
        
        window.HiddenGems.data.saveGems(result);
        return result;
      })
      .catch(err => {
        console.error('Error in legacy loadGems:', err);
        return [];
      });
  }
};

window.findNearbyGems = function() {
  console.log('Legacy findNearbyGems function called');
  
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // Success callback
        (position) => {
          const userLocation = [position.coords.longitude, position.coords.latitude];
          
          // Store user location
          window.HiddenGems.data.storage.set('userLocation', JSON.stringify(userLocation));
          window.HiddenGems.data.storage.set('userLocation', JSON.stringify(userLocation));
          
          // Load gems near user location
          window.loadGems({
            center: userLocation,
            radius: window.HiddenGems.constants.DEFAULT_RADIUS,
            limit: window.HiddenGems.constants.DEFAULT_LIMIT,
            random: true
          }).then(resolve).catch(reject);
        },
        // Error callback
        (error) => {
          console.error('Geolocation error:', error);
          
          // Use default location
          const defaultLocation = window.HiddenGems.constants.DEFAULT_CENTER;
          
          window.loadGems({
            center: defaultLocation,
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
      console.warn('Geolocation not supported, using default location');
      
      const defaultLocation = window.HiddenGems.constants.DEFAULT_CENTER;
      
      window.loadGems({
        center: defaultLocation,
        random: true
      }).then(resolve).catch(reject);
    }
  });
};

// Call the safe initialization function
safeInitializeDataController();