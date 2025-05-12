/**
 * map-controller.js
 * Handles map initialization and rendering gems on the map with card integration
 * Fully integrated with data-controller.js for streamlined data flow
 */

// Ensure HiddenGems namespace exists
window.HiddenGems = window.HiddenGems || {};

// Map initialization variables
let map;
let markers = [];


/**
 * Initialize the map and set up event handlers
 * @returns {Promise} Promise that resolves when the map is ready
 */
function initializeMap(pageName = 'index') {
  return new Promise((resolve, reject) => {
    try {



      // Get constants
      const DEFAULT_CENTER = window.HiddenGems.constants.DEFAULT_CENTER; // berkeley default
      const DEFAULT_ZOOM = window.HiddenGems.constants.DEFAULT_ZOOM;

      // Initialize the map without loading gems
      map = new maplibregl.Map({
        container: 'map',
        style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=hbvo5fWE9HuC6JUHKB9q',
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        renderWorldCopies: false,
        antialias: true,
        // Better map controls
        dragRotate: false,

        touchZoomRotate: false,
        doubleClickZoom: true,
        boxZoom: false,
        dragPan: true,
        touchPitch: false,
        maxBounds: [
          [-125, 37],
          [-118, 42]
        ]
      });
      // map.pageName = pageName;
      // Make map available globally
      window.map = map;

      // Add improved map controls with mobile-friendly options
      map.addControl(new maplibregl.NavigationControl({
        showCompass: false,
        visualizePitch: false
      }), 'top-left');

      // Set up event listeners for map
      map.on('load', function () {
        console.log('Map fully loaded');



        // Store in the HiddenGems namespace
        if (window.HiddenGems && window.HiddenGems.map) {
          window.HiddenGems.map.mapInstance = map;
          window.HiddenGems.map.currentPage = pageName;
        }

        // Notify that the map is ready
        window.notifyMapReady();

        // Dispatch standard event for other components
        document.dispatchEvent(new CustomEvent('mapReady', {
          bubbles: true
        }));

        resolve(map);
    
      });

      // Fix for sliding markers during zoom
      map.on('zoom move moveend zoomend', function () {
        // Ensure markers are properly positioned during map movement
        if (markers && markers.length) {
          markers.forEach(marker => {
            // Force marker update by getting and setting its position
            const lngLat = marker.getLngLat();
            marker.setLngLat(lngLat);
          });
        }
      });

      // Improve touch handling for mobile devices
      if ('ontouchstart' in window) {
        // Add custom touch handler for better card and map interaction
        const mapContainer = document.getElementById('map');
        let touchStartY = 0;
        let isSwiping = false;

        mapContainer.addEventListener('touchstart', function (e) {
          touchStartY = e.touches[0].clientY;

          // Check if touch is in the lower part of the screen (card area)
          const screenHeight = window.innerHeight;
          const cardAreaHeight = screenHeight / 4;

          if (touchStartY > screenHeight - cardAreaHeight) {
            isSwiping = true;
          } else {
            isSwiping = false;
          }
        });

        mapContainer.addEventListener('touchmove', function (e) {
          if (isSwiping) {
            const touchY = e.touches[0].clientY;
            const deltaY = touchStartY - touchY;

            if (Math.abs(deltaY) > 10) {
              // Vertical swipe detected in card area
            }
          }
        });
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      reject(error);
    }
  });
}

/**
 * Load gems using data controller and display them on the map
 * @param {string} pageName - Name of the page to load gems for
 * @param {Array} [center] - Optional center coordinates [lng, lat]
 * @param {number} [radius] - Optional radius in kilometers
 * @param {number} [sampleSize] - Number of gems to display
 * @param {Array} [originCoord] - Optional origin coordinates for route [lng, lat]
 * @param {Array} [destinationCoord] - Optional destination coordinates for route [lng, lat]
 * @returns {Promise} Promise that resolves with the loaded gems
 */
function loadGemsWithDataController(pageName, center, radius, sampleSize, originCoord, destinationCoord) {
  if (!window.HiddenGems || !window.HiddenGems.data) {
    return Promise.reject(new Error('Data controller not available'));
  }

  // Show loading indicator if available
  if (window.HiddenGems.data.utils.showLoading) {
    window.HiddenGems.data.showLoading('Finding hidden gems...');
  } else if (window.HiddenGems.data.utils && window.HiddenGems.data.utils.showLoading) {
    window.HiddenGems.data.utils.showLoading('Finding hidden gems...');
  }

  // Ensure data controller is initialized
  return window.HiddenGems.data.initialize()
    .then(() => {
      // Check if we're on a page other than index and should use route-based loading
      const isNotIndexPage = pageName !== 'index';

      if (isNotIndexPage) {
        console.log(`Loading gems along route for non-index page: ${pageName}`);

        // Default route coordinates if not provided
        const defaultOriginCoord = window.HiddenGems.constants.DEFAULT_ORIGIN;      // Berkeley
        const defaultDestinationCoord = window.HiddenGems.constants.DEFAULT_DESTINATION; // Sacramento

        // Use provided coords or defaults
        const safeOriginCoord = originCoord || defaultOriginCoord;
        const safeDestinationCoord = destinationCoord || defaultDestinationCoord;

        // Use default values if not provided
        const safeSampleSize = sampleSize || window.HiddenGems.constants.DEFAULT_LIMIT;
        const bufferDistance = radius || window.HiddenGems.constants.DEFAULT_RADIUS;

        console.log(`Finding gems along route from [${safeOriginCoord}] to [${safeDestinationCoord}]`);

        // Use findGemsAlongRoute from data-controller
        return window.HiddenGems.data.findGemsAlongRoute(
          pageName || 'landing-page',
          safeOriginCoord,
          safeDestinationCoord,
          bufferDistance,
          safeSampleSize
        );
      }
      // If on index page and center coordinates provided, find gems near that location
      else if (center && center.length === 2) {
        const safeRadius = radius || window.HiddenGems.constants?.DEFAULT_RADIUS;
        const safeSampleSize = sampleSize || window.HiddenGems.constants?.DEFAULT_LIMIT;

        console.log(`Finding gems near center [${center}] with radius ${safeRadius}km`);

        return window.HiddenGems.data.getRegionalGems({
          regionName: pageName || 'current-page',
          center: center,
          radius: safeRadius
        })
          .then(() => {
            return window.HiddenGems.data.getPageGems({
              regionName: pageName || 'current-page',
              pageName: pageName || 'current-page',
              sampleSize: safeSampleSize,
              forceNew: true
            });
          });
      }
      // Default: Try to find gems near the user with geolocation
      else {
        console.log(`Finding nearby gems for ${pageName} using geolocation`);

        return window.HiddenGems.data.findNearbyGems(
          pageName || 'current-page',
          sampleSize || window.HiddenGems.constants.DEFAULT_LIMIT,
          radius || window.HiddenGems.constants.DEFAULT_RADIUS
        );
      }
    })
    .then(gems => {
      console.log(`Found ${gems.length} gems, rendering on map`);

      // Render the gems on the map
      renderGems(gems);

      // Hide loading indicator
      if (window.HiddenGems.data.utils.hideLoading) {
        window.HiddenGems.data.utils.hideLoading();
      } else if (window.HiddenGems.data.utils && window.HiddenGems.data.utils.hideLoading) {
        window.HiddenGems.data.utils.hideLoading();
      }

      return gems;
    })
    .catch(error => {
      console.error('Error loading gems:', error);

      // Hide loading indicator
      if (window.HiddenGems.data.utils.hideLoading) {
        window.HiddenGems.data.utils.hideLoading();
      } else if (window.HiddenGems.data.utils && window.HiddenGems.data.utils.hideLoading) {
        window.HiddenGems.data.utils.hideLoading();
      }

      // Show error message
      showErrorMessage(`Error loading gems: ${error.message || 'Unknown error'}`);

      return [];
    });
}

/**
 * Show an error message on the screen
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
  const errorEl = document.createElement('div');
  errorEl.style.position = 'fixed';
  errorEl.style.top = '50%';
  errorEl.style.left = '50%';
  errorEl.style.transform = 'translate(-50%, -50%)';
  errorEl.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
  errorEl.style.color = 'white';
  errorEl.style.padding = '20px';
  errorEl.style.borderRadius = '5px';
  errorEl.style.zIndex = '2000';
  errorEl.style.maxWidth = '80%';
  errorEl.innerHTML = `<h3>Error</h3><p>${message}</p>`;
  document.body.appendChild(errorEl);

  // Remove error after 5 seconds
  setTimeout(() => {
    if (errorEl.parentNode) {
      errorEl.parentNode.removeChild(errorEl);
    }
  }, 5000);
}

function createMarker(lngLat, el) {
  return new maplibregl.Marker({
    element: el,
    anchor: 'center',
    offset: [0, 0]
  })
    .setLngLat(lngLat)
    .addTo(map);
}

/**
 * Function to render gems on the map
 * @param {Array} gems - Array of gem objects
 * @returns {Array} Array of gems that were successfully rendered
 */
function renderGems(gems) {
  // First ensure we have gems to render
  if (!gems || !Array.isArray(gems) || gems.length === 0) {
    console.warn('No gems to render');

    // Try to get gems from data controller as fallback
    if (window.HiddenGems && window.HiddenGems.data) {
      if (window.HiddenGems.data.pageGems && window.HiddenGems.data.pageGems.length > 0) {
        gems = window.HiddenGems.data.pageGems;
      } else if (window.HiddenGems.data.allGems && window.HiddenGems.data.allGems.length > 0) {
        // Take a sample of all gems
        if (window.HiddenGems.data.utils && window.HiddenGems.data.utils.sampleArray) {
          gems = window.HiddenGems.data.utils.sampleArray(window.HiddenGems.data.allGems, 10);
        } else {
          gems = window.HiddenGems.data.allGems.slice(0, 10);
        }
      } else {
        console.error('No gems available to render, even from data controller');
        return [];
      }
    } else {
      console.error('No gems available to render');
      return [];
    }
  }

  // First, ensure any lingering loading elements are removed
  const loadingElements = document.querySelectorAll('[id$="-loading"]');
  loadingElements.forEach(el => {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  // Clear existing markers if needed
  clearMarkers();

  // Clear any existing routes
  if (window.HiddenGems.map && typeof window.HiddenGems.map.clearRoutes === 'function') {
    window.HiddenGems.map.clearRoutes();
  }

  // Make sure map is available
  if (!map) {
    console.error('Map not initialized, cannot render gems');
    return [];
  }

  const bounds = new maplibregl.LngLatBounds();
  markers = [];

  // Track number of valid gems rendered
  let validGemsCount = 0;
  const validGems = [];

  // Get icon paths from constants
  const ICON_PATHS = window.HiddenGems.constants.ICON_PATHS;

  gems.forEach((gem, index) => {
    const coords = gem.coordinates;
    if (!coords || coords.length !== 2) return;



    // Normalize coordinates using dunified coordinate utility
    const lngLat = window.HiddenGems.coordUtil.fromGem(gem);


    validGemsCount++;
    validGems.push(gem);

    // Create marker DOM element
    const el = document.createElement('div');
    el.className = 'gem-marker';
    el.style.width = '28px';
    el.style.height = '28px';
    el.style.cursor = 'pointer';
    el.style.position = 'relative';

    // Store gem ID for synchronization
    const gemId = gem.id || gem.index || `gem-${index}`;
    el.setAttribute('data-gem-id', gemId.toString());
    el.setAttribute('data-index', index.toString());

    // Determine gem color
    let iconColor = 'blue'; // Default color
    if (gem.color) {
      iconColor = gem.color;
    } else if (gem.popularity !== undefined) {
      // Assign color based on popularity
      iconColor = gem.popularity < 2 ? 'red' :
        (gem.popularity < 4 ? 'purple' : 'blue');
    } else if (gem.type === 'hidden-beach' || gem.type === 'secret-trail' || gem.type === 'natural-wonder') {
      iconColor = 'red';
    }

    // Create gem icon image
    const iconImg = document.createElement('img');
    iconImg.src = ICON_PATHS[iconColor];
    iconImg.alt = `${iconColor.charAt(0).toUpperCase() + iconColor.slice(1)} Gem`;
    iconImg.className = `${iconColor}-gem-icon`;
    iconImg.style.width = '100%';
    iconImg.style.height = '100%';
    el.appendChild(iconImg);

    // Highlight if it's the active gem
    const activeGemIndex = window.HiddenGems.map.activeGemIndex || window.activeGemIndex || 0;
    if (index === activeGemIndex) {
      el.style.transform = 'scale(1.4)';
      el.style.zIndex = '10';
      el.classList.add('active-gem');
    }

    // Create and add marker to map
    const marker = createMarker(lngLat, el);

    // Store gemId on marker object for easier access
    marker.gemId = gemId.toString();

    // Add click handler
    el.addEventListener('click', function (e) {
      // Prevent event propagation
      e.stopPropagation();
      e.preventDefault();

      // Update active gem index
      window.activeGemIndex = index;
      if (window.HiddenGems && window.HiddenGems.map) {
        window.HiddenGems.map.activeGemIndex = index;
      }

      // Important: Apply highlighting before animation starts
      if (typeof window.highlightGemMarker === 'function') {
        window.highlightGemMarker(index, true);  // Pass true to skip card updates
      }


      // Center map on gem
      map.flyTo({
        center: lngLat,
        essential: true,
        duration: 800,
        easing: function (t) {
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }
      });

      // Update UI after a slight delay
      setTimeout(() => {
        // Use global highlightGemMarker function
        if (typeof window.highlightGemMarker === 'function') {
          window.highlightGemMarker(index);
        }

        // Dispatch event
        document.dispatchEvent(new CustomEvent('gemSelected', {
          detail: {
            index: index,
            id: gemId,
            gem: gem
          }
        }));
      }, 100);
    });

    markers.push(marker);
    bounds.extend(lngLat);
  });

  // Store markers globally for access by other components
  window.markers = markers;

  // Ensure pageGems in data controller are updated with valid gems
  if (window.HiddenGems && window.HiddenGems.data) {
    window.HiddenGems.data.pageGems = validGems;

    // Also save to sessionStorage through data controller
    if (window.HiddenGems.data.storage && window.HiddenGems.data.storage.setSession) {
      window.HiddenGems.data.storage.setSession('pageGems', validGems);
    }
  }

  // Log results
  console.log(`Rendered ${validGemsCount} valid gems out of ${gems.length} total`);

  // Fit map to show all markers with padding
  if (!bounds.isEmpty() && validGemsCount > 0) {
    map.fitBounds(bounds, {
      padding: 40,
      animate: true,
      duration: 1000,
      maxZoom: 12 // Prevent zooming in too far
    });
  } else if (validGemsCount === 0) {
    console.warn('No valid gems found to render on the map');
    showNoGemsMessage();
  }

  // Highlight the active gem marker
  const activeGemIndex = window.HiddenGems?.map?.activeGemIndex || window.activeGemIndex || 0;
  if (activeGemIndex >= 0 && activeGemIndex < validGems.length && typeof window.highlightGemMarker === 'function') {
    const gemId = validGems[activeGemIndex].id || validGems[activeGemIndex].index || `gem-${activeGemIndex}`;
    window.highlightGemMarker(activeGemIndex);
  }

  // Dispatch a custom event
  document.dispatchEvent(new CustomEvent('gemsLoaded', {
    detail: { gems: validGems }
  }));

  return validGems;
}

/**
 * Show a message when no gems are found
 */
function showNoGemsMessage() {
  const noGemsEl = document.createElement('div');
  noGemsEl.id = 'no-gems-message';
  noGemsEl.textContent = 'No hidden gems found in this area. Try expanding your search.';
  noGemsEl.style.position = 'absolute';
  noGemsEl.style.top = '50%';
  noGemsEl.style.left = '50%';
  noGemsEl.style.transform = 'translate(-50%, -50%)';
  noGemsEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  noGemsEl.style.color = 'white';
  noGemsEl.style.padding = '10px 20px';
  noGemsEl.style.borderRadius = '5px';
  noGemsEl.style.zIndex = '100';

  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    mapContainer.appendChild(noGemsEl);

    // Remove after 3 seconds
    setTimeout(() => {
      if (noGemsEl.parentNode) {
        noGemsEl.parentNode.removeChild(noGemsEl);
      }
    }, 3000);
  }
}

/**
 * Clear existing markers from the map
 */
function clearMarkers() {
  if (markers && markers.length) {
    markers.forEach(marker => marker.remove());
  }
  markers = [];
  window.markers = markers;
}

/**
 * Initialize map and try to load gems from data controller
 * @param {string} [pageName] - Page name for gem loading
 * @returns {Promise} Promise that resolves when initialization is complete
 */
function initialize(pageName = 'index') {

  // Check if we're on the index page with the welcome overlay
  const isIndexPage = window.location.pathname.endsWith('index.html') ||
    window.location.pathname.endsWith('/') ||
    window.location.pathname === '';
  const welcomeOverlay = document.getElementById('welcome-overlay');

  // If on index page with welcome overlay, just return a resolved promise
  // This prevents the initialization error while still allowing delayed-initialization.js to work
  if (isIndexPage && welcomeOverlay) {
    console.log('On index page with welcome overlay - delegating initialization to user interaction');
    return Promise.resolve(null);
  }

  return initializeMap()
    .then(map => {
      console.log('Map initialized successfully');

      // Check if data controller is available and initialized
      if (window.HiddenGems && window.HiddenGems.data) {
        if (window.HiddenGems.data.initialized) {
          // Data controller already initialized, load gems
          return loadGemsWithDataController(pageName);
        } else {
          // Wait for data controller to initialize
          console.log('Waiting for data controller to initialize...');

          // Listen for data controller initialization event
          return new Promise(resolve => {
            const handleDataInitialized = () => {
              document.removeEventListener('dataControllerInitialized', handleDataInitialized);
              loadGemsWithDataController(pageName).then(resolve);
            };

            document.addEventListener('dataControllerInitialized', handleDataInitialized);

            // Fallback: If event doesn't fire within 2 seconds, try loading anyway
            setTimeout(() => {
              document.removeEventListener('dataControllerInitialized', handleDataInitialized);
              loadGemsWithDataController(pageName).then(resolve);
            }, 2000);
          });
        }
      } else {
        console.warn('Data controller not available, falling back to manual gem loading');
        return loadGemsManually(pageName);
      }
    })
    .catch(error => {
      console.error('Error during map initialization:', error);
      showErrorMessage('Failed to initialize map: ' + (error.message || 'Unknown error'));
      return null;
    });
}

/**
 * Fallback function to load gems manually if data controller is not available
 * @param {string} pageName - Page name
 * @returns {Promise} Promise that resolves with loaded gems
 */
function loadGemsManually(pageName) {
  console.log('Loading gems manually (fallback mode)');

  // Show loading indicator if available
  if (window.HiddenGems.data.utils.showLoading) {
    window.HiddenGems.data.utils.showLoading('Finding hidden gems...');
  }

  // Try to fetch gems from the JSON file
  return fetch('static/assets/data/hidden_gems.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load gems data: ${response.status}`);
      }
      return response.json();
    })
    .then(jsonGems => {
      // Get user-added gems from localStorage if any
      let userGems = [];
      try {
        userGems = JSON.parse(localStorage.getItem('userGems') || '[]');
      } catch (error) {
        console.warn('Error parsing user gems from localStorage:', error);
      }

      // Combine and ensure all gems have unique IDs
      const allGems = [...jsonGems, ...userGems].map((gem, index) => {
        if (!gem.id) {
          gem.id = `gem-${index}`;
        }
        return gem;
      });

      // Filter by current bounds or proximity if geolocation is available
      let filteredGems = allGems;

      // Take a random sample
      if (allGems.length > 10) {
        filteredGems = allGems.sort(() => 0.5 - Math.random()).slice(0, 10);
      }

      // Hide loading indicator
      if (window.HiddenGems.data.utils.hideLoading) {
        window.HiddenGems.data.utils.hideLoading();
      }

      // Render gems on the map
      return renderGems(filteredGems);
    })
    .catch(error => {
      console.error('Error loading gems manually:', error);

      // Hide loading indicator
      if (window.HiddenGems.data.utils.hideLoading) {
        window.HiddenGems.data.utils.hideLoading();
      }

      showErrorMessage('Failed to load gems: ' + (error.message || 'Unknown error'));
      return [];
    });
}

