/**
 * main.js
 * Main entry point for the Hidden Gems application
 * Now leverages the consolidated data controller for all data operations
 */

// Make sure the HiddenGems namespace exists
window.HiddenGems = window.HiddenGems || {};

// Define application-wide constants
window.HiddenGems.constants = {
    // Default location (Berkeley, CA)
    DEFAULT_CENTER: [-122.2730, 37.8715],
    DEFAULT_ZOOM: 11,
    
    // Search settings
    DEFAULT_RADIUS: 5, // miles
    DEFAULT_LIMIT: 10,
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

// Define utility functions directly on the window.HiddenGems object
window.HiddenGems.utils = {
    // Get previous index with wraparound
    getPrevIndex: function(currentIndex, total) {
        return (currentIndex - 1 + total) % total;
    },
    
    // Get next index with wraparound
    getNextIndex: function(currentIndex, total) {
        return (currentIndex + 1) % total;
    },
    
    // Convert degrees to radians
    toRadians: function(degrees) {
        return degrees * Math.PI / 180;
    },
    
    // Calculate distance between two points in miles
    calculateDistance: function(lat1, lon1, lat2, lon2) {
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
    
    // Fisher-Yates shuffle algorithm
    shuffleArray: function(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    },
    
    // Show loading animation
    showLoading: function(message = 'Loading...') {
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
            loadingEl.innerHTML = message;
            
            document.body.appendChild(loadingEl);
        } else {
            loadingEl.innerHTML = message;
            loadingEl.style.display = 'block';
        }
        
        return loadingEl;
    },
    
    // Hide loading animation
    hideLoading: function() {
        const loadingEl = document.getElementById('gems-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    },
    
    // Validate coordinates
    isValidCoordinate: function(lng, lat) {
        if (isNaN(lng) || isNaN(lat)) return false;
        if (lng < -180 || lng > 180) return false;
        if (lat < -90 || lat > 90) return false;
        return true;
    },
    
    // Escape HTML for safe insertion
    escapeHtml: function(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    
    // Get device size information
    getDeviceSize: function() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isLandscape = width > height;
        
        let deviceCategory = 'phone';
        if (width >= 768 || height >= 768) {
            deviceCategory = 'tablet';
        }
        if (width >= 1024 || height >= 1024) {
            deviceCategory = 'desktop';
        }
        
        return {
            width: width,
            height: height,
            isLandscape: isLandscape,
            deviceCategory: deviceCategory,
            isSmallPhone: height < 600,
            hasSafeArea: CSS.supports('padding: env(safe-area-inset-top)')
        };
    }
};

// Create a map namespace placeholder - will be populated by map-controller.js
window.HiddenGems.map = {
    activeGemIndex: 0,
    
    // Map initialization placeholder
    init: function() {
        return new Promise((resolve) => {
            console.log('Map init placeholder called - waiting for real implementation');
            resolve();
        });
    },
    
    // Function to adjust map for current device
    adjustForDevice: function() {
        const deviceSize = window.HiddenGems.utils.getDeviceSize();
        
        // Adjust card height based on device size
        const cardsContainer = document.querySelector('.cards-container');
        if (cardsContainer) {
            if (deviceSize.isSmallPhone) {
                cardsContainer.style.height = '140px';
            } else if (deviceSize.isLandscape) {
                cardsContainer.style.height = '130px';
            } else {
                cardsContainer.style.height = '170px';
            }
        }
        
        // Adjust map padding
        if (map) {
            const padding = {
                top: deviceSize.isLandscape ? 40 : 60,
                bottom: deviceSize.isLandscape ? 140 : 180,
                left: 20,
                right: 20
            };
            
            if (deviceSize.hasSafeArea) {
                // Add safe area insets for notched phones
                padding.left += 10;
                padding.right += 10;
            }
            
            // Update map bounds padding
            if (typeof map.fitBounds === 'function') {
                this._mapPadding = padding;
            }
        }
    }
};

// Define global functions that can be called from anywhere
window.showLoading = function(message) {
    return window.HiddenGems.utils.showLoading(message);
};

window.hideLoading = function() {
    window.HiddenGems.utils.hideLoading();
};

/**
 * Show welcome message for first-time visitors with blur effect
 */
function showWelcomeMessage() {
    // Get the existing welcome overlay element
    const welcomeOverlay = document.getElementById('welcome-overlay');
    
    // Ensure the overlay cannot be dismissed by clicking outside
    welcomeOverlay.addEventListener('click', function(e) {
        // Only prevent clicks on the overlay background, not the buttons
        if (e.target === welcomeOverlay) {
            e.stopPropagation();
        }
    });
    
    // Clear any existing content
    welcomeOverlay.innerHTML = '';
    
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
    
    // Create browse button (reusing your existing ID)
    const browseButton = document.createElement('button');
    browseButton.id = 'browse-area-btn';
    browseButton.className = 'welcome-button secondary';
    browseButton.innerHTML = '<i class="fas fa-compass"></i> Browse Area Gems';
    
    // Create quiz button (reusing your existing ID)
    const quizButton = document.createElement('button');
    quizButton.id = 'take-quiz-btn';
    quizButton.className = 'welcome-button secondary';
    quizButton.innerHTML = '<i class="fas fa-list-check"></i> Take Preference Quiz';
    
    // Add event listener for location button
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
                        
                        // Initialize the map with user coordinates
                        initializeMap();
                        
                        // Wait for map to be ready, then load gems
                        document.addEventListener('mapReady', function onMapReady() {
                            // Remove this listener to prevent duplicates
                            document.removeEventListener('mapReady', onMapReady);
                            
                            // Fetch and display gems near user location
                            fetch('static/assets/data/hidden_gems.json')
                                .then(response => response.json())
                                .then(allGems => {
                                    // Use data controller to find gems near user
                                    if (window.HiddenGems && window.HiddenGems.data && 
                                        typeof window.HiddenGems.data.findGemsNearUser === 'function') {
                                        return window.HiddenGems.data.findGemsNearUser(
                                            allGems, userCoords, 20, 10
                                        );
                                    } else {
                                        // Simple fallback
                                        return allGems;
                                    }
                                })
                                .then(gems => {
                                    // Render gems on the map
                                    if (typeof window.renderGems === 'function') {
                                        window.renderGems(gems);
                                    }
                                    
                                    // Dispatch gems loaded event
                                    document.dispatchEvent(new CustomEvent('gemsLoaded', {
                                        detail: { gems: gems }
                                    }));
                                });
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
        const berkeleyCoords = [-122.2714, 37.8705];
        
        // Store default coordinates
        localStorage.setItem('defaultCoords', JSON.stringify(berkeleyCoords));
        sessionStorage.setItem('defaultCoords', JSON.stringify(berkeleyCoords));
        
        // Hide the welcome overlay with animation
        welcomeOverlay.style.opacity = '0';
        setTimeout(() => {
            welcomeOverlay.style.display = 'none';
            
            // Initialize the map with Berkeley coordinates
            initializeMap();
            
            // Wait for map to be ready, then load gems
            document.addEventListener('mapReady', function onMapReady() {
                // Remove this listener to prevent duplicates
                document.removeEventListener('mapReady', onMapReady);
                
                // Fetch and display gems near Berkeley
                fetch('static/assets/data/hidden_gems.json')
                    .then(response => response.json())
                    .then(allGems => {
                        // Use data controller to find gems near Berkeley
                        if (window.HiddenGems && window.HiddenGems.data && 
                            typeof window.HiddenGems.data.findGemsNearUser === 'function') {
                            return window.HiddenGems.data.findGemsNearUser(
                                allGems, berkeleyCoords, 20, 10
                            );
                        } else {
                            // Simple fallback
                            return allGems;
                        }
                    })
                    .then(gems => {
                        // Render gems on the map
                        if (typeof window.renderGems === 'function') {
                            window.renderGems(gems);
                        }
                        
                        // Dispatch gems loaded event
                        document.dispatchEvent(new CustomEvent('gemsLoaded', {
                            detail: { gems: gems }
                        }));
                    });
            });
        }, 500);
    });
    
    // Assemble the welcome message
    buttonsContainer.appendChild(locationButton);
    buttonsContainer.appendChild(browseButton);
    buttonsContainer.appendChild(quizButton);
    
    welcomeContainer.appendChild(welcomeTitle);
    welcomeContainer.appendChild(welcomeSubtitle);
    welcomeContainer.appendChild(locationMessage);
    welcomeContainer.appendChild(buttonsContainer);
    
    welcomeOverlay.appendChild(welcomeContainer);
    
    // Mark welcome as seen in localStorage
    localStorage.setItem('welcomeShown', 'true');
}

// Create a safer async initialization that won't throw uncaught errors
async function initApp() {
    try {
        // Show loading indicator
        try {
            window.HiddenGems.utils.showLoading('Starting Hidden Gems...');
        } catch (e) {
            console.warn('Error using namespaced loading function:', e);
            
            // Fallback to direct creation
            const loadingEl = document.createElement('div');
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
            loadingEl.innerHTML = 'Starting Hidden Gems...';
            document.body.appendChild(loadingEl);
        }

           // Show welcome message if needed
        if (!localStorage.getItem('welcomeShown') && typeof showWelcomeMessage === 'function') {
            setTimeout(showWelcomeMessage, 500);
        }
        
        // Initialize map first (returns a promise)
        if (window.HiddenGems.map && typeof window.HiddenGems.map.init === 'function') {
            await window.HiddenGems.map.init();
        } else {
            // Fallback to basic map initialization if namespaced version not available
            if (typeof initializeMap === 'function') {
                initializeMap();
            }
        }
        
        // Initialize preferences if function exists
        if (typeof initializePreferences === 'function') {
            initializePreferences();
        }
        
        console.log('Hidden Gems App initialized successfully!');
        
        // Try to hide loading indicator
        try {
            window.HiddenGems.utils.hideLoading();
        } catch (e) {
            console.warn('Error hiding loading indicator:', e);
            // Fallback approach
            const loadingEl = document.getElementById('gems-loading');
            if (loadingEl) loadingEl.style.display = 'none';
        }
    } catch (err) {
        console.error('Error initializing app:', err);
        
        // Try to hide loading indicator
        try {
            window.HiddenGems.utils.hideLoading();
        } catch (e) {
            const loadingEl = document.getElementById('gems-loading');
            if (loadingEl) loadingEl.style.display = 'none';
        }
        
        // Show error message
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
        errorEl.innerHTML = `<h3>Error Loading App</h3><p>${err.message || 'Unknown error'}</p>`;
        document.body.appendChild(errorEl);
        
        // Remove error after 5 seconds
        setTimeout(() => {
            if (errorEl.parentNode) {
                errorEl.parentNode.removeChild(errorEl);
            }
        }, 5000);
    }
}

// Add navigation utility function
function navigateWithData(url, data) {
    // Save current state to data controller
    if (window.HiddenGems && window.HiddenGems.data) {
        // Generate URL with minimal data (just a reference ID)
        const sessionId = Date.now().toString();
        sessionStorage.setItem(`hiddenGems_session_${sessionId}`, JSON.stringify(data));
        
        // Navigate with lightweight param instead of all the data
        window.location.href = `${url}?session=${sessionId}`;
    } else {
        // Fallback to direct URL encoding if data controller not available
        const encodedData = data ? encodeURIComponent(JSON.stringify(data)) : '';
        window.location.href = `${url}${encodedData ? '?data=' + encodedData : ''}`;
    }
}

// Debug mode toggle and utilities
window.HiddenGems.debug = {
    enabled: false,
    
    enable: function() {
        this.enabled = true;
        console.log('Debug mode enabled');
        this.addDebugPanel();
        return 'Debug mode enabled - check the bottom of the screen for debug panel';
    },
    
    disable: function() {
        this.enabled = false;
        const panel = document.getElementById('debug-panel');
        if (panel) panel.remove();
        console.log('Debug mode disabled');
        return 'Debug mode disabled';
    },
    
    log: function(message, data) {
        if (!this.enabled) return;
        
        console.log('[HiddenGems Debug]', message, data);
        
        // Update debug panel if it exists
        const debugContent = document.getElementById('debug-content');
        if (debugContent) {
            const entry = document.createElement('div');
            entry.innerHTML = `<strong>${message}</strong>: ${JSON.stringify(data)}`;
            debugContent.appendChild(entry);
            
            // Limit entries to most recent 10
            while (debugContent.children.length > 10) {
                debugContent.removeChild(debugContent.firstChild);
            }
        }
    },
    
    addDebugPanel: function() {
        let panel = document.getElementById('debug-panel');
        
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'debug-panel';
            panel.style.position = 'fixed';
            panel.style.bottom = '0';
            panel.style.left = '0';
            panel.style.right = '0';
            panel.style.background = 'rgba(0,0,0,0.8)';
            panel.style.color = 'white';
            panel.style.padding = '10px';
            panel.style.fontSize = '12px';
            panel.style.maxHeight = '30%';
            panel.style.overflow = 'auto';
            panel.style.zIndex = '9999';
            
            const heading = document.createElement('div');
            heading.innerHTML = '<strong>Debug Mode</strong> <button id="debug-close">Close</button>';
            
            const content = document.createElement('div');
            content.id = 'debug-content';
            
            panel.appendChild(heading);
            panel.appendChild(content);
            document.body.appendChild(panel);
            
            // Add close button functionality
            document.getElementById('debug-close').addEventListener('click', () => this.disable());
        }
    },
    
    inspectGemCoordinates: function() {
        if (!window.HiddenGems.data || !window.HiddenGems.data.gems) {
            return 'No gems data available';
        }
        
        const gems = window.HiddenGems.data.gems;
        const results = [];
        
        gems.forEach((gem, index) => {
            const coords = gem.coords || gem.coordinates;
            
            // Try to normalize coordinates (lng/lat format)
            let normalized = null;
            if (coords) {
                if (window.HiddenGems.utils.isValidCoordinate(coords[0], coords[1])) {
                    normalized = coords;
                } else if (window.HiddenGems.utils.isValidCoordinate(coords[1], coords[0])) {
                    normalized = [coords[1], coords[0]];
                }
            }
            
            results.push({
                index,
                name: gem.name || `Gem ${index}`,
                originalCoords: coords,
                normalizedCoords: normalized,
                valid: !!normalized
            });
        });
        
        console.table(results);
        return `Inspected ${results.length} gems - check console for details`;
    }
};

// Shortcut to enable debug mode
window.debugGems = function() {
    return window.HiddenGems.debug.enable();
};

// Shortcut to check coordinates
window.checkCoords = function() {
    return window.HiddenGems.debug.inspectGemCoordinates();
};

// Wait for DOM to be fully loaded, then initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Initialize application modules in the correct order
    initApp();
});