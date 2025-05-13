// Execute immediately to block any existing initialization
(function() {
    // Add these just before your original renderGems function wrapper
/*const doubleCheckRender = window.renderGems;
window.renderGems = function(gems) {
    console.log("========== START renderGems DEBUGGING ==========");
    console.log("Input gems:", gems);
    console.log("typeof gems:", typeof gems);
    console.log("Array.isArray(gems):", Array.isArray(gems));
    console.log("gems?.length:", gems?.length);
    
    // Test the exact condition
    const condition = !gems || !Array.isArray(gems) || gems.length === 0;
    console.log("Condition check (!gems || !Array.isArray(gems) || gems.length === 0):", condition);
    console.log("!gems:", !gems);
    console.log("!Array.isArray(gems):", !Array.isArray(gems));
    console.log("gems.length === 0:", gems?.length === 0);
    
    const result = doubleCheckRender(gems);
    console.log("========== END renderGems DEBUGGING ==========");
    return result;
};
    // Create a completely new renderGems function
const originalRenderGems = window.renderGems;

// Replace the original renderGems with a simplified, reliable version
window.renderGems = function(gems) {
    console.log(`Rendering ${gems?.length || 0} gems on map`);
    
    // Basic validation
    if (!gems || !Array.isArray(gems) || gems.length === 0) {
        console.warn("No valid gems to render");
        return [];
    }
    
    // Make sure map is available
    if (!window.map) {
        console.error("Map not initialized, cannot render gems");
        return [];
    }
    
    // Clear existing markers
    if (typeof window.clearMarkers === 'function') {
        window.clearMarkers();
    } else {
        // Simple fallback for clearing markers
        if (window.markers && Array.isArray(window.markers)) {
            window.markers.forEach(marker => {
                if (marker && typeof marker.remove === 'function') {
                    marker.remove();
                }
            });
        }
        window.markers = [];
    }
    
    // Create markers array
    window.markers = [];
    
    // Get bounds object for map fitting
    const bounds = new maplibregl.LngLatBounds();
    
    // Process each gem
    gems.forEach((gem, index) => {
        const coords = gem.coordinates;
        if (!coords || coords.length !== 2) {
            return; // Skip invalid gems
        }
        
        // Use coordinates directly
        const lngLat = [coords[0], coords[1]];
        
        // Create marker DOM element
        const el = document.createElement('div');
        el.className = 'gem-marker';
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.cursor = 'pointer';
        
        // Determine gem color based on properties (simplified)
        let markerColor = '#4285F4'; // Default blue
        
        if (gem.popularity !== undefined) {
            // Color based on popularity
            markerColor = gem.popularity < 2 ? '#EA4335' : // Red for low popularity
                           gem.popularity < 4 ? '#9C27B0' : // Purple for medium
                           '#4285F4'; // Blue for high popularity
        } else if (gem.type === 'hidden-beach' || gem.type === 'secret-trail' || gem.type === 'natural-wonder') {
            markerColor = '#EA4335'; // Red for special types
        }
        
        // Add color to the marker
        el.style.backgroundColor = markerColor;
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        
        // Store gem ID for synchronization
        const gemId = gem.id || gem.index || `gem-${index}`;
        el.setAttribute('data-gem-id', gemId.toString());
        el.setAttribute('data-index', index.toString());
        
        // Add click handler
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            // Update active gem index
            window.activeGemIndex = index;
            if (window.HiddenGems && window.HiddenGems.map) {
                window.HiddenGems.map.activeGemIndex = index;
            }
            
            // Highlight the clicked marker
            document.querySelectorAll('.gem-marker').forEach(marker => {
                marker.style.transform = 'scale(1)';
                marker.style.zIndex = '1';
            });
            el.style.transform = 'scale(1.4)';
            el.style.zIndex = '10';
            
            // Center map on gem
            window.map.flyTo({
                center: lngLat,
                essential: true,
                duration: 800,
                zoom: Math.max(window.map.getZoom(), 14) // Ensure we're zoomed in enough
            });
            
            // Dispatch event
            document.dispatchEvent(new CustomEvent('gemSelected', {
                detail: {
                    index: index,
                    id: gemId,
                    gem: gem
                }
            }));
        });
        
        // Create and add marker to map
        const marker = new maplibregl.Marker({
            element: el,
            anchor: 'center'
        })
        .setLngLat(lngLat)
        .addTo(window.map);
        
        // Add to markers array
        window.markers.push(marker);
        
        // Extend bounds
        bounds.extend(lngLat);
    });
    
    // Fit map to bounds if we have markers
    if (window.markers.length > 0 && !bounds.isEmpty()) {
        window.map.fitBounds(bounds, {
            padding: 40,
            animate: true,
            duration: 1000,
            maxZoom: 14  // Don't zoom in too far
        });
    }
    
    console.log(`Successfully rendered ${window.markers.length} gems`);
    
    // Store valid gems in the data controller for consistency
    if (window.HiddenGems && window.HiddenGems.data) {
        window.HiddenGems.data.pageGems = gems;
    }
    
    // Dispatch event that gems were loaded
    document.dispatchEvent(new CustomEvent('gemsLoaded', {
        detail: { gems: gems }
    }));
    
    return gems;
};*/
    // Enable more detailed logging for debugging
    console.debug = console.log.bind(console);
    console.info = console.log.bind(console);
    console.log("⚙️ Delayed initialization module loading");
    
    // Check if we're on the index page
    const isIndexPage = window.location.pathname.endsWith('index.html') || 
                        window.location.pathname.endsWith('/') ||
                        window.location.pathname === '';
    
    console.log(`📍 Current page detected as ${isIndexPage ? 'index' : 'non-index'} page`);
    
    // Only apply initialization changes on the index page
    if (!isIndexPage) {
        console.log("📍 Not on index page - skipping initialization blocking");
        return;
    }
    
    // Create a global object for debugging
    window.HiddenGemsDebug = {
        logs: [],
        originalFunctions: {},
        log: function(message, type = 'info') {
            const entry = { time: new Date(), message, type };
            this.logs.push(entry);
            console.log(`🗺️ [${type}] ${message}`);
            return entry;
        }
    };

    // Store original functions for debugging
    if (window.initializeMap) {
        window.HiddenGemsDebug.originalFunctions.initializeMap = window.initializeMap;
        window.HiddenGemsDebug.log("Stored original initializeMap function", "debug");
    }
    
    if (window.renderGems) {
        window.HiddenGemsDebug.originalFunctions.renderGems = window.renderGems;
        window.HiddenGemsDebug.log("Stored original renderGems function", "debug");
    }
    
    // Create a global flag for tracking initialization state
    window.HiddenGems = window.HiddenGems || {};
    window.HiddenGems.userHasInteracted = false;

    // Function to initialize the app after user interaction
    window.initializeFromWelcomeScreen = function(options) {
        window.HiddenGemsDebug.log("🚀 User-triggered initialization with options: " + 
            JSON.stringify(options), "init");
        
        // Set the user interaction flag
        window.HiddenGems.userHasInteracted = true;
        
        // Get pageName from options or default to "index"
        const pageName = options.pageName || "index";
        
        // Show loading indicator
        if (window.HiddenGems?.utils?.showLoading) {
            window.HiddenGems.utils.showLoading("Loading gems...");
        }
        
        // Initialize the map
        return initializeMap(options.pageName, options.coordinates)
            .then(mapInstance => {
                window.HiddenGemsDebug.log("Map initialized successfully", "init");
                window.map = mapInstance;
                
                // Load gems based on coordinates
                return loadGemsForLocation(options.coordinates, options.pageName, options.useGeolocation);
            })
            .catch(err => {
                window.HiddenGemsDebug.log("Error during initialization: " + err.message, "error");
                
                // Hide loading indicator
                if (window.HiddenGems?.utils?.hideLoading) {
                    window.HiddenGems.utils.hideLoading();
                }
                
                // Show error if possible
                if (typeof showErrorMessage === 'function') {
                    showErrorMessage("Failed to initialize: " + err.message);
                }
            });
    };
    
    // Helper function to initialize the map
    function initializeMap(pageName, coordinates) {
        window.HiddenGemsDebug.log("Initializing map for " + pageName, "map");
        
        // Use coordinates if provided, otherwise use defaults
        const center = coordinates || window.HiddenGems.constants.DEFAULT_CENTER;
        
        // Initialize the map without loading gems
        try {
            return window.HiddenGemsDebug.originalFunctions.initializeMap(pageName, center);
        } catch (error) {
            window.HiddenGemsDebug.log("Error in map initialization: " + error.message, "error");
            return Promise.reject(error);
        }
    }
    
    // Helper function to load gems for a location
    function loadGemsForLocation(coordinates, pageName, useGeolocation) {
    window.HiddenGemsDebug.log("Loading gems for location", "gems");
    
    // Store coordinates based on source
    if (useGeolocation === true) {
        window.HiddenGemsDebug.log("Using actual user coordinates from geolocation", "geo");
        window.HiddenGems.data.storage.set('userCoords', JSON.stringify(coordinates));
        localStorage.setItem('locationPermissionGranted', 'true');
    } else {
        window.HiddenGemsDebug.log("Using default/selected coordinates (not geolocation)", "geo");
        window.HiddenGems.data.storage.set('defaultCoords', JSON.stringify(coordinates));
    }
    
    // Use the map controller's loading method to get gems
    if (window.HiddenGems?.map?.loadGems) {
        return window.HiddenGems.map.loadGems(pageName, coordinates, 10, 10)
            .then(gems => {
                window.HiddenGemsDebug.log(`Found ${gems.length} gems for ${pageName}`, "gems");
                
                // Direct gem rendering - bypass the automatic rendering in loadGems
                if (window.renderGems && typeof window.renderGems === 'function') {
                    window.HiddenGemsDebug.log(`Directly rendering ${gems.length} gems on map`, "render");
                    try {
                        window.renderGems(gems);
                    } catch (renderError) {
                        window.HiddenGemsDebug.log(`Error rendering gems: ${renderError}`, "error");
                    }
                }
                
                // Initialize card components if available
                const indexCards = document.querySelector('gem-cards[variant="index"]');
                if (indexCards && typeof indexCards.setGems === 'function') {
                    indexCards.setGems(gems);
                }
                
                // Set initialization flag
                window.HiddenGems.initialized = true;
                
                // Dispatch app ready event
                document.dispatchEvent(new CustomEvent('appReady', {
                    bubbles: true,
                    detail: { 
                        pageName: pageName,
                        useGeolocation: useGeolocation || false
                    }
                }));
                
                // Hide loading indicator
                if (window.HiddenGems?.utils?.hideLoading) {
                    window.HiddenGems.utils.hideLoading();
                }
                
                return gems;
            })
            .catch(error => {
                window.HiddenGemsDebug.log(`Error finding gems: ${error.message}`, "error");
                
                // Hide loading indicator
                if (window.HiddenGems?.utils?.hideLoading) {
                    window.HiddenGems.utils.hideLoading();
                }
                
                throw error;
            });
    } else {
        window.HiddenGemsDebug.log("Map controller's loadGems function not available", "error");
        return Promise.reject(new Error("Map controller not properly initialized"));
    }
}
})();

