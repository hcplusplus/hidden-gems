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
let cardsInitialized = false;


/**
 * Initialize the map and set up event handlers
 * @returns {Promise} Promise that resolves when the map is ready
 */
function initializeMap(pageName = 'index', center = null, zoom = null) {



  return new Promise((resolve, reject) => {
    try {


      // Get constants
      const DEFAULT_CENTER = center || window.HiddenGems.constants.DEFAULT_CENTER; // berkeley default
      const DEFAULT_ZOOM = zoom || window.HiddenGems.constants.DEFAULT_ZOOM;

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

        // Get the gems data from the HiddenGems namespace
        const initialGems = window.HiddenGems.data?.pageGems || [];

        if (initialGems.length > 0) {
          console.log(`Found ${initialGems.length} initial gems to load`);
          // Initialize the UI with initial gems
          renderGems(initialGems);
        }

        // Notify that the map is ready
        window.notifyMapReady && window.notifyMapReady();

        // Dispatch standard event for other components
        document.dispatchEvent(new CustomEvent('mapReady', {
          bubbles: true
        }));

        resolve(map);
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

  function centerCard(gem, index) {
        const activeIndex = index;
        const activeGem = gem;

        if (activeGem) {
            // Use the unified coordinate utility
            const coords = window.HiddenGems.data.coordUtils.fromGem(activeGem);
            console.log("active gem:", activeGem)
            console.log("active index:", activeIndex);
            if (coords) {
 
                window.map.flyTo({
                  center: coords,
                  zoom: window.map.getZoom()
                });

          
            } else {
                console.warn(`Invalid coordinates for gem at index ${activeIndex}`);
            }
        }
    };



// Initialize gem cards when gems are loaded
// This is a single, central event handler for card initialization
document.addEventListener('gemsLoaded', function(e) {
  // Get gems from the event or fallback to global data
  const gems = e.detail?.gems || window.HiddenGems.data?.pageGems || [];

  const pageName = e.detail?.pageName || window.HiddenGems.map.currentPage;
  console.log(`Page name for gem cards: ${pageName}`);
  
  console.log(`gemsLoaded event received with ${gems.length} gems`);
  
  // Prevent duplicate initialization
  if (!cardsInitialized && gems.length > 0) {
    console.log('Initializing gem cards for the first time');
    
    const gemCards = new HiddenGems.GemCards({
      containerId: 'gem-cards-container',
      variant: pageName,
      onCardChange: function(gem, index) {
        centerCard(gem, index);
        console.log(`Card changed to gem: ${gem.name} at index ${index}`);
      },
      onMarkerHighlight: function(gem, index) {
        console.log(`Highlighting marker for: ${gem.name}`);
      },
      onExplore: function(gem, index) {
        navigateToGemDetails(gem);
      },
    });
    
    // Store the cards instance for future reference
    window.HiddenGems.gemCards = gemCards;
    
    // Load gems data
    gemCards.loadGems(gems);
    
    // Mark as initialized to prevent duplicates
    cardsInitialized = true;
    
    console.log('Gem cards successfully initialized with data:', gemCards);
   // Ensure first card is activated
    setTimeout(() => {
      const container = document.getElementById('gem-cards-container');
      if (container) {
        const cards = container.querySelectorAll('.gem-card');
        const activeCards = container.querySelectorAll('.gem-card.active');
        
        if (cards.length > 0 && activeCards.length === 0) {
          console.log('No active cards found - activating the first card');
          cards[0].classList.add('active');
          
          // Update the active index in the gemCards instance
          if (window.HiddenGems.gemCards) {
            window.HiddenGems.gemCards.activeIndex = 0;
            
            // Trigger the change callback if it exists
            if (typeof window.HiddenGems.gemCards.onCardChange === 'function' && gems[0]) {
              window.HiddenGems.gemCards.onCardChange(gems[0], 0);
            }
          }
        }
      }
    }, 200);
  } else if (cardsInitialized) {
    // If already initialized, just update the existing instance
    console.log('Updating existing gem cards with new data');
    if (window.HiddenGems.gemCards) {
      window.HiddenGems.gemCards.loadGems(gems);
      
      // Check if any card is active after update
      setTimeout(() => {
        const container = document.getElementById('gem-cards-container');
        if (container) {
          const cards = container.querySelectorAll('.gem-card');
          const activeCards = container.querySelectorAll('.gem-card.active');
          
          if (cards.length > 0 && activeCards.length === 0) {
            console.log('No active cards found after update - activating the first card');
            cards[0].classList.add('active');
            
            // Update the active index in the gemCards instance
            if (window.HiddenGems.gemCards) {
              window.HiddenGems.gemCards.activeIndex = 0;
              
              // Trigger the change callback if it exists
              if (typeof window.HiddenGems.gemCards.onCardChange === 'function' && gems[0]) {
                window.HiddenGems.gemCards.onCardChange(gems[0], 0);
              }
            }
          }
        }
      }, 200);
    }
  }
});

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
function loadGemsWithDataController(pageName, center, buffer = 10, sampleSize = 10, originCoord, destinationCoord) {
  if (!window.HiddenGems || !window.HiddenGems.data) {
    return Promise.reject(new Error('Data controller not available'));
  }

  // Show loading indicator if available
  if (window.HiddenGems.data.utils && window.HiddenGems.data.utils.showLoading) {
    window.HiddenGems.data.utils.showLoading('Finding hidden gems...');
  }

  // Ensure data controller is initialized
  return window.HiddenGems.data.initialize()
    .then(() => {
      // Check if we're on a page other than index and should use route-based loading
      const isNotIndexPage = pageName !== 'index';

      if (isNotIndexPage) {
        console.log(`Loading gems along route for non-index page: ${pageName}`);

        const originName = window.HiddenGems.data.storage.get('originName');
        const destinationName = window.HiddenGems.data.storage.get('destinationName');
        const originCoords = window.HiddenGems.data.coordUtils.normalize(JSON.parse(window.HiddenGems.data.storage.get('originCoords')));
        const destinationCoords = window.HiddenGems.data.coordUtils.normalize(JSON.parse(window.HiddenGems.data.storage.get('destinationCoords')));
        console.log(originCoords, destinationCoords);

        // Use default values if not provided
        const safeSampleSize = sampleSize || window.HiddenGems.constants.DEFAULT_LIMIT;
        const bufferDistance = window.HiddenGems.constants.DEFAULT_BUFFER;

        console.log(`Finding gems along route from [${originName}] to [${destinationName}]`);

        // Use findGemsAlongRoute from data-controller
        return window.HiddenGems.data.findGemsAlongRoute(
          'map-recs',
          originCoords,
          destinationCoords,
          bufferDistance,
          safeSampleSize,
          originName,
          destinationName
        );
      }
      // If on index page and center coordinates provided, find gems near that location
      else if (center && center.length === 2) {
        window.map.setCenter(center);
        const safeRadius = window.HiddenGems.constants.DEFAULT_RADIUS;
        const safeSampleSize = sampleSize || window.HiddenGems.constants.DEFAULT_LIMIT;
        const safeCenter = window.HiddenGems.data.coordUtils.normalize(center);
        console.log(`Finding gems near center [${safeCenter}] with radius ${safeRadius}km`);

        return window.HiddenGems.data.getRegionalGems({
          regionName: pageName || 'current-page',
          center: safeCenter,
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
      if (window.HiddenGems.data.utils && window.HiddenGems.data.utils.hideLoading) {
        window.HiddenGems.data.utils.hideLoading();
      }

      return gems;
    })
    .catch(error => {
      console.error('Error loading gems:', error);

       // Hide loading indicator
      if (window.HiddenGems.data.utils && window.HiddenGems.data.utils.hideLoading) {
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

function createMarker(lngLat, color) {
  return new maplibregl.Marker({
    color: color,
    anchor: 'center',
    offset: [0, 0]
  })
    .setLngLat(lngLat)
    .addTo(window.map);
}

/**
 * Function to render gems on the map
 * @param {Array} gems - Array of gem objects
 * @returns {Array} Array of gems that were successfully rendered
 */
function renderGems(gems) {
  // Proper validation of gems array
  if (!gems || !Array.isArray(gems) || gems.length === 0) {
    console.warn('No gems to render');
    showNoGemsMessage();
    return [];

  }

  clearMarkers();

  // First, ensure any lingering loading elements are removed
  const loadingElements = document.querySelectorAll('[id$="-loading"]');
  loadingElements.forEach(el => {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });


  // Clear any existing routes
  if (window.HiddenGems.map && typeof window.HiddenGems.map.clearRoutes === 'function') {
    window.HiddenGems.map.clearRoutes();
  }

  // Make sure map is available
  if (!map) {
    console.error('Map not initialized, cannot render gems');
    return [];
  }

  window.markers = [];
  const bounds = new maplibregl.LngLatBounds();


  // Track number of valid gems rendered
  let validGemsCount = 0;
  const validGems = [];

  // Get icon paths from constants
  const ICON_PATHS = window.HiddenGems.constants.ICON_PATHS;

  gems.forEach((gem, index) => {
    const coords = gem.coordinates;
    if (!coords || coords.length !== 2) return;

    // Normalize coordinates using unified coordinate utility
    const lngLat = window.HiddenGems.data.coordUtils.fromGem(gem);

    // Create marker DOM element
    const el = document.createElement('div');
    el.className = 'gem-marker';
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.cursor = 'pointer';
    validGemsCount++;
    validGems.push(gem);


    // Store gem ID for synchronization
    const gemId = gem.id || gem.index || `gem-${index}`;

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

    // Add color to the marker
    el.style.backgroundColor = gem.color;
    el.style.borderRadius = '50%';
    el.style.border = '2px solid white';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

    // Store gem ID for synchronization
    el.setAttribute('data-gem-id', gemId.toString());
    el.setAttribute('data-index', index.toString());

    // Create and add marker to map
    //const marker = createMarker(lngLat, gem.color);

    // Add to markers array
    //window.markers.push(marker);

    // Extend bounds
    bounds.extend(lngLat);
  });

  // Store valid gems in the data controller for consistency
  if (window.HiddenGems && window.HiddenGems.data) {
    window.HiddenGems.data.pageGems = validGems;

    // Also save to sessionStorage through data controller
    if (window.HiddenGems.data.storage && window.HiddenGems.data.storage.setSession) {
      window.HiddenGems.data.storage.setSession('pageGems', validGems);
    }
  }

  // Log results
  console.log(`Rendered ${validGemsCount} valid gems out of ${gems.length} total`);

  // Fit map to bounds if we have markers
  if (window.markers.length > 0 && !bounds.isEmpty()) {
    window.map.fitBounds(bounds, {
      padding: 40,
      animate: true,
      duration: 1000,
      maxZoom: 14  // Don't zoom in too far
    });
  }

   // Dispatch a custom event AFTER all rendering is complete
  setTimeout(() => {
    console.log('Dispatching gemsLoaded event with', validGems.length, 'gems');
    document.dispatchEvent(new CustomEvent('gemsLoaded', {
      detail: { gems: validGems,
        pageName: window.HiddenGems.map.currentPage || 'index'
       }
    }));
  }, 100);

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
  // Check if markers array exists and has items
  if (window.markers && Array.isArray(window.markers)) {
    // Remove each marker from the map
    window.markers.forEach(marker => {
      if (marker && typeof marker.remove === 'function') {
        marker.remove();
      }
    });

    // Reset the array
    window.markers = [];

    console.log('All markers cleared from map');
  }
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
        userGems = JSON.parse(window.HiddenGems.data.storage.get('userGems') || '[]');
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