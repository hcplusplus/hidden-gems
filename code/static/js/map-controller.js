/**
 * map-controller.js
 * Handles map initialization and rendering gems on the map with card integration
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
        touchZoomRotate: true,
        doubleClickZoom: true,
        boxZoom: false,
        dragPan: true,
        touchPitch: false,
        maxBounds: [
            [-125, 37],
            [-118, 42]
        ]
    });
    
    // Add improved map controls with mobile-friendly options
    map.addControl(new maplibregl.NavigationControl({
        showCompass: false,
        visualizePitch: false
    }), 'top-left');

    // Set up event listeners for map
    map.on('load', function() {
        console.log('Map fully loaded');
        
        // Notify that the map is ready - this will trigger gem-cards to render
        window.notifyMapReady();
        
        // Dispatch standard event for other components
        document.dispatchEvent(new CustomEvent('mapReady', {
            bubbles: true
        }));
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
            const cardAreaHeight = screenHeight / 4;
            
            if (touchStartY > screenHeight - cardAreaHeight) {
                isSwiping = true;
            } else {
                isSwiping = false;
            }
        });
        
        mapContainer.addEventListener('touchmove', function(e) {
            if (isSwiping) {
                const touchY = e.touches[0].clientY;
                const deltaY = touchStartY - touchY;
                
                if (Math.abs(deltaY) > 10) {
                    // Vertical swipe detected in card area
                }
            }
        });
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
    
    // Add marker to map
    new maplibregl.Marker({
        element: el,
        anchor: 'center'
    })
    .setLngLat(location)
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
                    if (window.HiddenGems.data) {
                        window.HiddenGems.data.loadGems(finalGems);
                    }
                    
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
        
        // Store gem ID in the marker element data attribute for synchronization
        const gemId = gem.id || gem.index || `gem-${index}`;
        el.setAttribute('data-gem-id', gemId.toString());
        el.setAttribute('data-index', index.toString());
        
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
        
        // Use the same icon approach as the cards for consistency
        const iconImg = document.createElement('img');
        iconImg.src = ICON_PATHS[iconColor];
        iconImg.alt = `${iconColor.charAt(0).toUpperCase() + iconColor.slice(1)} Gem`;
        iconImg.className = `${iconColor}-gem-icon`;
        iconImg.style.width = '100%';
        iconImg.style.height = '100%';
        el.appendChild(iconImg);

        // Highlight if it's the active gem
        if (index === activeGemIndex) {
            el.style.transform = 'scale(1.4)';
            el.style.zIndex = '10';
            el.classList.add('active-gem');
        }

        const marker = new maplibregl.Marker({
            element: el,
            anchor: 'center',
            offset: [0, 0] // Ensure centered position
        })
        .setLngLat(lngLat)
        .addTo(map);
        
        // Store gemId directly on the marker object for easier access
        marker.gemId = gemId.toString();

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
                // Find and show the matching card by gem ID
                const gemCard = document.querySelector(`.gem-card[data-gem-id="${gemId}"]`);
                if (gemCard && window.HiddenGems && window.HiddenGems.cards) {
                    const cardIndex = Array.from(document.querySelectorAll('.gem-card')).indexOf(gemCard);
                    if (cardIndex !== -1 && window.HiddenGems.cards.updateCardPositions) {
                        window.HiddenGems.cards.updateCardPositions(cardIndex);
                    }
                }
                
                // Update card UI if swipe module is available
                if (window.HiddenGems && window.HiddenGems.swipe && 
                    typeof window.HiddenGems.swipe.goToGem === 'function') {
                    window.HiddenGems.swipe.goToGem(index);
                }
                
                // Highlight the marker
                highlightGemMarker(index, gemId);
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
    if (activeGemIndex >= 0 && activeGemIndex < gems.length) {
        const gemId = gems[activeGemIndex].id || gems[activeGemIndex].index || `gem-${activeGemIndex}`;
        highlightGemMarker(activeGemIndex, gemId.toString());
    }
    
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
 * @param {string} gemId - Optional ID of the gem (for better sync with cards)
 */
function highlightGemMarker(index, gemId) {
    // Validate index and markers array
    if (!markers || markers.length === 0 || index < 0 || index >= markers.length) {
        console.warn('Invalid marker index or no markers available');
        return;
    }
    
    // Update active index
    activeGemIndex = index;
    window.HiddenGems.map.activeGemIndex = index;
    
    // Reset all markers to default state
    markers.forEach((marker, i) => {
        const el = marker.getElement();
        
        // Remove active class from all markers
        el.classList.remove('active-gem');
        
        if (i === index || (gemId && marker.gemId === gemId)) {
            // Active marker styling
            el.style.transform = 'scale(1.4)';
            el.style.zIndex = '100';
            el.classList.add('active-gem');
            
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
            
            // Remove any pulse effect
            const pulseEffect = el.querySelector('.pulse-effect');
            if (pulseEffect) {
                pulseEffect.remove();
            }
        }
    });
    
    // Try to find a target marker by gemId first
    let targetMarker = null;
    if (gemId) {
        targetMarker = markers.find(m => m.gemId === gemId);
    }
    
    // Fall back to index if no marker found by gemId
    if (!targetMarker) {
        targetMarker = markers[index];
    }
    
    // Get target coordinates
    const targetLngLat = targetMarker.getLngLat();
    
    // Center map on active gem with proper mobile-friendly animation
    map.flyTo({
        center: targetLngLat,
        zoom: 14,
        duration: 800,
        essential: true,
        padding: { top: 50, bottom: 200, left: 50, right: 50 },
        easing: function(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }
    });
    
    // Update card display if available
    if (window.HiddenGems && window.HiddenGems.cards && 
        typeof window.HiddenGems.cards.updateCardPositions === 'function') {
        window.HiddenGems.cards.updateCardPositions(index);
    }
    
    // Tell cards controller to update active gem
    if (window.HiddenGems && window.HiddenGems.cards && 
        typeof window.HiddenGems.cards.setActiveCard === 'function') {
        window.HiddenGems.cards.setActiveCard(index);
    }
    
    // Dispatch event for other components
    document.dispatchEvent(new CustomEvent('gemSelected', {
        detail: { 
            index: index,
            id: gemId || (window.HiddenGems?.data?.gems?.[index]?.id)
        }
    }));
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

    // Route-related methods and other map functionality remain unchanged
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
        
        // Find the optimal route (nearest neighbor heuristic)
        const routePoints = this._calculateOptimalRoute(origin, selectedGems, destination);
        
        // Draw the route on the map
        this._drawRouteOnMap(routePoints);
        
        // Fit map bounds to include the entire route
        this._fitMapToRoute(routePoints);
    },

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

    _toRadians: function(degrees) {
        return degrees * Math.PI / 180;
    },

    _drawRouteOnMap: function(routePoints) {
        if (!map || routePoints.length < 2) {
            return;
        }
        
        this._showRouteDistance(routePoints);
        
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

// Export functions for use in other scripts
window.renderGems = renderGems;
window.clearMarkers = clearMarkers;
window.highlightGemMarker = highlightGemMarker;
window.initializeMap = initializeMap;