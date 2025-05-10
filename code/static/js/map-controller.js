/**
 * map-controller.js
 * Handles map initialization and rendering gems on the map with card integration
 * Complete fresh implementation with all enhancements
 */

// Ensure HiddenGems namespace exists
window.HiddenGems = window.HiddenGems || {};

// Map initialization variables
let map;
let activeGemIndex = 0;
let markers = [];

/**
 * Initialize the map and set up event handlers
 */
function initializeMap() {
    // Get constants from main.js
    const DEFAULT_CENTER = window.HiddenGems.constants.DEFAULT_CENTER;
    const DEFAULT_ZOOM = window.HiddenGems.constants.DEFAULT_ZOOM || 11;
    
    // Start with a loading state
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=hbvo5fWE9HuC6JUHKB9q',
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        renderWorldCopies: false,
        antialias: true,
        // Better map controls
        dragRotate: false, // Disable rotation for simpler mobile interaction
        touchZoomRotate: true, // Enable pinch-to-zoom
        doubleClickZoom: true, // Double-click to zoom in
        boxZoom: false, // Simplify interactions by disabling box zoom
        dragPan: true, // Enable standard map panning
        touchPitch: false, // Disable touch pitch adjustments
        maxBounds: [ // Limit panning to Northern California
            [-125, 37], // Southwest corner
            [-118, 42]  // Northeast corner
        ]
    });
    
    // Add improved map controls with mobile-friendly options
    map.addControl(new maplibregl.NavigationControl({
        showCompass: false, // Hide compass for simpler UI
        visualizePitch: false // Don't show pitch control
    }), 'top-left');

    const navToggle = document.getElementById('nav-wheel-toggle');
	const navWheel = document.getElementById('nav-wheel');
	navToggle.addEventListener('click', () => navWheel.classList.toggle('active'));
    
    // Create loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.id = 'location-loading';
    loadingEl.textContent = 'Finding your location...';
    loadingEl.style.position = 'absolute';
    loadingEl.style.top = '50%';
    loadingEl.style.left = '50%';
    loadingEl.style.transform = 'translate(-50%, -50%)';
    loadingEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    loadingEl.style.color = 'white';
    loadingEl.style.padding = '10px 20px';
    loadingEl.style.borderRadius = '5px';
    loadingEl.style.zIndex = '100';
    
    // Set up event listeners for map
    map.on('load', function() {
        console.log('Map fully loaded');/*
        // Ensure proper marker positions on map move
map.on('move', function() {
    if (markers && markers.length) {
        markers.forEach(marker => {
            const lngLat = marker.getLngLat();
            marker.setLngLat(lngLat);
        });
    }
});

// Fix marker positions after any user interaction
map.on('moveend', function() {
    // Find any visibly misplaced markers and correct their positions
    if (markers && markers.length) {
        markers.forEach(marker => {
            const el = marker.getElement();
            const lngLat = marker.getLngLat();
            marker.setLngLat(lngLat);
            
            // Reset transform if not active to fix positioning
            if (!el.classList.contains('active-marker')) {
                el.style.transform = 'scale(1.0)';
            }
        });
    }
    
    // Re-highlight active marker if one exists
    if (activeGemIndex >= 0 && markers && markers.length > activeGemIndex) {
        const activeEl = markers[activeGemIndex].getElement();
        activeEl.style.transform = 'scale(1.4)';
    }
});*/
    });
    
    // Fix for sliding markers during zoom
    map.on('zoom', function() {
        // Ensure markers are properly positioned during zoom
        if (markers && markers.length) {
            markers.forEach(marker => {
                // Force marker update
                const lngLat = marker.getLngLat();
                marker.setLngLat(lngLat);
            });
        }
    });

    // Add this to the end of initializeMap function to improve mobile touch handling