// Initialize map namespace in HiddenGems
window.HiddenGems.map = {
  activeGemIndex: 0,
  mapInstance: null,

  // Initialize the map
  init: function (pageName) {
    // Check if delayed initialization is active
    const isDelayedInit = window.HiddenGems && window.HiddenGems.userHasInteracted === false;

    if (isDelayedInit) {
      console.log("Delayed initialization is active - waiting for user interaction");
      return Promise.resolve(null);
    }

    return initialize(pageName);
  },

  // Render gems on the map
  renderGems: renderGems,

  // Clear markers
  clearMarkers: clearMarkers,

  // Load gems with data controller
  loadGems: function (pageName, center, radius, sampleSize, originCoord, destinationCoord) {
    return loadGemsWithDataController(pageName, center, radius, sampleSize, originCoord, destinationCoord);
  },

  // Function to clear map routes
  clearRoutes: function () {
    if (!map) return;

    const existingLayers = map.getStyle().layers || [];
    const routeLayers = existingLayers
      .filter(layer => layer.id.includes('route-'))
      .map(layer => layer.id);

    // Remove all route layers
    routeLayers.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }

      // Extract source ID from layer ID by removing the suffix
      const sourceId = layerId.replace('-line', '').replace('-glow', '');
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });

    // Remove endpoint markers if they exist
    if (this.originMarker) {
      this.originMarker.remove();
      this.originMarker = null;
    }

    if (this.destinationMarker) {
      this.destinationMarker.remove();
      this.destinationMarker = null;
    }

    // Hide distance display if it exists
    const distanceEl = document.getElementById('route-distance');
    if (distanceEl) {
      distanceEl.classList.remove('visible');
    }
  }


};

// Export functions for use in other scripts
window.renderGems = renderGems;
window.clearMarkers = clearMarkers;
window.initializeMap = initializeMap;
window.loadGemsWithDataController = loadGemsWithDataController;