// Once the DOM is loaded, set up the welcome screen
document.addEventListener('DOMContentLoaded', function() {
    console.log("Setting up welcome screen");
    
    // Find or create the welcome overlay
    let welcomeOverlay = document.getElementById('welcome-overlay');
    if (!welcomeOverlay) {
        console.error("Welcome overlay not found!");
        return;
    }
    
    // Make sure the overlay is visible
    welcomeOverlay.style.display = 'flex';
    
    // Clear any existing content and set up welcome message
    welcomeOverlay.innerHTML = '';
    setupWelcomeMessage(welcomeOverlay);
});

/**
 * Set up the welcome message with initialization buttons
 * @param {HTMLElement} welcomeOverlay - The overlay element
 */
function setupWelcomeMessage(welcomeOverlay) {
    // Create welcome container
    const welcomeContainer = document.createElement('div');
    welcomeContainer.className = 'welcome-container';
    
    // Create title
    const welcomeTitle = document.createElement('div');
    welcomeTitle.className = 'welcome-title';
    welcomeTitle.innerText = 'Discover Hidden Gems in Northern California';
    
    // Create subtitle
    const welcomeSubtitle = document.createElement('div');
    welcomeSubtitle.className = 'welcome-subtitle';
    welcomeSubtitle.innerText = 'Find off-the-beaten-path adventures near you';
    
    // Create status message area
    const statusMessage = document.createElement('div');
    statusMessage.id = 'welcome-status';
    statusMessage.style.color = '#555';
    statusMessage.style.fontSize = '14px';
    statusMessage.style.margin = '15px 0';
    statusMessage.style.padding = '10px';
    statusMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
    statusMessage.style.borderRadius = '8px';
    statusMessage.innerHTML = '🗺️ <b>Choose how you want to explore</b>';
    
    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'welcome-buttons';
    
    // Create location button
    const locationButton = document.createElement('button');
    locationButton.className = 'welcome-button primary';
    locationButton.innerHTML = '<i class="fas fa-location-arrow"></i> Share Your Location';
    
    // Create browse button
    const browseButton = document.createElement('button');
    browseButton.id = 'browse-area-btn';
    browseButton.className = 'welcome-button secondary';
    browseButton.innerHTML = '<i class="fas fa-compass"></i> Browse Berkeley Gems';
    
    // Create quiz button
    const quizButton = document.createElement('button');
    quizButton.id = 'take-quiz-btn';
    quizButton.className = 'welcome-button secondary';
    quizButton.innerHTML = '<i class="fas fa-list-check"></i> Take Preference Quiz';
    
    // Add event listener for location button
    locationButton.addEventListener('click', function() {
        // Update UI to show we're processing
        statusMessage.innerHTML = '🔍 <b>Requesting your location...</b>';
        locationButton.disabled = true;
        locationButton.style.opacity = '0.7';
        locationButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Request geolocation
        if (navigator.geolocation) {
            console.log("Requesting user location");
            navigator.geolocation.getCurrentPosition(
                // Success callback
                function(position) {
                    // We got the location
                    statusMessage.innerHTML = '✅ <b>Location found!</b> Loading gems near you...';
                    
                    // Get coordinates
                    const userCoords = [position.coords.longitude, position.coords.latitude];
                    console.log("User location:", userCoords);
                    
                    // Hide the welcome overlay with animation
                    welcomeOverlay.style.opacity = '0';
                    setTimeout(function() {
                        welcomeOverlay.style.display = 'none';
                        
                        // Initialize the app with user coordinates
                        window.initializeFromWelcomeScreen({
                            useGeolocation: true,
                            coordinates: userCoords,
                            pageName: "index"
                        });
                    }, 500);
                },
                // Error callback
                function(error) {
                    console.error("Geolocation error:", error);
                    
                    // Update UI to show error
                    statusMessage.style.color = '#cc0000';
                    statusMessage.innerHTML = '❌ <b>Location access denied or unavailable.</b>';
                    
                    // Re-enable the button
                    locationButton.disabled = false;
                    locationButton.style.opacity = '1';
                    locationButton.innerHTML = '<i class="fas fa-location-arrow"></i> Try Again';
                },
                // Options
                {
                    enableHighAccuracy: false,
                    timeout: 8000,
                    maximumAge: 60000
                }
            );
        } else {
            // Browser doesn't support geolocation
            statusMessage.style.color = '#cc0000';
            statusMessage.innerHTML = '❌ <b>Your browser doesn\'t support geolocation.</b>';
            
            // Re-enable the button with different text
            locationButton.disabled = false;
            locationButton.style.opacity = '1';
            locationButton.innerHTML = '<i class="fas fa-location-arrow"></i> Not Available';
        }
    });
    
    // Add event listener for browse button
    browseButton.addEventListener('click', function() {
        // Get Berkeley coordinates
        const berkeleyCoords = window.HiddenGems.constants.DEFAULT_CENTER;
        
        // Hide the welcome overlay with animation
        welcomeOverlay.style.opacity = '0';
        setTimeout(function() {
            welcomeOverlay.style.display = 'none';
            
            // Initialize the app with Berkeley coordinates
            window.initializeFromWelcomeScreen({
                useGeolocation: false,
                coordinates: berkeleyCoords,
                pageName: "index"
            });
        }, 500);
    });
    
    // Add event listener for quiz button
    quizButton.addEventListener('click', function() {
        window.location.href = 'gtky.html';
    });
    
    // Assemble the welcome message
    buttonsContainer.appendChild(locationButton);
    buttonsContainer.appendChild(browseButton);
    buttonsContainer.appendChild(quizButton);
    
    welcomeContainer.appendChild(welcomeTitle);
    welcomeContainer.appendChild(welcomeSubtitle);
    welcomeContainer.appendChild(statusMessage);
    welcomeContainer.appendChild(buttonsContainer);
    
    // Add to the welcome overlay
    welcomeOverlay.appendChild(welcomeContainer);
    
    // Log that welcome screen is ready
    if (window.HiddenGemsDebug) {
        window.HiddenGemsDebug.log("Welcome screen setup complete", "ui");
    } else {
        console.log("Welcome screen setup complete");
    }
}