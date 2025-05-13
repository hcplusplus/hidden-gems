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
      const normalizedCenter = this.coordUtils.normalize(options.center);
      
      if (!normalizedCenter) {
        return Promise.reject(new Error('Invalid center coordinates'));
      }
      
      filteredGems = this.allGems.filter(gem => {
        const coords = this.coordUtils.fromGem(gem);
        if (!coords) return false;
        
        // Calculate distance from center
        const distance = this.utils.calculateDistance(
          normalizedCenter[1], normalizedCenter[0],
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
   * Find nearby gems based on geolocation or default location
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
      
      // Check if we're using a default location (Berkeley) instead of geolocation
      // First check for stored preference in local storage
      const shouldUseGeolocation = localStorage.getItem('locationPermissionGranted') === 'true';
      const storedCoords = this.storage.get('defaultCoords');
      
      // If we have defaultCoords and are not using geolocation, use those
      if (storedCoords && !shouldUseGeolocation) {
        console.log('Using stored default coordinates instead of requesting location');
        
        // Create a region based on default location
        this.getRegionalGems({
          regionName: 'default',
          center: storedCoords,
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
        
        return;
      }
      
      // If we're using geolocation, proceed with current logic
      this.showLoading('Finding your location...');
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          // Success callback
          (position) => {
            const userLocation = [position.coords.longitude, position.coords.latitude];
            
            // Normalize and store user location
            const normalizedLocation = this.coordUtils.normalize(userLocation);
            this.storage.set('userLocation', normalizedLocation);
            
            // Create a region based on user location
            this.getRegionalGems({
              regionName: 'nearby',
              center: normalizedLocation,
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
          // Error callback - use default coordinates
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
        // Geolocation not supported - use default location
        console.warn('Geolocation not supported by this browser');
        
        // Use default location (Berkeley/SF)
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
    });
  },
  
/**
 * Find gems along a route for road trip planning with improved distribution
 * @param {string} pageName - Name of the page for gem sample
 * @param {Array} originCoords - Origin coordinates [lng, lat]
 * @param {Array} destinationCoords - Destination coordinates [lng, lat]
 * @param {number} [bufferDistanceKm] - Buffer distance in kilometers (default: 30)
 * @param {number} [sampleSize] - Number of gems to sample (default: 10)
 * @param {string} [originName] - Name of origin location (for region naming)
 * @param {string} [destinationName] - Name of destination location (for region naming)
 * @returns {Promise} Promise that resolves with gems
 */
findGemsAlongRoute: function(pageName, originCoords, destinationCoords, bufferDistanceKm = 30, sampleSize = 10, originName = '', destinationName = '') {
  if (!pageName || !originCoords || !destinationCoords) {
    return Promise.reject(new Error('Page name, origin, and destination are required'));
  }
  
  // Normalize coordinates
  const normalizedOrigin = this.coordUtils.normalize(originCoords);
  const normalizedDestination = this.coordUtils.normalize(destinationCoords);
  
  if (!normalizedOrigin || !normalizedDestination) {
    return Promise.reject(new Error('Invalid coordinates'));
  }
  
  // Create a region filter function for route
  const routeFilterFn = (gem) => {
    const coords = this.coordUtils.fromGem(gem);
    if (!coords) return false;
    
    // Calculate progress along the route (0 = at origin, 1 = at destination)
    const routeProgress = this.getPointProgressAlongRoute(
      coords, normalizedOrigin, normalizedDestination
    );
    
    // Calculate distance to route line
    const distanceToRoute = this.distanceToLineSegment(
      coords, normalizedOrigin, normalizedDestination
    );
    
    // Save these values to gem for sorting and displaying
    gem.distanceFromRoute = distanceToRoute;
    gem.routeProgress = routeProgress;
    
    // Return true if:
    // 1. Within buffer distance of the route
    // 2. Between origin and destination (progress between 0 and 1)
    // 3. Not too close to origin or destination (optional, adjust as needed)
    return distanceToRoute <= bufferDistanceKm && 
           routeProgress >= 0 && 
           routeProgress <= 1;
  };
  
  // Define unique region name based on origin/destination names if provided
  // Fall back to coordinates if names aren't provided
  let regionName;
  
  if (originName && destinationName) {
    // Clean up names for storage key usage (replace spaces, special chars)
    const cleanOriginName = originName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const cleanDestName = destinationName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    regionName = `route_${cleanOriginName}_to_${cleanDestName}`;
    
    // Store the original names for display
    this.storage.set('routeOriginName', originName);
    this.storage.set('routeDestinationName', destinationName);
  } else {
    // Fall back to coordinate-based name if no names provided
    regionName = `route_${normalizedOrigin.join('_')}_${normalizedDestination.join('_')}`;
  }
  
  console.log(`Finding gems along route from ${originName || 'origin'} to ${destinationName || 'destination'}`);
  
  // Store route info
  this.storage.set('currentRoute', {
    origin: normalizedOrigin,
    destination: normalizedDestination,
    originName: originName,
    destinationName: destinationName,
    bufferDistance: bufferDistanceKm
  });
  
  return this.getRegionalGems({
    regionName: regionName,
    filterFn: routeFilterFn
  })
  .then(regionGems => {
    // Sort gems by their progress along the route
    regionGems.sort((a, b) => a.routeProgress - b.routeProgress);
    
    // Ensure even distribution by dividing the route into segments
    return this.getEvenlyDistributedGems(regionGems, sampleSize);
  })
  .then(distributedGems => {
    // Store as page gems
    this.pageGems = distributedGems;
    this.storage.setSession(`page_${pageName}`, distributedGems);
    
    console.log(`Created route page sample "${pageName}" with ${distributedGems.length} evenly distributed gems`);
    return distributedGems;
  });
},

/**
 * Get point's progress along a route (0 = origin, 1 = destination)
 * @param {Array} point - [lng, lat] coordinates of the point
 * @param {Array} routeStart - [lng, lat] coordinates of route start
 * @param {Array} routeEnd - [lng, lat] coordinates of route end
 * @return {number} Progress along route (can be negative or >1 if outside route)
 */
getPointProgressAlongRoute: function(point, routeStart, routeEnd) {
  // Convert to Cartesian coordinates for simplicity
  const p = [point[0], point[1]];
  const v = [routeStart[0], routeStart[1]];
  const w = [routeEnd[0], routeEnd[1]];
  
  // Calculate the route vector
  const routeVector = [w[0] - v[0], w[1] - v[1]];
  const routeLength = Math.sqrt(Math.pow(routeVector[0], 2) + Math.pow(routeVector[1], 2));
  
  // If route length is zero, return 0
  if (routeLength === 0) return 0;
  
  // Calculate the point-to-start vector
  const pointVector = [p[0] - v[0], p[1] - v[1]];
  
  // Calculate the dot product
  const dotProduct = pointVector[0] * routeVector[0] + pointVector[1] * routeVector[1];
  
  // Calculate progress (projection of point onto route divided by route length)
  return dotProduct / (routeLength * routeLength);
},

/**
 * Evenly distribute gems along a route
 * @param {Array} routeGems - Gems sorted by route progress
 * @param {number} sampleSize - Number of gems to sample
 * @returns {Array} Evenly distributed gems
 */
getEvenlyDistributedGems: function(routeGems, sampleSize) {
  const result = [];
  
  // If we have fewer gems than the sample size, return all of them
  if (routeGems.length <= sampleSize) {
    return routeGems;
  }
  
  // Divide the route into segments
  const numSegments = sampleSize;
  const segmentSize = 1.0 / numSegments;
  
  // Initialize an array to hold gems for each segment
  const segmentGems = Array(numSegments).fill().map(() => []);
  
  // Assign each gem to its segment
  routeGems.forEach(gem => {
    const segmentIndex = Math.min(
      Math.floor(gem.routeProgress / segmentSize),
      numSegments - 1
    );
    
    // Only add to valid segments (should always be true with our filter)
    if (segmentIndex >= 0 && segmentIndex < numSegments) {
      segmentGems[segmentIndex].push(gem);
    }
  });
  
  // For each segment, select the gem closest to the center of the segment
  // or a random gem if no clear center exists
  segmentGems.forEach((gems, segmentIndex) => {
    if (gems.length === 0) {
      // If no gems in this segment, try to borrow from adjacent segments
      // This helps ensure we get as close to sampleSize gems as possible
      return;
    }
    
    // Calculate the ideal progress for this segment's center
    const idealProgress = (segmentIndex + 0.5) * segmentSize;
    
    // Find the gem closest to the ideal progress
    let closestGem = gems[0];
    let closestDistance = Math.abs(gems[0].routeProgress - idealProgress);
    
    for (let i = 1; i < gems.length; i++) {
      const distance = Math.abs(gems[i].routeProgress - idealProgress);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestGem = gems[i];
      }
    }
    
    result.push(closestGem);
  });
  
  // If some segments had no gems, we might have fewer than sampleSize
  // Fill in with remaining gems to reach the sample size if possible
  if (result.length < sampleSize) {
    // Find gems that are not already in the result
    const unusedGems = routeGems.filter(gem => !result.includes(gem));
    
    // Sort by distance to route (smaller is better)
    unusedGems.sort((a, b) => a.distanceFromRoute - b.distanceFromRoute);
    
    // Add gems until we reach the sample size or run out of gems
    while (result.length < sampleSize && unusedGems.length > 0) {
      result.push(unusedGems.shift());
    }
    
    // Final sort by route progress to maintain order
    result.sort((a, b) => a.routeProgress - b.routeProgress);
  }
  
  return result;
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
  
  /**
   * Coordinate handling utilities
   * Standardized coordinate operations throughout the application
   */
  coordUtils: {
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
  }, 

  /**
 * Clear cached route data and related gems
 * @param {boolean} [clearAllRouteData=false] - Whether to clear all route-related data
 * @param {boolean} [clearAllGems=false] - Whether to clear all gem data (use with caution)
 * @returns {boolean} Success status
 */
clearRouteCache: function(clearAllRouteData = false, clearAllGems = false) {
  console.log('Clearing route cache...');
  const storage = window.HiddenGems.data.storage;
  
  try {
    // Clear current route data
    storage.remove('currentRoute');
    
    // Get all storage keys
    const allLocalStorageKeys = Object.keys(localStorage);
    const allSessionStorageKeys = Object.keys(sessionStorage);
    
    // Clear route-specific regional gems
    const routeRegionPattern = /^hiddenGems_route_/;
    allLocalStorageKeys.forEach(key => {
      if (routeRegionPattern.test(key) || (clearAllRouteData && key.includes('route'))) {
        localStorage.removeItem(key);
        console.log(`Cleared route cache: ${key}`);
      }
    });
    
    // Clear route-specific page gems from session storage
    const routePagePattern = /^hiddenGems_page_route/;
    allSessionStorageKeys.forEach(key => {
      if (routePagePattern.test(key) || (clearAllRouteData && key.includes('route'))) {
        sessionStorage.removeItem(key);
        console.log(`Cleared route page cache: ${key}`);
      }
    });
    
    // If requested, clear all gem data (use with caution)
    if (clearAllGems) {
      storage.remove('allGems');
      
      // Clear all region data
      allLocalStorageKeys.forEach(key => {
        if (key.startsWith('hiddenGems_region_')) {
          localStorage.removeItem(key);
          console.log(`Cleared region cache: ${key}`);
        }
      });
      
      // Clear all page data
      allSessionStorageKeys.forEach(key => {
        if (key.startsWith('hiddenGems_page_')) {
          sessionStorage.removeItem(key);
          console.log(`Cleared page cache: ${key}`);
        }
      });
      
      // Reset state
      window.HiddenGems.data.allGemsLoaded = false;
      window.HiddenGems.data.regionGems = {};
      window.HiddenGems.data.pageGems = [];
    }
    
    console.log('Route cache cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing route cache:', error);
    return false;
  }
},

/**
 * Modified clearRouteCache function to handle city-named routes
 */
clearRouteCache: function(clearAllRouteData = false, clearAllGems = false) {
  console.log('Clearing route cache...');
  const storage = window.HiddenGems.data.storage;
  
  try {
    // Clear current route data and route name data
    storage.remove('currentRoute');
    storage.remove('routeOriginName');
    storage.remove('routeDestinationName');
    storage.remove('originName');
    storage.remove('destinationName');
    
    // Get all storage keys
    const allLocalStorageKeys = Object.keys(localStorage);
    const allSessionStorageKeys = Object.keys(sessionStorage);
    
    // Clear route-specific regional gems (now includes name-based patterns)
    const routeRegionPattern = /^hiddenGems_route_/;
    allLocalStorageKeys.forEach(key => {
      if (routeRegionPattern.test(key) || (clearAllRouteData && key.includes('route'))) {
        localStorage.removeItem(key);
        console.log(`Cleared route cache: ${key}`);
      }
    });
    
    // Clear route-specific page gems from session storage
    const routePagePattern = /^hiddenGems_page_route/;
    allSessionStorageKeys.forEach(key => {
      if (routePagePattern.test(key) || key === 'routeInfo' || 
          key === 'backgroundRouteGems' || (clearAllRouteData && key.includes('route'))) {
        sessionStorage.removeItem(key);
        console.log(`Cleared route page cache: ${key}`);
      }
    });
    
    // If requested, clear all gem data (use with caution)
    if (clearAllGems) {
      storage.remove('allGems');
      
      // Clear all region data
      allLocalStorageKeys.forEach(key => {
        if (key.startsWith('hiddenGems_region_')) {
          localStorage.removeItem(key);
          console.log(`Cleared region cache: ${key}`);
        }
      });
      
      // Clear all page data
      allSessionStorageKeys.forEach(key => {
        if (key.startsWith('hiddenGems_page_')) {
          sessionStorage.removeItem(key);
          console.log(`Cleared page cache: ${key}`);
        }
      });
      
      // Reset state
      window.HiddenGems.data.allGemsLoaded = false;
      window.HiddenGems.data.regionGems = {};
      window.HiddenGems.data.pageGems = [];
    }
    
    console.log('Route cache cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing route cache:', error);
    return false;
  }
},

/**
 * Refresh route data with city name-based region naming
 * @param {string} pageName - Name of the page for gem sample
 * @param {Array} originCoords - Origin coordinates [lng, lat]
 * @param {string} originName - Name of origin location
 * @param {Array} destinationCoords - Destination coordinates [lng, lat]
 * @param {string} destinationName - Name of destination location
 * @param {number} [bufferDistanceKm] - Buffer distance in kilometers (default: 30)
 * @param {number} [sampleSize] - Number of gems to sample (default: 10)
 * @returns {Promise} Promise that resolves with refreshed gems
 */
refreshRouteGems: function(pageName, originCoords, originName, destinationCoords, destinationName, bufferDistanceKm = 30, sampleSize = 10) {
  // First clear the route cache
  this.clearRouteCache();
  
  // Store the city names
  this.storage.set('originName', originName);
  this.storage.set('destinationName', destinationName);
  
  // Then find new gems along the route
  return this.findGemsAlongRoute(
    pageName, 
    originCoords, 
    destinationCoords, 
    bufferDistanceKm, 
    sampleSize,
    originName,
    destinationName
  );
}
};

/**
 * Safe initialization for data controller
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

// Call the safe initialization function
safeInitializeDataController();