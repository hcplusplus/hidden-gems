/**
 * map-recommendations.js
 * Handles the map display and interaction for the trip recommendations page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Add to map-recommendations.js at the beginning of the DOMContentLoaded handler
    function getPageData() {
        // First check for session ID
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session');

        if (sessionId) {
            // Get data from sessionStorage
            const sessionData = sessionStorage.getItem(`hiddenGems_session_${sessionId}`);
            if (sessionData) {
                try {
                    return JSON.parse(sessionData);
                } catch (e) {
                    console.error('Error parsing session data:', e);
                }
            }
        }

        // Fall back to data controller
        if (window.HiddenGemsData) {
            const preferences = HiddenGemsData.preferences.get();
            const selectedGems = HiddenGemsData.gemsData.getSelected();

            if (selectedGems.length > 0) {
                return {
                    preferences: preferences,
                    selectedGems: selectedGems
                };
            }
        }

        // Try older URL data format
        const encodedData = urlParams.get('data');
        if (encodedData) {
            try {
                return JSON.parse(decodeURIComponent(encodedData));
            } catch (e) {
                console.error('Error parsing URL data:', e);
            }
        }

        // No valid data found
        return null;
    }

  
        // Check if MapLibre is available
    if (typeof maplibregl === 'undefined') {
        console.error('MapLibre not available');
        document.getElementById('map').innerHTML = '<div style="padding: 20px; color: red;">Map library failed to load. Please refresh the page.</div>';
        return;
    }
    
    // Get selected gem data from URL or localStorage
    let tripData = getPageData();
    
    // If no data in URL, check localStorage
    if (!tripData || !tripData.selectedGems) {
        const preferences = HiddenGemsData.preferences.get();
        const selectedGems = HiddenGemsData.gemsData.getSelected();
        
        if (selectedGems.length === 0) {
            // No gems selected - show message and return to index
            alert('No gems selected for your trip. Please select gems first.');
            window.location.href = 'index.html';
            return;
        }
        
        tripData = {
            preferences: preferences,
            selectedGems: selectedGems
        };
    }
    
    // Display trip summary
    const tripInfo = document.getElementById('trip-info');
    tripInfo.innerHTML = `
        <div class="trip-summary">
            <h2>${tripData.selectedGems.length} Hidden Gems</h2>
            <p>Your Northern California adventure</p>
        </div>
    `;
    
    // Variables to track the active gem
    let activeGemIndex = 0;
    let markers = [];
    let popup;
    
    // Initialize the map
    const map = new maplibregl.Map({
        container: 'map',
        style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=hbvo5fWE9HuC6JUHKB9q',
        center: [-122.2730, 37.8715], // Default to Berkeley
        zoom: 10,
        attributionControl: false
    });
    
    map.addControl(new maplibregl.NavigationControl(), 'top-left');
    
    // Wait for map to load
    map.on('load', function() {
        renderGems(tripData.selectedGems);
        createGemCards(tripData.selectedGems);
        createSwipeIndicators(tripData.selectedGems);
        
        // If we have origin/destination in preferences, draw route
        if (tripData.preferences.origin && tripData.preferences.destination) {
            drawRoute(tripData.preferences.origin, tripData.preferences.destination, tripData.selectedGems);
        }
    });
    
    /**
     * Render gems on the map
     * @param {Array} gems - Array of gem objects to display
     */
    function renderGems(gems) {
        const bounds = new maplibregl.LngLatBounds();
        markers = [];
        
        // Add markers for each gem
        gems.forEach((gem, index) => {
            const coords = gem.coords || gem.coordinates;
            if (!coords || coords.length !== 2) return;
            
            // Ensure coordinates are in the correct format
            const [a, b] = coords;
            const lngLat = (Math.abs(a) > 90 && Math.abs(b) <= 90) ? [a, b] : [b, a];
            
            // Create marker element
            const el = document.createElement('div');
            el.className = 'gem-marker';
            
            // Set SVG based on gem color/popularity
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
            
            // Create the marker
            const marker = new maplibregl.Marker({
                element: el,
                anchor: 'center'
            })
            .setLngLat(lngLat)
            .addTo(map);
            
            // Add click handler
            el.addEventListener('click', function() {
                showGemDetails(index);
            });
            
            // Create popup for this marker
            const popupContent = `
                <h3>${gem.name || gem.title}</h3>
                <p>${gem.address || gem.location || ''}</p>
                ${gem.description ? `<p>${gem.description.substring(0, 100)}...</p>` : ''}
            `;
            
            const markerPopup = new maplibregl.Popup({
                offset: 25,
                closeButton: true,
                closeOnClick: true
            }).setHTML(popupContent);
            
            marker.setPopup(markerPopup);
            
            // Store marker
            markers.push(marker);
            
            // Extend map bounds
            bounds.extend(lngLat);
        });
        
        // Fit map to include all markers
        if (!bounds.isEmpty()) {
            map.fitBounds(bounds, {
                padding: 50,
                maxZoom: 13
            });
        }
    }
    
    /**
     * Create gem cards
     * @param {Array} gems - Array of gem objects
     */
    function createGemCards(gems) {
        const cardsContainer = document.querySelector('.cards-container');
        cardsContainer.innerHTML = '';
        
        // Create a card for each gem
        gems.forEach((gem, index) => {
            const card = document.createElement('div');
            card.className = 'gem-card';
            card.id = `card-${index}`;
            
            // Set initial position (active, prev, next)
            if (index === activeGemIndex) {
                card.classList.add('active');
            } else if (index === getPrevIndex(activeGemIndex, gems.length)) {
                card.classList.add('prev');
            } else if (index === getNextIndex(activeGemIndex, gems.length)) {
                card.classList.add('next');
            }
            
            // Get emoji for the gem type
            const emoji = getCategoryEmoji(gem.category || gem.gemType || gem.type);
            
            // Card content
            card.innerHTML = `
                <div class="card-handle"></div>
                <div class="card-content">
                    <div class="card-image">${emoji}</div>
                    <div class="card-details">
                        <h3 class="card-title">${gem.name || gem.title || 'Hidden Gem'}</h3>
                        <div class="card-address">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            <span>${gem.address || gem.location || 'Location'}</span>
                        </div>
                        <div class="card-hours">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                                <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                            </svg>
                            <span>${gem.hours || gem.cost || ''}</span>
                        </div>
                        ${gem.distance ? `<div class="card-distance">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M21 15.46l-5.27-.61-2.52 2.52c-2.83-1.44-5.15-3.75-6.59-6.59l2.53-2.53L8.54 3H3.03C2.45 13.18 10.82 21.55 21 20.97v-5.51z"/>
                            </svg>
                            <span>${gem.distance} miles away</span>
                        </div>` : ''}
                        <button class="explore-now-btn" data-gem-id="${gem.id || index}">
                            Navigate to This Gem
                        </button>
                    </div>
                </div>
            `;
            
            cardsContainer.appendChild(card);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.explore-now-btn').forEach(button => {
            button.addEventListener('click', function() {
                const gemId = this.getAttribute('data-gem-id');
                const index = tripData.selectedGems.findIndex(g => 
                    (g.id || g.index).toString() === gemId.toString());
                    
                if (index !== -1) {
                    const gem = tripData.selectedGems[index];
                    navigateToGem(gem);
                }
            });
        });
        
        // Initialize swipe handling for cards
        initSwipeHandling();
    }
    
    /**
     * Create swipe indicators (dots)
     * @param {Array} gems - Array of gem objects
     */
    function createSwipeIndicators(gems) {
        const indicatorContainer = document.querySelector('.swipe-indicator');
        indicatorContainer.innerHTML = '';
        
        // Don't show indicators if too many gems
        if (gems.length > 15) {
            const positionText = document.createElement('div');
            positionText.className = 'position-text';
            positionText.textContent = `${activeGemIndex + 1} / ${gems.length}`;
            indicatorContainer.appendChild(positionText);
            return;
        }
        
        // Create a dot for each gem
        gems.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            if (index === activeGemIndex) {
                dot.classList.add('active');
            }
            
            // Add click handler to jump directly to this gem
            dot.addEventListener('click', function() {
                showGemDetails(index);
            });
            
            indicatorContainer.appendChild(dot);
        });
    }
    
    /**
     * Show details for a specific gem
     * @param {number} index - Index of the gem to show
     */
    function showGemDetails(index) {
        // Update active index
        activeGemIndex = index;
        
        // Update card positions
        updateCardPositions();
        
        // Update marker display
        updateMarkers();
        
        // Fly to the gem
        const gem = tripData.selectedGems[index];
        const coords = gem.coords || gem.coordinates;
        if (coords && coords.length === 2) {
            const [a, b] = coords;
            const lngLat = (Math.abs(a) > 90 && Math.abs(b) <= 90) ? [a, b] : [b, a];
            
            map.flyTo({
                center: lngLat,
                zoom: 14,
                duration: 1000
            });
            
            // Show popup for this marker
            if (popup) popup.remove();
            
            popup = new maplibregl.Popup({
                offset: 25,
                closeButton: true,
                closeOnClick: true
            })
            .setLngLat(lngLat)
            .setHTML(`
                <h3>${gem.name || gem.title}</h3>
                <p>${gem.address || gem.location || ''}</p>
                ${gem.description ? `<p>${gem.description.substring(0, 100)}...</p>` : ''}
            `)
            .addTo(map);
        }
        
        // Update trip state
        HiddenGemsData.tripState.update('lastGemVisited', gem.id || index);
    }
    
    /**
     * Update card positions based on active gem
     */
    function updateCardPositions() {
        const gems = tripData.selectedGems;
        const prevIndex = getPrevIndex(activeGemIndex, gems.length);
        const nextIndex = getNextIndex(activeGemIndex, gems.length);
        
        // Remove all position classes
        document.querySelectorAll('.gem-card').forEach(card => {
            card.classList.remove('active', 'prev', 'next');
            card.style.transform = 'none'; // Reset any transforms from swiping
        });
        
        // Add appropriate position classes
        const activeCard = document.getElementById(`card-${activeGemIndex}`);
        const prevCard = document.getElementById(`card-${prevIndex}`);
        const nextCard = document.getElementById(`card-${nextIndex}`);
        
        if (activeCard) activeCard.classList.add('active');
        if (prevCard) prevCard.classList.add('prev');
        if (nextCard) nextCard.classList.add('next');
        
        // Update active indicator dot
        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === activeGemIndex);
        });
        
        // Update position text if it exists
        const positionText = document.querySelector('.position-text');
        if (positionText) {
            positionText.textContent = `${activeGemIndex + 1} / ${gems.length}`;
        }
    }
    
    /**
     * Update markers to highlight active gem
     */
    function updateMarkers() {
        markers.forEach((marker, index) => {
            const el = marker.getElement();
            if (index === activeGemIndex) {
                el.style.transform = 'scale(1.4)';
                el.style.zIndex = '10';
            } else {
                el.style.transform = 'scale(1.0)';
                el.style.zIndex = '1';
            }
        });
    }
    
    /**
     * Navigate to a specific gem (external maps app)
     * @param {Object} gem - Gem object to navigate to
     */
    function navigateToGem(gem) {
        const coords = gem.coords || gem.coordinates;
        if (!coords || coords.length !== 2) {
            alert('Sorry, coordinates not available for this location.');
            return;
        }
        
        const [a, b] = coords;
        const lat = Math.abs(a) <= 90 ? a : b;
        const lng = Math.abs(a) > 90 ? a : b;
        
        // For mobile devices, try to use the native maps app
        if (navigator.platform.indexOf('iPhone') !== -1 || 
            navigator.platform.indexOf('iPad') !== -1 || 
            navigator.platform.indexOf('iPod') !== -1) {
            window.open(`maps://maps.apple.com/maps?daddr=${lat},${lng}`);
        } else {
            // For other devices, use Google Maps
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
        }
        
        // Update trip state to "traveling"
        HiddenGemsData.tripState.update('currentStep', 'traveling');
        
        // Redirect to trip.html for travel tracking
        const data = {
            gem: gem,
            tripState: HiddenGemsData.tripState.get()
        };
        
        // Redirect after a short delay to allow the maps app to open
        setTimeout(() => {
            window.location.href = HiddenGemsData.utils.generateDataUrl('trip.html', data);
        }, 1500);
    }
    
    /**
     * Draw route between points
     * @param {Object} origin - Origin point object with coordinates
     * @param {Object} destination - Destination point object with coordinates
     * @param {Array} waypoints - Array of gem objects as waypoints
     */
    function drawRoute(origin, destination, waypoints) {
        // Remove existing routes
        if (map.getLayer('route-line')) {
            map.removeLayer('route-line');
        }
        if (map.getSource('route')) {
            map.removeSource('route');
        }
        
        // Create a simple route (in a real app, you would use a routing API)
        const routeCoordinates = [origin.coordinates];
        
        // Add waypoints in order (a proper routing service would optimize this)
        waypoints.forEach(gem => {
            const coords = gem.coords || gem.coordinates;
            if (coords && coords.length === 2) {
                const [a, b] = coords;
                const lngLat = (Math.abs(a) > 90 && Math.abs(b) <= 90) ? [a, b] : [b, a];
                routeCoordinates.push(lngLat);
            }
        });
        
        // Add destination
        routeCoordinates.push(destination.coordinates);
        
        // Add the route to the map
        map.addSource('route', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': routeCoordinates
                }
            }
        });
        
        map.addLayer({
            'id': 'route-line',
            'type': 'line',
            'source': 'route',
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
        
        // Add origin and destination markers
        if (origin.coordinates) {
            const originEl = document.createElement('div');
            originEl.className = 'origin-marker';
            
            new maplibregl.Marker({
                element: originEl,
                anchor: 'center'
            })
            .setLngLat(origin.coordinates)
            .addTo(map);
        }
        
        if (destination.coordinates) {
            const destEl = document.createElement('div');
            destEl.className = 'destination-marker';
            
            new maplibregl.Marker({
                element: destEl,
                anchor: 'center'
            })
            .setLngLat(destination.coordinates)
            .addTo(map);
        }
    }
    
    /**
     * Initialize touch handling for cards
     */
    function initSwipeHandling() {
        const cardsContainer = document.querySelector('.cards-container');
        
        // Touch tracking variables
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        const threshold = 80; // Minimum distance to trigger swipe
        
        // Touch event handlers
        cardsContainer.addEventListener('touchstart', handleTouchStart, false);
        cardsContainer.addEventListener('touchmove', handleTouchMove, false);
        cardsContainer.addEventListener('touchend', handleTouchEnd, false);
        
        // For desktop testing
        cardsContainer.addEventListener('mousedown', handleMouseDown, false);
        cardsContainer.addEventListener('mousemove', handleMouseMove, false);
        cardsContainer.addEventListener('mouseup', handleMouseUp, false);
        cardsContainer.addEventListener('mouseleave', handleMouseUp, false);
        
        /**
         * Handle touch start event
         * @param {TouchEvent} e - Touch event
         */
        function handleTouchStart(e) {
            startX = e.touches[0].clientX;
            currentX = startX;
            isDragging = true;
            
            // Get current active card and adjacent cards
            const activeCard = document.querySelector('.gem-card.active');
            const prevCard = document.querySelector('.gem-card.prev');
            const nextCard = document.querySelector('.gem-card.next');
            
            // Reset transitions during drag
            if (activeCard) activeCard.style.transition = 'none';
            if (prevCard) prevCard.style.transition = 'none';
            if (nextCard) nextCard.style.transition = 'none';
        }
        
        /**
         * Handle touch move event
         * @param {TouchEvent} e - Touch event
         */
        function handleTouchMove(e) {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            const diffX = currentX - startX;
            
            // Get current active card and adjacent cards
            const activeCard = document.querySelector('.gem-card.active');
            const prevCard = document.querySelector('.gem-card.prev');
            const nextCard = document.querySelector('.gem-card.next');
            
            if (activeCard) activeCard.style.transform = `translateX(${diffX}px)`;
            
            // Move adjacent cards proportionally
            if (diffX > 0 && prevCard) {
                // Swiping right, show prev card
                prevCard.style.transform = `translateX(calc(-100% + ${diffX}px))`;
            } else if (diffX < 0 && nextCard) {
                // Swiping left, show next card
                nextCard.style.transform = `translateX(calc(100% + ${diffX}px))`;
            }
            
            // Prevent default scrolling when swiping
            e.preventDefault();
        }
        
        /**
         * Handle touch end event
         * @param {TouchEvent} e - Touch event
         */
        function handleTouchEnd(e) {
            if (!isDragging) return;
            
            // Get cards and restore transitions
            const activeCard = document.querySelector('.gem-card.active');
            const prevCard = document.querySelector('.gem-card.prev');
            const nextCard = document.querySelector('.gem-card.next');
            
            if (activeCard) activeCard.style.transition = 'transform 0.3s ease-out';
            if (prevCard) prevCard.style.transition = 'transform 0.3s ease-out';
            if (nextCard) nextCard.style.transition = 'transform 0.3s ease-out';
            
            // Calculate swipe distance
            const diffX = currentX - startX;
            
            if (diffX > threshold) {
                // Swiped right - go to previous
                const prevIndex = getPrevIndex(activeGemIndex, tripData.selectedGems.length);
                showGemDetails(prevIndex);
            } else if (diffX < -threshold) {
                // Swiped left - go to next
                const nextIndex = getNextIndex(activeGemIndex, tripData.selectedGems.length);
                showGemDetails(nextIndex);
            } else {
                // Not enough movement, reset positions
                if (activeCard) activeCard.style.transform = 'translateX(0)';
                if (prevCard) prevCard.style.transform = 'translateX(-100%)';
                if (nextCard) nextCard.style.transform = 'translateX(100%)';
            }
            
            isDragging = false;
        }
        
        /**
         * Handle mouse down event (for desktop testing)
         * @param {MouseEvent} e - Mouse event
         */
        function handleMouseDown(e) {
            startX = e.clientX;
            currentX = startX;
            isDragging = true;
            
            // Get cards
            const activeCard = document.querySelector('.gem-card.active');
            const prevCard = document.querySelector('.gem-card.prev');
            const nextCard = document.querySelector('.gem-card.next');
            
            // Reset transitions
            if (activeCard) activeCard.style.transition = 'none';
            if (prevCard) prevCard.style.transition = 'none';
            if (nextCard) nextCard.style.transition = 'none';
            
            e.preventDefault();
        }
        
        /**
         * Handle mouse move event (for desktop testing)
         * @param {MouseEvent} e - Mouse event
         */
        function handleMouseMove(e) {
            if (!isDragging) return;
            
            currentX = e.clientX;
            const diffX = currentX - startX;
            
            // Get cards
            const activeCard = document.querySelector('.gem-card.active');
            const prevCard = document.querySelector('.gem-card.prev');
            const nextCard = document.querySelector('.gem-card.next');
            
            if (activeCard) activeCard.style.transform = `translateX(${diffX}px)`;
            
            // Move adjacent cards proportionally
            if (diffX > 0 && prevCard) {
                // Swiping right, show prev card
                prevCard.style.transform = `translateX(calc(-100% + ${diffX}px))`;
            } else if (diffX < 0 && nextCard) {
                // Swiping left, show next card
                nextCard.style.transform = `translateX(calc(100% + ${diffX}px))`;
            }
        }
        
        /**
         * Handle mouse up event (for desktop testing)
         * @param {MouseEvent} e - Mouse event
         */
        function handleMouseUp(e) {
            if (!isDragging) return;
            
            // Get cards and restore transitions
            const activeCard = document.querySelector('.gem-card.active');
            const prevCard = document.querySelector('.gem-card.prev');
            const nextCard = document.querySelector('.gem-card.next');
            
            if (activeCard) activeCard.style.transition = 'transform 0.3s ease-out';
            if (prevCard) prevCard.style.transition = 'transform 0.3s ease-out';
            if (nextCard) nextCard.style.transition = 'transform 0.3s ease-out';
            
            // Calculate swipe distance
            const diffX = currentX - startX;
            
            if (diffX > threshold) {
                // Swiped right - go to previous
                const prevIndex = getPrevIndex(activeGemIndex, tripData.selectedGems.length);
                showGemDetails(prevIndex);
            } else if (diffX < -threshold) {
                // Swiped left - go to next
                const nextIndex = getNextIndex(activeGemIndex, tripData.selectedGems.length);
                showGemDetails(nextIndex);
            } else {
                // Not enough movement, reset positions
                if (activeCard) activeCard.style.transform = 'translateX(0)';
                if (prevCard) prevCard.style.transform = 'translateX(-100%)';
                if (nextCard) nextCard.style.transform = 'translateX(100%)';
            }
            
            isDragging = false;
        }
    }
    
    /**
     * Get the index of the previous gem
     * @param {number} currentIndex - Current gem index
     * @param {number} total - Total number of gems
     * @returns {number} Previous index
     */
    function getPrevIndex(currentIndex, total) {
        return (currentIndex - 1 + total) % total;
    }
    
    /**
     * Get the index of the next gem
     * @param {number} currentIndex - Current gem index
     * @param {number} total - Total number of gems
     * @returns {number} Next index
     */
    function getNextIndex(currentIndex, total) {
        return (currentIndex + 1) % total;
    }
    
    /**
     * Get emoji for a gem category
     * @param {string} category - Category name
     * @returns {string} Emoji representation
     */
    function getCategoryEmoji(category) {
        // Emoji mapping
        const emojiMap = {
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
        };
        
        if (!category) return '📍';
        return emojiMap[category.toLowerCase()] || '📍';
    }
    
    /**
     * Start trip journey
     */
    function startJourney() {
        // Update trip state
        HiddenGemsData.tripState.update('currentStep', 'traveling');
        
        // Start with the first gem
        const firstGem = tripData.selectedGems[0];
        if (firstGem) {
            navigateToGem(firstGem);
        }
    }
    
    // Set up event listeners for buttons
    document.getElementById('start-journey-btn').addEventListener('click', startJourney);
    document.getElementById('add-more-gems-btn').addEventListener('click', function() {
        window.location.href = 'index.html';
    });
    document.getElementById('back-button').addEventListener('click', function() {
        window.location.href = 'index.html';
    });
    
    // Function to handle the "Plan Trip" action
    window.planTrip = function() {
        // Just move to the next planning step or show options
        alert('This feature will be available in a future update!');
    };
});