// Improve touch handling for mobile devices
if ('ontouchstart' in window) {
    // Add custom touch handler for better card and map interaction
    const mapContainer = document.getElementById('map');
    let touchStartY = 0;
    let isSwiping = false;
    
    mapContainer.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].clientY;
        
        // Check if touch is in the lower part of the screen (card area)
        const screenHeight = window.innerHeight;
        const cardAreaHeight = screenHeight / 4; // Adjust based on your card height ratio
        
        if (touchStartY > screenHeight - cardAreaHeight) {
            // Touch started in card area, let card handling take precedence
            isSwiping = true;
        } else {
            isSwiping = false;
        }
    });
    
    mapContainer.addEventListener('touchmove', function(e) {
        if (isSwiping) {
            // Let card swipe handler take over for vertical swipes in card area
            const touchY = e.touches[0].clientY;
            const deltaY = touchStartY - touchY;
            
            if (Math.abs(deltaY) > 10) {
                // Vertical swipe detected in card area
                // Don't prevent default to allow card scrolling
            }
        }
    });
}
    
    // Try to get user location
    if (navigator.geolocation) {
        document.getElementById('map').appendChild(loadingEl);
        
        // Set timeout for geolocation
        const locationTimeout = setTimeout(() => {
            if (loadingEl && loadingEl.parentNode) {
                loadingEl.parentNode.removeChild(loadingEl);
            }
            
            // Get visible bounds and load adaptive gems
            loadAdaptiveGems();
        }, 10000);
        
        navigator.geolocation.getCurrentPosition(
            // Success callback
            (position) => {
                const userLocation = [position.coords.longitude, position.coords.latitude];
                
                // Clear timeout
                clearTimeout(locationTimeout);
                
                // Fly to user location
                map.flyTo({
                    center: userLocation,
                    zoom: DEFAULT_ZOOM,
                    essential: true
                });
                
                // Remove loading indicator
                if (loadingEl && loadingEl.parentNode) {
                    loadingEl.parentNode.removeChild(loadingEl);
                }
                
                // Add "you are here" marker
                addYouAreHereMarker(userLocation);
                
                // Get visible bounds and load adaptive gems
                loadAdaptiveGems(userLocation);
            },
            // Error callback
            (error) => {
                console.log('Geolocation error:', error);
                
                // Clear timeout
                clearTimeout(locationTimeout);
                
                // Remove loading indicator
                if (loadingEl && loadingEl.parentNode) {
                    loadingEl.parentNode.removeChild(loadingEl);
                }
                
                // Load adaptive gems with default center
                loadAdaptiveGems();
            },
            // Options
            {
                timeout: 8000,
                maximumAge: 60000
            }
        );
    } else {
        // Geolocation not supported
        loadAdaptiveGems();
    }
}

/**
 * Add a "You are here" marker to the map
 * @param {Array} location - [longitude, latitude]
 */
