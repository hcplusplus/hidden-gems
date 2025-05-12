/**
 * complete-fix.js - Comprehensive solution to prevent any rendering
 * before user interaction on the index page
 */

// Execute immediately to block any existing initialization
(function() {
    console.log("Applying complete initialization block");
    
    // Check if we're on the index page
    const isIndexPage = window.location.pathname.endsWith('index.html') || 
                        window.location.pathname.endsWith('/') ||
                        window.location.pathname === '';
    
    console.log(`Current page detected as ${isIndexPage ? 'index' : 'non-index'} page`);
    
    // Only apply full blocking on the index page
    if (!isIndexPage) {
        console.log("Not on index page - skipping initialization blocking");
        return;
    }
    
    // Create a global namespace for storing original functions
    if (!window._hiddenGemsOriginalFunctions) {
        window._hiddenGemsOriginalFunctions = {};
    }
    
    // 1. Override initializeMap
    if (window.initializeMap) {
        // Store the original function in our namespace
        window._hiddenGemsOriginalFunctions.initializeMap = window.initializeMap;
        
        console.log("DEBUG - Storing original initializeMap function");
        
        // Replace with our blocking version
        window.initializeMap = function() {
            console.log("⛔ Blocked automatic map initialization");
            // Store the arguments for later use
            window._hiddenGemsOriginalFunctions.initializeMapArgs = arguments;
            return Promise.resolve(null); // Return a promise to avoid errors
        };
    }

    if (window.renderGems) {
        window._hiddenGemsOriginalFunctions.renderGems = window.renderGems;
        console.log("DEBUG - Storing original renderGems function");
 // Replace with our blocking version
    window.renderGems = function() {
        console.log("⛔ Blocked automatic gem rendering");
        // Store the arguments for later use
        window._hiddenGemsOriginalFunctions.renderGemsArgs = arguments;
        return []; // Return empty array to avoid errors
    }
};


    // 2. Block initializeAppDirectly
    if (window.initializeAppDirectly) {
        const originalInitAppDirectly = window.initializeAppDirectly;
        window.initializeAppDirectly = function () {
            console.log("⛔ Blocked automatic app initialization");
            // We'll just use this as a signal to show the welcome message
            setTimeout(() => {
                const welcomeOverlay = document.getElementById('welcome-overlay');
                if (welcomeOverlay) {
                    welcomeOverlay.style.display = 'flex';
                    if (typeof window.showWelcomeMessage === 'function') {
                        window.showWelcomeMessage();
                    }
                }
            }, 0);
            return null;
        };
    }

    // 3. Create a global flag for tracking initialization state
    window.HiddenGems = window.HiddenGems || {};
    window.HiddenGems.userHasInteracted = false;

    // 4. Create a new function to actually initialize the app after user interaction
    window.actuallyInitializeApp = function (options) {
        console.log("🚀 Actual app initialization triggered by user interaction", options);

    // Debug
    console.log("DEBUG - Original functions exist:", !!window._hiddenGemsOriginalFunctions);
    if (window._hiddenGemsOriginalFunctions) {
        console.log("DEBUG - Original initializeMap exists:", 
                   !!window._hiddenGemsOriginalFunctions.initializeMap);
    }
    
    // Set the user interaction flag
    window.HiddenGems = window.HiddenGems || {};
    window.HiddenGems.userHasInteracted = true;

    
    // Get pageName from options or default to "index"
    const pageName = options.pageName || "index";
    
    // Show loading
    if (window.HiddenGems && window.HiddenGems.utils && window.HiddenGems.utils.showLoading) {
        window.HiddenGems.utils.showLoading("Loading gems...");
    }
    
    // Execute any pending initializations in correct order
        // 1. First initialize map
        let mapPromise;
        
        if (window._hiddenGemsOriginalFunctions && window._hiddenGemsOriginalFunctions.initializeMap) {
        console.log("Using stored original initializeMap function");
        
        // Get the original function
        const originalInitializeMap = window._hiddenGemsOriginalFunctions.initializeMap;
        
        // Restore it globally
        window.initializeMap = originalInitializeMap;
        
        // Call it with coordinates if available
        if (options && options.coordinates) {
            mapPromise = originalInitializeMap(options.coordinates);
        } else {
            // Use stored args if available
            if (window._hiddenGemsOriginalFunctions.initializeMapArgs) {
                mapPromise = originalInitializeMap.apply(window, 
                                      window._hiddenGemsOriginalFunctions.initializeMapArgs);
            } else {
                mapPromise = originalInitializeMap();
            }
        }
    } else {
        console.warn("Original initializeMap function not found, using current version");
        mapPromise = window.initializeMap(options && options.coordinates);
    }
    
    // Handle the map promise
    mapPromise
        .then(mapInstance => {
            window.map = mapInstance;
            
            // Dispatch map ready event
            document.dispatchEvent(new CustomEvent('mapReady', { bubbles: true }));
            
            // Execute additional initialization logic
            initializeAfterMapReady(options, pageName);
        })
        .catch(err => {
            console.error("Error initializing map:", err);
            
            // Hide loading
            if (window.HiddenGems && window.HiddenGems.utils && window.HiddenGems.utils.hideLoading) {
                window.HiddenGems.utils.hideLoading();
            }
            
            // Show error if possible
            if (typeof showErrorMessage === 'function') {
                showErrorMessage("Failed to initialize map: " + (err.message || "Unknown error"));
            }
        });
};

    // Function to handle initialization after map is ready
    function initializeAfterMapReady(options, pageName = "index") {
        console.log("Map is ready, proceeding with gem initialization");

         // Restore renderGems function if it was blocked
        if (window._hiddenGemsOriginalFunctions && window._hiddenGemsOriginalFunctions.renderGems) {
            console.log("Restoring original renderGems function");
            window.renderGems = window._hiddenGemsOriginalFunctions.renderGems;
        }

        // If we have coordinates from the user, use them to load gems
        if (options && options.coordinates) {
            console.log("Using user-provided coordinates:", options.coordinates);

            // Store coordinates for use across the app
            sessionStorage.setItem('userCoords', JSON.stringify(options.coordinates));

            // Try to use modern data controller if available
            if (window.HiddenGems && window.HiddenGems.data) {
                // Use HiddenGems.data.findNearbyGems with pageName
                if (typeof window.HiddenGems.data.findNearbyGems === 'function') {
                    window.HiddenGems.data.findNearbyGems(pageName, 10, 30)
                        .then(gems => {
                            console.log(`Found ${gems.length} gems near location for ${pageName}`);

                            // Initialize cards with the gems
                            const indexCards = document.querySelector('gem-cards[variant="index"]');
                            if (indexCards && typeof indexCards.setGems === 'function') {
                                indexCards.setGems(gems);
                            }

                            // Update map markers
                            if (window._pendingRenderGems) {
                                window.renderGems = window._pendingRenderGems.fn;
                                delete window._pendingRenderGems;
                            }

                            if (typeof window.renderGems === 'function') {
                                window.renderGems(gems);
                            }

                            // Hide loading
                            if (window.HiddenGems && window.HiddenGems.utils) {
                                window.HiddenGems.utils.hideLoading();
                            }

                            // Dispatch final initialization event
                            document.dispatchEvent(new CustomEvent('appReady', {
                                bubbles: true,
                                detail: { pageName: pageName }
                            }));

                            // Set the global initialization flag
                            if (window.HiddenGems) {
                                window.HiddenGems.initialized = true;
                            }
                        })
                        .catch(error => {
                            console.error(`Error finding nearby gems for ${pageName}:`, error);

                            // Hide loading
                            if (window.HiddenGems && window.HiddenGems.utils) {
                                window.HiddenGems.utils.hideLoading();
                            }
                        });
                }
                // Fallback if findNearbyGems not available but data controller is
                else if (typeof window.HiddenGems.map?.loadGems === 'function') {
                    window.HiddenGems.map.loadGems(pageName, options.coordinates, 30, 10);
                }
            }
            // Fallback to simpler methods if modern controller not available
            else if (window._pendingLoadGems) {
                // Restore original loadGems function
                window.loadGems = window._pendingLoadGems.fn;
                delete window._pendingLoadGems;

                // Use with user coordinates
                if (typeof window.loadGems === 'function') {
                    window.loadGems({ center: options.coordinates });
                }
            }
            else {
                // Very basic fallback
                fetch('static/assets/data/hidden_gems.json')
                    .then(response => response.json())
                    .then(gems => {
                        // Restore original renderGems function
                        if (window._pendingRenderGems) {
                            window.renderGems = window._pendingRenderGems.fn;
                            delete window._pendingRenderGems;
                        }

                        if (typeof window.renderGems === 'function') {
                            window.renderGems(gems);
                        }

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
        // If no coordinates provided, just restore original functions
        else {
            if (window._pendingLoadGems) {
                window.loadGems = window._pendingLoadGems.fn;
                if (typeof window.loadGems === 'function') {
                    window.loadGems();
                }
                delete window._pendingLoadGems;
            }

            if (window._pendingRenderGems) {
                window.renderGems = window._pendingRenderGems.fn;
                delete window._pendingRenderGems;
            }
        }
    }
})();

// Once the DOM is loaded, set up the welcome logic
document.addEventListener('DOMContentLoaded', function () {
    console.log("Setting up welcome logic with complete initialization blocking");

    // Find the welcome overlay
    const welcomeOverlay = document.getElementById('welcome-overlay');
    if (!welcomeOverlay) {
        console.error("Welcome overlay not found!");
        return;
    }

    // Make sure the overlay is visible
    welcomeOverlay.style.display = 'flex';

    // Clear any existing content and set up welcome message
    welcomeOverlay.innerHTML = ''; // Clear existing content
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

    // Create location message
    const locationMessage = document.createElement('div');
    locationMessage.style.color = '#555';
    locationMessage.style.fontSize = '14px';
    locationMessage.style.margin = '15px 0';
    locationMessage.style.padding = '10px';
    locationMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
    locationMessage.style.borderRadius = '8px';
    locationMessage.innerHTML = '🗺️ <b>Choose how you want to explore</b>';

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
    locationMessage.innerHTML = '🔍 <b>Requesting your location...</b>';
    locationButton.disabled = true;
    locationButton.style.opacity = '0.7';
    locationButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Request geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            // Success callback
            (position) => {
                // We got the location, now update the UI
                locationMessage.innerHTML = '✅ <b>Location found!</b> Loading gems near you...';
                
                // Get coordinates
                const userCoords = [position.coords.longitude, position.coords.latitude];
                console.log("User location:", userCoords);
                
                // Store location in localStorage and sessionStorage for other pages
                localStorage.setItem('userCoords', JSON.stringify(userCoords));
                sessionStorage.setItem('userCoords', JSON.stringify(userCoords));
                localStorage.setItem('locationPermissionGranted', 'true');
                
                // Hide the welcome overlay with animation
                welcomeOverlay.style.opacity = '0';
                setTimeout(() => {
                    welcomeOverlay.style.display = 'none';
                    
                    // Initialize the app with user coordinates and pageName
                    window.actuallyInitializeApp({
                        useGeolocation: true,
                        coordinates: userCoords,
                        pageName: "index"  // Explicitly set pageName
                    });
                }, 500);
            },
                // Error callback
                (error) => {
                    console.error("Geolocation error:", error);

                    // Update UI to show error
                    locationMessage.style.color = '#cc0000';
                    locationMessage.innerHTML = '❌ <b>Location access denied or unavailable.</b>';

                    // Re-enable the button
                    locationButton.disabled = false;
                    locationButton.style.opacity = '1';
                    locationButton.innerHTML = '<i class="fas fa-location-arrow"></i> Try Again';

                    // Store that we've failed to get location
                    localStorage.setItem('locationPermissionDenied', 'true');
                }
            );
        } else {
            // Browser doesn't support geolocation
            locationMessage.style.color = '#cc0000';
            locationMessage.innerHTML = '❌ <b>Your browser doesn\'t support geolocation.</b>';

            // Re-enable the button with different text
            locationButton.disabled = false;
            locationButton.style.opacity = '1';
            locationButton.innerHTML = '<i class="fas fa-location-arrow"></i> Not Available';
        }
    });

    // Add event listener for browse button
browseButton.addEventListener('click', function() {
    // Berkeley coordinates as fallback [lng, lat]
    const berkeleyCoords = window.HiddenGems.constants.DEFAULT_CENTER;
    
    // Store default coordinates
    localStorage.setItem('defaultCoords', JSON.stringify(berkeleyCoords));
    sessionStorage.setItem('defaultCoords', JSON.stringify(berkeleyCoords));
    
    // Hide the welcome overlay with animation
    welcomeOverlay.style.opacity = '0';
    setTimeout(() => {
        welcomeOverlay.style.display = 'none';
        
        // Initialize the app with Berkeley coordinates and pageName
        window.actuallyInitializeApp({
            useGeolocation: false,
            coordinates: berkeleyCoords,
            pageName: "index"  // Explicitly set pageName
        });
    }, 500);
});

    // Add event listener for quiz button (navigate to quiz page)
    quizButton.addEventListener('click', function () {
        window.location.href = 'gtky.html';
    });

    // Assemble the welcome message
    buttonsContainer.appendChild(locationButton);
    buttonsContainer.appendChild(browseButton);
    buttonsContainer.appendChild(quizButton);

    welcomeContainer.appendChild(welcomeTitle);
    welcomeContainer.appendChild(welcomeSubtitle);
    welcomeContainer.appendChild(locationMessage);
    welcomeContainer.appendChild(buttonsContainer);

    // Add to the welcome overlay
    welcomeOverlay.appendChild(welcomeContainer);

    // Mark welcome as seen in localStorage
    localStorage.setItem('welcomeShown', 'true');

    // Override any global showWelcomeMessage function
    window.showWelcomeMessage = function () {
        console.log("Redirecting to our enhanced welcome message setup");
        setupWelcomeMessage(welcomeOverlay);
    };
}