function addYouAreHereMarker(location) {
    // Create a pulsing dot element
    const el = document.createElement('div');
    el.className = 'you-are-here-marker';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#4285F4';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 0 0 rgba(66, 133, 244, 1)';
    el.style.animation = 'pulse 2s infinite';
    
    // Add the pulsing dot CSS animation
    if (!document.getElementById('pulse-animation')) {
        const style = document.createElement('style');
        style.id = 'pulse-animation';
        style.textContent = `
            @keyframes pulse {
                0% {
                    box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7);
                }
                70% {
                    box-shadow: 0 0 0 10px rgba(66, 133, 244, 0);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(66, 133, 244, 0);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add a popup showing "You are here"
    const popup = new maplibregl.Popup({ offset: 25 })
        .setText('You are here');
    
    // Add marker to map
    new maplibregl.Marker({
        element: el,
        anchor: 'center'
    })
    .setLngLat(location)
    .setPopup(popup)
    .addTo(map);
}

/**
 * Adaptive gem loading strategy
 * Progressively zooms out until finding enough gems
 * @param {Array} center - Optional [longitude, latitude] center point
 */
function loadAdaptiveGems(center) {
    // Show loading indicator
    window.HiddenGems.utils.showLoading('Finding hidden gems...');
    
    // Get current map bounds if map is initialized
    let currentBounds = null;
    let currentZoom = window.HiddenGems.constants.DEFAULT_ZOOM || 11;
    
    if (map) {
        currentBounds = map.getBounds();
        currentZoom = map.getZoom();
    }
    
    // If no center provided, use map center or default
    if (!center) {
        center = map ? map.getCenter().toArray() : window.HiddenGems.constants.DEFAULT_CENTER;
    }
    
    // Function to try loading gems with progressively larger radius
    function tryLoadingGems(attempt = 1) {
        // Calculate adaptive radius based on zoom level
        // Lower zoom = larger area = larger radius needed
        const zoomRadius = {
            11: 20, // More zoomed out - even larger radius
            10: 30, // Very zoomed out - very large radius
            9: 40,  // Extremely zoomed out - extremely large radius
        };
        
        // Calculate radius based on current zoom
        let radius = 5; // Default
        const zoomLevel = Math.round(currentZoom);
        
        if (zoomRadius[zoomLevel]) {
            radius = zoomRadius[zoomLevel];
        } else if (zoomLevel > 15) {
            radius = 1; // Very zoomed in
        } else if (zoomLevel < 9) {
            radius = 50; // Very zoomed out
        }
        
        // Increase radius with each attempt
        radius = radius * attempt;
        
        console.log(`Loading gems attempt ${attempt}: zoom=${currentZoom}, radius=${radius}mi`);
        
        // Try to load gems
        fetch(window.HiddenGems.constants.DATA_PATH)
            .then(response => response.json())
            .then(allGems => {
                // Get user-added gems from localStorage if any
                const userGems = JSON.parse(localStorage.getItem('userGems') || '[]');
                
                // Combine all gems
                allGems = [...allGems, ...userGems];
                
                // Filter gems by current bounds or radius
                let filteredGems = [];
                
                if (currentBounds) {
                    // Filter by bounds if available
                    filteredGems = allGems.filter(gem => {
                        const coords = gem.coords || gem.coordinates;
                        if (!coords || coords.length !== 2) return false;
                        
                        // Make sure we have longitude, latitude in the right order
                        const [a, b] = coords;
                        const lngLat = (Math.abs(a) > 90 && Math.abs(b) <= 90) ? [a, b] : [b, a];
                        
                        return currentBounds.contains(lngLat);
                    });
                } else {
                    // Filter by radius from center
                    filteredGems = allGems.filter(gem => {
                        const coords = gem.coords || gem.coordinates;
                        if (!coords || coords.length !== 2) return false;
                        
                        // Make sure we have longitude, latitude in the right order
                        const [a, b] = coords;
                        const lngLat = (Math.abs(a) > 90 && Math.abs(b) <= 90) ? [a, b] : [b, a];
                        
                        // Calculate distance from center
                        const distance = window.HiddenGems.utils.calculateDistance(
                            center[1], center[0],
                            lngLat[1], lngLat[0]
                        );
                        
                        // Add distance to gem object for display
                        gem.distance = Math.round(distance * 10) / 10;
                        
                        return distance <= radius;
                    });
                }
                
                // If not enough gems found and we haven't tried too many times
                if (filteredGems.length < window.HiddenGems.constants.MIN_GEMS && 
                    attempt < window.HiddenGems.constants.MAX_ATTEMPTS) {
                    // Zoom out and try again
                    currentZoom = Math.max(currentZoom - 1, 9);
                    
                    if (map) {
                        // Update the bounds based on new zoom level
                        const center = map.getCenter();
                        map.setZoom(currentZoom);
                        currentBounds = map.getBounds();
                    }
                    
                    tryLoadingGems(attempt + 1);
                } else {
                    // We have enough gems or tried enough times
                    // Apply randomization if needed
                    if (window.HiddenGems.utils.shuffleArray) {
                        filteredGems = window.HiddenGems.utils.shuffleArray(filteredGems);
                    }
                    
                    // Limit the number of gems
                    const limit = window.HiddenGems.constants.DEFAULT_LIMIT || 10;
                    const finalGems = filteredGems.slice(0, limit);
                    
                    // Store gems in the HiddenGems namespace
                    window.HiddenGems.data.loadGems(finalGems);
                    
                    // Render the gems on the map
                    renderGems(finalGems);
                    
                    // Hide loading animation
                    window.HiddenGems.utils.hideLoading();
                }
            })
            .catch(error => {
                console.error('Error loading gems:', error);
                
                // Hide loading animation
                window.HiddenGems.utils.hideLoading();
                
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
                errorEl.innerHTML = `<h3>Error Loading Gems</h3><p>${error.message || 'Unknown error'}</p>`;
                document.body.appendChild(errorEl);
                
                // Remove error after 5 seconds
                setTimeout(() => {
                    if (errorEl.parentNode) {
                        errorEl.parentNode.removeChild(errorEl);
                    }
                }, 5000);
            });
    }
    
    // Start loading gems
    tryLoadingGems();
}

/**
 * Function to render gems on the map
 * @param {Array} gems - Array of gem objects
 */
function renderGems(gems) {
    // First, ensure any lingering loading elements are removed
    const locationLoading = document.getElementById('location-loading');
    if (locationLoading && locationLoading.parentNode) {
        locationLoading.parentNode.removeChild(locationLoading);
    }
    
    // Clear existing markers if needed
    clearMarkers();

    // Clear any existing routes
    if (HiddenGems.map && typeof HiddenGems.map.clearRoutes === 'function') {
        HiddenGems.map.clearRoutes();
    }
    
    const bounds = new maplibregl.LngLatBounds();
    markers = [];
    
    // Track number of valid gems rendered
    let validGemsCount = 0;
    
    // Get icon paths from constants
    const ICON_PATHS = window.HiddenGems.constants.ICON_PATHS || {
        red: "static/icons/gem-red.svg",
        purple: "static/icons/gem-purple.svg",
        blue: "static/icons/gem-blue.svg"
    };

    gems.forEach((gem, index) => {
        const coords = gem.coords || gem.coordinates;
        if (!coords || coords.length !== 2) return;
        
        // Make sure we have longitude, latitude in the right order
        const [a, b] = coords;
        let lngLat;
        
        // Check if coordinates need to be swapped
        if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
            lngLat = [a, b]; // Already in [lng, lat] format
        } else if (Math.abs(a) <= 90 && Math.abs(b) > 90) {
            lngLat = [b, a]; // Need to swap to [lng, lat] format
        } else {
            // Both values are in the same range, use a heuristic:
            // For Northern California, longitude is negative, latitude is positive
            if (a < 0) {
                lngLat = [a, b]; // a is negative, assume it's longitude
            } else {
                lngLat = [b, a]; // b might be negative, try swapping
            }
        }

        // Validate coordinates
        if (!window.HiddenGems.utils.isValidCoordinate(lngLat[0], lngLat[1])) {
            console.warn(`Invalid coordinates for gem ${gem.name || 'unnamed'}: [${lngLat}]`);
            return; // Skip this gem
        }

        validGemsCount++;

        // Create marker DOM element with proper sizing for consistent positioning
        const el = document.createElement('div');
        el.className = 'gem-marker';
        el.style.width = '28px';
        el.style.height = '28px';
        el.style.cursor = 'pointer';
        el.style.position = 'relative';
        
        // Determine the correct color for the gem
        let iconColor = 'blue'; // Default color
        if (gem.color) {
            iconColor = gem.color;
        } else if (gem.popularity !== undefined) {
            // Assign color based on popularity
            if (gem.popularity < 2) {
                iconColor = 'red';      // Most hidden (popularity 0-1)
            } else if (gem.popularity < 4) {
                iconColor = 'purple';   // Moderately hidden (popularity 2-3)
            }
        } else if (gem.type === 'hidden-beach' || gem.type === 'secret-trail' || gem.type === 'natural-wonder') {
            iconColor = 'red';
        }
        
        // Use SVG directly for better control
        if (iconColor === 'red') {
            el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
                <path fill="#e74c3c" d="M12 2L2 12l10 10 10-10z"/>
            </svg>`;
        } else if (iconColor === 'purple') {
            el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
                <path fill="#9b59b6" d="M12 2L2 12l10 10 10-10z"/>
            </svg>`;
        } else {
            el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
                <path fill="#3498db" d="M12 2L2 12l10 10 10-10z"/>
            </svg>`;
        }

        // Highlight if it's the active gem
        if (index === activeGemIndex) {
            el.style.transform = 'scale(1.4)';
            el.style.zIndex = '10';
        }

        const marker = new maplibregl.Marker({
            element: el,
            anchor: 'center',
            offset: [0, 0] // Ensure centered position
        })
        .setLngLat(lngLat)
        .addTo(map);

        // Improved click handler with better centering
el.addEventListener('click', function(e) {
    // Prevent event propagation to avoid map click events
    e.stopPropagation();
    e.preventDefault();
    
    // Update active gem index
    activeGemIndex = index;
    
    // Update HiddenGems namespace if available
    if (window.HiddenGems && window.HiddenGems.map) {
        window.HiddenGems.map.activeGemIndex = index;
    }
    
    // Center map on gem with animation - proper fly to animation
    map.flyTo({
        center: lngLat,
        essential: true,
        duration: 800, // Faster animation
        easing: function(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Custom easing
        }
    });
    
    // Update cards after a slight delay to ensure smooth map transition
    setTimeout(() => {
        // Update card UI if swipe module is available
        if (window.HiddenGems && window.HiddenGems.swipe && 
            typeof window.HiddenGems.swipe.goToGem === 'function') {
            window.HiddenGems.swipe.goToGem(index);
        }
        
        // Highlight the marker
        highlightGemMarker(index);

    }, 100);
});
        
        markers.push(marker);
        bounds.extend(lngLat);
    });

    // After all markers are added, redraw the optimal route
    if (HiddenGems.map && typeof HiddenGems.map.drawOptimalRoute === 'function') {
        HiddenGems.map.drawOptimalRoute();
    }
    
    // Log the number of valid gems rendered
    console.log(`Rendered ${validGemsCount} valid gems out of ${gems.length} total`);
    
    // Fit map to show all markers with padding if we have any
    if (!bounds.isEmpty() && validGemsCount > 0) {
        map.fitBounds(bounds, {
            padding: 40,
            animate: true,
            duration: 1000,
            maxZoom: 12 // Prevent zooming in too far
        });
    } else if (validGemsCount === 0) {
        console.warn('No valid gems found to render on the map');
        
        // Show a message to the user
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
        
        document.getElementById('map').appendChild(noGemsEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (noGemsEl.parentNode) {
                noGemsEl.parentNode.removeChild(noGemsEl);
            }
        }, 3000);
    }
    
    // Highlight the active gem marker
    highlightGemMarker(activeGemIndex);
    
    // Dispatch a custom event to notify that gems were loaded
    document.dispatchEvent(new CustomEvent('gemsLoaded', { 
        detail: { gems: gems }
    }));
}

/**
 * Clear existing markers from the map
 */
function clearMarkers() {
    if (markers && markers.length) {
        markers.forEach(marker => marker.remove());
    }
    markers = [];
}

/**
 * Highlight a gem marker and center the map on it
 * @param {number} index - Index of gem to highlight
 */
function highlightGemMarker(index) {
    // Validate index and markers array
    if (!markers || markers.length === 0 || index < 0 || index >= markers.length) {
        console.warn('Invalid marker index or no markers available');
        return;
    }
    
    // Update active index
    activeGemIndex = index;
    window.HiddenGems.map.activeGemIndex = index;
    
    // Get the target marker's element and coordinates
    const targetMarker = markers[index];
    const targetLngLat = targetMarker.getLngLat();
    
    // Reset all markers to default state
    markers.forEach((marker, i) => {
        const el = marker.getElement();
        
        if (i === index) {
            // Active marker styling
            el.style.transform = 'scale(1.4)';
            el.style.zIndex = '100';
            el.style.boxShadow = '0 0 0 4px rgba(66, 133, 244, 0.8)';
            
            // Add pulsing effect
            if (!el.querySelector('.pulse-effect')) {
                const pulseDiv = document.createElement('div');
                pulseDiv.className = 'pulse-effect';
                pulseDiv.style.position = 'absolute';
                pulseDiv.style.top = '0';
                pulseDiv.style.left = '0';
                pulseDiv.style.width = '100%';
                pulseDiv.style.height = '100%';
                pulseDiv.style.borderRadius = '50%';
                pulseDiv.style.animation = 'markerPulse 1.5s infinite';
                pulseDiv.style.zIndex = '-1';
                el.appendChild(pulseDiv);
                
                // Add animation if not already present
                if (!document.getElementById('marker-pulse-animation')) {
                    const style = document.createElement('style');
                    style.id = 'marker-pulse-animation';
                    style.textContent = `
                        @keyframes markerPulse {
                            0% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7); }
                            70% { box-shadow: 0 0 0 10px rgba(66, 133, 244, 0); }
                            100% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0); }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        } else {
            // Inactive marker styling
            el.style.transform = 'scale(1.0)';
            el.style.zIndex = '1';
            el.style.boxShadow = 'none';
            
            // Remove any pulse effect
            const pulseEffect = el.querySelector('.pulse-effect');
            if (pulseEffect) {
                pulseEffect.remove();
            }
        }
    });
    
    // Center map on active gem with proper mobile-friendly animation
    map.flyTo({
        center: targetLngLat,
        zoom: 14,
        duration: 800,
        essential: true, // This option ensures the operation is considered essential and not killed
        padding: { top: 50, bottom: 200, left: 50, right: 50 }, // Offset for the card at bottom
        easing: function(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Smoother easing
        }
    });
    
    // Update card display if available
    //if (window.HiddenGems && window.HiddenGems.cards && 
    //    typeof window.HiddenGems.cards.updateCardPositions === 'function') {
    //    window.HiddenGems.cards.updateCardPositions(index);
    //}
    
    // Tell cards controller to update active gem
    if (window.HiddenGems && window.HiddenGems.cards && 
        typeof window.HiddenGems.cards.setActiveCard === 'function') {
        window.HiddenGems.cards.setActiveCard(index);
    }
}



/**
 * Show welcome message for first-time visitors with blur effect
 */
function showWelcomeMessage() {
    // Create a blur overlay for the entire app
    const blurOverlay = document.createElement('div');
    blurOverlay.style.position = 'fixed';
    blurOverlay.style.top = '0';
    blurOverlay.style.left = '0';
    blurOverlay.style.right = '0';
    blurOverlay.style.bottom = '0';
    blurOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'; // Semi-transparent background
    blurOverlay.style.backdropFilter = 'blur(8px)'; // Blur effect
    blurOverlay.style.WebkitBackdropFilter = 'blur(8px)'; // For Safari
    blurOverlay.style.display = 'flex';
    blurOverlay.style.flexDirection = 'column';
    blurOverlay.style.justifyContent = 'center';
    blurOverlay.style.alignItems = 'center';
    blurOverlay.style.zIndex = '3000'; // Higher than other elements
    blurOverlay.style.transition = 'opacity 0.5s';

    // Welcome message container with glassmorphism effect
    const welcomeContainer = document.createElement('div');
    welcomeContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    welcomeContainer.style.backdropFilter = 'blur(12px)';
    welcomeContainer.style.WebkitBackdropFilter = 'blur(12px)';
    welcomeContainer.style.padding = '30px';
    welcomeContainer.style.borderRadius = '16px';
    welcomeContainer.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
    welcomeContainer.style.maxWidth = '85%';
    welcomeContainer.style.textAlign = 'center';
    welcomeContainer.style.transform = 'translateY(0)';
    welcomeContainer.style.transition = 'transform 0.5s ease-out';
    welcomeContainer.style.animation = 'fadeIn 0.5s ease-out';

    // Main title
    const welcomeMessage = document.createElement('div');
    welcomeMessage.style.color = '#222';
    welcomeMessage.style.fontSize = '28px';
    welcomeMessage.style.fontWeight = 'bold';
    welcomeMessage.style.marginBottom = '20px';
    welcomeMessage.innerText = 'Discover Hidden Gems in Northern California';

    // Subtitle
    const welcomeSubMessage = document.createElement('div');
    welcomeSubMessage.style.color = '#555';
    welcomeSubMessage.style.fontSize = '16px';
    welcomeSubMessage.style.marginBottom = '30px';
    welcomeSubMessage.innerText = 'Find off-the-beaten-path adventures near you';

    // Get Started button with hover effect
    const startButton = document.createElement('button');
    startButton.style.padding = '12px 40px';
    startButton.style.backgroundColor = '#222';
    startButton.style.color = 'white';
    startButton.style.border = 'none';
    startButton.style.borderRadius = '24px';
    startButton.style.fontSize = '18px';
    startButton.style.cursor = 'pointer';
    startButton.style.transition = 'transform 0.3s, background-color 0.3s';
    startButton.innerText = 'Get Started';
    
    // Add hover effects
    startButton.onmouseover = function() {
        startButton.style.backgroundColor = '#444';
        startButton.style.transform = 'scale(1.05)';
    };
    startButton.onmouseout = function() {
        startButton.style.backgroundColor = '#222';
        startButton.style.transform = 'scale(1)';
    };

    // Add everything to the DOM
    welcomeContainer.appendChild(welcomeMessage);
    welcomeContainer.appendChild(welcomeSubMessage);
    welcomeContainer.appendChild(startButton);
    blurOverlay.appendChild(welcomeContainer);
    document.body.appendChild(blurOverlay);

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    // Check browser support for backdrop-filter
    const supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(8px)') || 
                                  CSS.supports('-webkit-backdrop-filter', 'blur(8px)');

    if (!supportsBackdropFilter) {
        // Fallback to more opaque background without blur
        blurOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        welcomeContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    }

    // Remove the overlay when button is clicked
    startButton.addEventListener('click', () => {
        blurOverlay.style.opacity = '0';
        setTimeout(() => {
            blurOverlay.remove();
            style.remove();
        }, 500);
        
        // Add a subtle zoom effect to the map when starting
        if (map) {
            const currentZoom = map.getZoom();
            map.easeTo({
                zoom: currentZoom + 0.5,
                duration: 1000,
                easing: function(t) {
                    return t * (2 - t); // Ease out quad
                }
            });
        }
    });
    
    // Mark welcome as seen in localStorage
    localStorage.setItem('welcomeShown', 'true');
}

// Initialize map namespace in HiddenGems
window.HiddenGems.map = {
    activeGemIndex: 0,

    
    
    // Initialize the map
    init: function() {
        return new Promise((resolve, reject) => {
            try {
                initializeMap();
                // Set this object's activeGemIndex to match the global
                this.activeGemIndex = activeGemIndex;
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    },

    /**
 * Show the total route distance
 * @param {Array} routePoints - Array of points that form the route
 * @private
 */
_showRouteDistance: function(routePoints) {
    if (!routePoints || routePoints.length < 2) {
        // Hide the distance display if no valid route
        const distanceEl = document.getElementById('route-distance');
        if (distanceEl) {
            distanceEl.classList.remove('visible');
        }
        return;
    }
    
    // Calculate total route distance
    let totalDistance = 0;
    
    for (let i = 0; i < routePoints.length - 1; i++) {
        const current = routePoints[i];
        const next = routePoints[i + 1];
        
        // Calculate distance between points
        const distance = this._calculateDistance(
            current.coordinates[1], current.coordinates[0],
            next.coordinates[1], next.coordinates[0]
        );
        
        totalDistance += distance;
    }
    
    // Round to one decimal place
    totalDistance = Math.round(totalDistance * 10) / 10;
    
    // Get or create the distance display element
    let distanceEl = document.getElementById('route-distance');
    
    if (!distanceEl) {
        distanceEl = document.createElement('div');
        distanceEl.id = 'route-distance';
        distanceEl.className = 'route-distance';
        document.body.appendChild(distanceEl);
    }
    
    // Update content
    distanceEl.innerHTML = `
        <span>Total route: ${totalDistance} miles</span>
        <span style="margin-left: 5px; font-size: 12px; opacity: 0.7;">
            (${routePoints.length - 1} stops)
        </span>
    `;
    
    // Show the element
    distanceEl.classList.add('visible');
},

    drawOptimalRoute: function() {
    // Remove any existing route layers
    this.clearRoutes();
    
    // Get selected gems from preferences
    const userPreferences = HiddenGems.preferences.getUserPreferences();
    const selectedGemIds = userPreferences.selectedGems || [];
    
    if (selectedGemIds.length === 0) {
        // No gems selected, nothing to draw
        return;
    }
    
    // Get selected gem data
    const selectedGems = [];
    
    selectedGemIds.forEach(gemId => {
        const gem = HiddenGems.data.gems.find(g => (g.id || g.index).toString() === gemId.toString());
        if (gem) {
            const coords = gem.coords || gem.coordinates;
            if (coords && coords.length === 2) {
                // Ensure coordinates are in the correct format [lng, lat]
                const [a, b] = coords;
                const lngLat = (Math.abs(a) > 90 && Math.abs(b) <= 90) ? [a, b] : [b, a];
                
                // Add to selected gems with correct coordinates
                selectedGems.push({
                    id: gem.id || gem.index,
                    name: gem.name || gem.title || 'Hidden Gem',
                    coordinates: lngLat
                });
            }
        }
    });
    
    if (selectedGems.length === 0) {
        // No valid gems found
        return;
    }
    
    // Get origin and destination (if set in preferences)
    let origin = userPreferences.origin || null;
    let destination = userPreferences.destination || null;
    
    // If origin/destination not set, use default values or first/last gem
    if (!origin && map) {
        // Use current map center as origin
        const center = map.getCenter();
        origin = {
            name: 'Starting Point',
            coordinates: [center.lng, center.lat]
        };
    }
    
    if (!destination) {
        // Use origin as destination if not specified (round trip)
        destination = origin;
    }
    
    // Now we have: origin -> gems -> destination
    // Find the optimal route (nearest neighbor heuristic)
    const routePoints = this._calculateOptimalRoute(origin, selectedGems, destination);
    
    // Draw the route on the map
    this._drawRouteOnMap(routePoints);
    
    // Fit map bounds to include the entire route
    this._fitMapToRoute(routePoints);
},

/**
 * Calculate the optimal route using nearest neighbor heuristic
 * @param {Object} origin - Starting point
 * @param {Array} gems - Array of gem objects with coordinates
 * @param {Object} destination - Ending point
 * @returns {Array} Array of ordered points for the route
 * @private
 */
_calculateOptimalRoute: function(origin, gems, destination) {
    // Create a copy of gems to work with
    const remainingGems = [...gems];
    const route = [];
    
    // Start with origin
    let currentPoint = origin;
    route.push(currentPoint);
    
    // While we have gems left to visit
    while (remainingGems.length > 0) {
        // Find nearest gem to current position
        let nearestIndex = -1;
        let nearestDistance = Infinity;
        
        for (let i = 0; i < remainingGems.length; i++) {
            const gem = remainingGems[i];
            const distance = this._calculateDistance(
                currentPoint.coordinates[1], currentPoint.coordinates[0],
                gem.coordinates[1], gem.coordinates[0]
            );
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
            }
        }
        
        // Add nearest gem to route
        if (nearestIndex !== -1) {
            currentPoint = remainingGems[nearestIndex];
            route.push(currentPoint);
            remainingGems.splice(nearestIndex, 1);
        }
    }
    
    // Finish at destination
    if (destination && destination !== origin) {
        route.push(destination);
    }
    
    return route;
},

/**
 * Calculate distance between two points in miles
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in miles
 * @private
 */
_calculateDistance: function(lat1, lon1, lat2, lon2) {
    if (typeof HiddenGems.utils.calculateDistance === 'function') {
        return HiddenGems.utils.calculateDistance(lat1, lon1, lat2, lon2);
    }
    
    // Fallback calculation if utils not available
    const R = 3958.8; // Earth's radius in miles
    const dLat = this._toRadians(lat2 - lat1);
    const dLon = this._toRadians(lon2 - lon1);
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this._toRadians(lat1)) * Math.cos(this._toRadians(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
},

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 * @private
 */
_toRadians: function(degrees) {
    return degrees * Math.PI / 180;
},

/**
 * Draw the calculated route on the map
 * @param {Array} routePoints - Array of points that form the route
 * @private
 */
_drawRouteOnMap: function(routePoints) {
    if (!map || routePoints.length < 2) {
        return;
    this._showRouteDistance(routePoints);
    }
    
    // Create line coordinates
    const lineCoordinates = routePoints.map(point => point.coordinates);
    
    // Create a unique ID for this route
    const routeId = 'route-' + Date.now();
    
    // Add the route line
    map.addSource(routeId, {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': lineCoordinates
            }
        }
    });
    
    // Add a visible path layer
    map.addLayer({
        'id': routeId + '-line',
        'type': 'line',
        'source': routeId,
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#4285F4',
            'line-width': 3,
            'line-opacity': 0.8,
            'line-dasharray': [0, 2, 1]
        }
    });
    
    // Add glow/outline for the path
    map.addLayer({
        'id': routeId + '-glow',
        'type': 'line',
        'source': routeId,
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#4285F4',
            'line-width': 6,
            'line-opacity': 0.2
        }
    }, routeId + '-line'); // Place below the line layer
    
    // Store the route IDs for later removal
    if (!this.routeLayers) {
        this.routeLayers = [];
    }
    this.routeLayers.push(routeId + '-line', routeId + '-glow');
    
    // Add origin/destination markers if not already on the map
    this._addRouteEndpointMarkers(routePoints);
},

/**
 * Add markers for the route origin and destination
 * @param {Array} routePoints - Array of points that form the route
 * @private
 */
_addRouteEndpointMarkers: function(routePoints) {
    if (!map || routePoints.length < 2) {
        return;
    }
    
    // Get origin and destination
    const origin = routePoints[0];
    const destination = routePoints[routePoints.length - 1];
    
    // Check if markers already exist and remove them
    if (this.originMarker) {
        this.originMarker.remove();
    }
    if (this.destinationMarker) {
        this.destinationMarker.remove();
    }
    
    // Create origin marker (if not the same as a gem marker)
    const originEl = document.createElement('div');
    originEl.className = 'route-endpoint origin-marker';
    originEl.style.width = '20px';
    originEl.style.height = '20px';
    originEl.style.borderRadius = '50%';
    originEl.style.backgroundColor = '#4CAF50';
    originEl.style.border = '3px solid white';
    originEl.style.boxShadow = '0 0 0 0 rgba(76, 175, 80, 1)';
    originEl.style.animation = 'pulse 2s infinite';
    
    this.originMarker = new maplibregl.Marker({
        element: originEl,
        anchor: 'center'
    })
    .setLngLat(origin.coordinates)
    .addTo(map);
    
    // If destination is different from origin, add destination marker
    if (destination !== origin) {
        const destEl = document.createElement('div');
        destEl.className = 'route-endpoint dest-marker';
        destEl.style.width = '20px';
        destEl.style.height = '20px';
        destEl.style.borderRadius = '50%';
        destEl.style.backgroundColor = '#F44336';
        destEl.style.border = '3px solid white';
        destEl.style.boxShadow = '0 0 0 0 rgba(244, 67, 54, 1)';
        
        this.destinationMarker = new maplibregl.Marker({
            element: destEl,
            anchor: 'center'
        })
        .setLngLat(destination.coordinates)
        .addTo(map);
    }
},

/**
 * Clear any existing route layers from the map
 */
clearRoutes: function() {
    if (!map || !this.routeLayers || this.routeLayers.length === 0) {
        return;
    }
    
    // Remove all route layers
    this.routeLayers.forEach(layerId => {
        if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
        }
        
        // Extract source ID from layer ID by removing the suffix
        const sourceId = layerId.replace('-line', '').replace('-glow', '');
        if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
        }
    });
    
    // Clear the layers array
    this.routeLayers = [];
    
    // Remove endpoint markers
    if (this.originMarker) {
        this.originMarker.remove();
        this.originMarker = null;
    }
    if (this.destinationMarker) {
        this.destinationMarker.remove();
        this.destinationMarker = null;
    }

    const distanceEl = document.getElementById('route-distance');
    if (distanceEl) {
        distanceEl.classList.remove('visible');
    }
},

/**
 * Fit the map view to include the entire route
 * @param {Array} routePoints - Array of points that form the route
 * @private
 */
_fitMapToRoute: function(routePoints) {
    if (!map || routePoints.length < 2) {
        return;
    }
    
    // Create a bounds object
    const bounds = new maplibregl.LngLatBounds();
    
    // Include all route points in the bounds
    routePoints.forEach(point => {
        bounds.extend(point.coordinates);
    });
    
    // Fit the map to the bounds
    map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 12, // Don't zoom in too far
        duration: 1000
    });
}
    
};

// Replace the global loadGems function to use our adaptive strategy
window.loadGems = function(options = {}) {
    // If we have specific options, use them, otherwise use adaptive loading
    if (options.center || options.radius) {
        // Show loading indicator
        window.HiddenGems.utils.showLoading('Finding gems...');
        
        // Get user-added gems from localStorage if any
        const userGems = JSON.parse(localStorage.getItem('userGems') || '[]');
        
        // Then load from the JSON file
        fetch(window.HiddenGems.constants.DATA_PATH)
            .then(response => response.json())
            .then(jsonGems => {
                // Combine user gems with JSON gems
                const allGems = [...jsonGems, ...userGems];
                
                // Filter by distance from center if specified
                let filteredGems = allGems;
                
                if (options.center) {
                    filteredGems = allGems.filter(gem => {
                        const coords = gem.coords || gem.coordinates;
                        if (!coords || coords.length !== 2) return false;
                        
                        // Calculate distance from center
                        const distance = window.HiddenGems.utils.calculateDistance(
                            options.center[1], options.center[0],
                            coords[1], coords[0]
                        );
                        
                        // Add distance to gem object for display
                        gem.distance = Math.round(distance * 10) / 10;
                        
                        // Include if within radius
                        return distance <= (options.radius || window.HiddenGems.constants.DEFAULT_RADIUS);
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
                
                // Store gems in the HiddenGems namespace
                window.HiddenGems.data.loadGems(filteredGems);
                
                // Render the gems on the map
                renderGems(filteredGems);
                
                // Hide loading animation
                window.HiddenGems.utils.hideLoading();
            })
            .catch(error => {
                console.error('Error loading gems:', error);
                window.HiddenGems.utils.hideLoading();
            });
    } else {
        // Use adaptive loading strategy
        loadAdaptiveGems();
    }
};



// Export functions for use in other scripts
window.renderGems = renderGems;
window.clearMarkers = clearMarkers;
window.highlightGemMarker = highlightGemMarker;
window.showWelcomeMessage = showWelcomeMessage;
window.initializeMap = initializeMap;