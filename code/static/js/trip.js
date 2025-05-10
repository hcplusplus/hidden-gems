/**
 * trip.js
 * Handles the trip.html page that receives the selected gems and user preferences
 */

// Ensure HiddenGems namespace exists
window.HiddenGems = window.HiddenGems || {};

// Initialize the trip module
window.HiddenGems.trip = {
    tripData: null,
    
    /**
     * Initialize the trip page
     */
    init: function() {
        console.log('Initializing trip page');
        
        // Show loading indicator
        const loadingEl = document.createElement('div');
        loadingEl.id = 'trip-loading';
        loadingEl.style.position = 'fixed';
        loadingEl.style.top = '50%';
        loadingEl.style.left = '50%';
        loadingEl.style.transform = 'translate(-50%, -50%)';
        loadingEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        loadingEl.style.color = 'white';
        loadingEl.style.padding = '15px 20px';
        loadingEl.style.borderRadius = '5px';
        loadingEl.style.zIndex = '2000';
        loadingEl.innerHTML = 'Loading your trip...';
        document.body.appendChild(loadingEl);
        
        // Try to get trip data from URL
        try {
            this.loadTripData();
            
            // Render trip data
            this.renderTrip();
            
            // Hide loading indicator
            loadingEl.remove();
        } catch (error) {
            console.error('Error initializing trip:', error);
            
            // Update loading indicator to show error
            loadingEl.innerHTML = `
                <div style="text-align: center">
                    <div style="margin-bottom: 10px">❌ Error loading trip</div>
                    <div style="font-size: 14px">${error.message}</div>
                    <button id="back-btn" style="margin-top: 15px; padding: 8px 16px; background: white; color: black; border: none; border-radius: 4px; cursor: pointer">
                        Back to Gems
                    </button>
                </div>
            `;
            
            // Add event listener to back button
            document.getElementById('back-btn').addEventListener('click', function() {
                window.location.href = 'index.html';
            });
        }
    },
    
    /**
     * Load trip data from URL parameters
     */
    loadTripData: function() {
        // Get the URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const encodedData = urlParams.get('data');
        
        if (!encodedData) {
            throw new Error('No trip data found in URL');
        }
        
        try {
            // Decode and parse the JSON data
            this.tripData = JSON.parse(decodeURIComponent(encodedData));
            
            console.log('Trip data loaded:', this.tripData);
            
            // Validate the data
            if (!this.tripData.selectedGems || !Array.isArray(this.tripData.selectedGems)) {
                throw new Error('Invalid trip data: No selected gems found');
            }
            
            if (this.tripData.selectedGems.length === 0) {
                throw new Error('No gems selected for this trip');
            }
        } catch (error) {
            console.error('Error parsing trip data:', error);
            throw new Error('Could not load trip data. Please try again.');
        }
    },
    
    /**
     * Render the trip data on the page
     */
    renderTrip: function() {
        if (!this.tripData) {
            console.error('No trip data available');
            return;
        }
        
        // Get container element
        const container = document.getElementById('trip-container');
        if (!container) {
            console.error('Trip container not found');
            return;
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Create trip header
        const header = document.createElement('div');
        header.className = 'trip-header';
        header.innerHTML = `
            <h1>Your Northern California Adventure</h1>
            <p>${this.tripData.selectedGems.length} gems selected for your trip</p>
        `;
        container.appendChild(header);
        
        // Create map container
        const mapContainer = document.createElement('div');
        mapContainer.id = 'trip-map';
        mapContainer.style.width = '100%';
        mapContainer.style.height = '300px';
        mapContainer.style.marginBottom = '20px';
        mapContainer.style.borderRadius = '8px';
        mapContainer.style.overflow = 'hidden';
        container.appendChild(mapContainer);
        
        // Create gems list
        const gemsList = document.createElement('div');
        gemsList.className = 'gems-list';
        container.appendChild(gemsList);
        
        // Add each gem to the list
        this.tripData.selectedGems.forEach((gem, index) => {
            const gemItem = document.createElement('div');
            gemItem.className = 'gem-item';
            gemItem.innerHTML = `
                <div class="gem-number">${index + 1}</div>
                <div class="gem-icon">${this._getCategoryEmoji(gem.category || gem.gemType || gem.type)}</div>
                <div class="gem-details">
                    <h3>${gem.name || gem.title || 'Hidden Gem'}</h3>
                    <div class="gem-location">${gem.address || gem.location || 'Location unknown'}</div>
                    ${gem.description ? `<div class="gem-description">${gem.description}</div>` : ''}
                    ${gem.distance ? `<div class="gem-distance">${gem.distance} miles away</div>` : ''}
                </div>
            `;
            gemsList.appendChild(gemItem);
        });
        
        // Add back button
        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        backButton.innerText = 'Back to Gems';
        backButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        container.appendChild(backButton);
        
        // Initialize map
        this.initializeMap();
    },
    
    /**
     * Initialize the map for the trip
     */
    initializeMap: function() {
        if (!this.tripData || !this.tripData.selectedGems || this.tripData.selectedGems.length === 0) {
            console.error('No gems available for map');
            return;
        }
        
        // Wait for MapLibre to be available
        if (!window.maplibregl) {
            console.warn('MapLibre not available yet, waiting...');
            setTimeout(() => this.initializeMap(), 100);
            return;
        }
        
        // Create map
        const map = new maplibregl.Map({
            container: 'trip-map',
            style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=hbvo5fWE9HuC6JUHKB9q',
            center: [-122.2730, 37.8715], // Default center (Berkeley)
            zoom: 9
        });
        
        // Add navigation controls
        map.addControl(new maplibregl.NavigationControl(), 'top-left');
        
        // Wait for map to load
        map.on('load', () => {
            const bounds = new maplibregl.LngLatBounds();
            
            // Add markers for each gem
            this.tripData.selectedGems.forEach((gem, index) => {
                const coords = gem.coords || gem.coordinates;
                if (!coords || coords.length !== 2) return;
                
                // Make sure we have longitude, latitude in the right order
                const [a, b] = coords;
                const lngLat = (Math.abs(a) > 90 && Math.abs(b) <= 90) ? [a, b] : [b, a];
                
                // Create marker element
                const el = document.createElement('div');
                el.className = 'trip-marker';
                el.style.width = '30px';
                el.style.height = '30px';
                el.style.backgroundColor = '#4285F4';
                el.style.color = 'white';
                el.style.borderRadius = '50%';
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                el.style.fontWeight = 'bold';
                el.style.border = '2px solid white';
                el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
                el.style.cursor = 'pointer';
                el.innerText = (index + 1).toString();
                
                // Create popup
                const popup = new maplibregl.Popup({ offset: 25 })
                    .setHTML(`
                        <div>
                            <strong>${gem.name || gem.title || 'Hidden Gem'}</strong><br/>
                            ${gem.address || gem.location || ''}
                        </div>
                    `);
                
                // Add marker to map
                new maplibregl.Marker(el)
                    .setLngLat(lngLat)
                    .setPopup(popup)
                    .addTo(map);
                
                // Extend bounds
                bounds.extend(lngLat);
            });
            
            // Fit map to bounds if we have any
            if (!bounds.isEmpty()) {
                map.fitBounds(bounds, {
                    padding: 40,
                    maxZoom: 12
                });
            }
        });
    },
    
    /**
     * Get emoji for a gem category
     * @param {string} category - Category or type of gem
     * @returns {string} Emoji representation of the category
     */
    _getCategoryEmoji: function(category) {
        if (!category) return '📍';
        
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
        
        return emojiMap[category] || '📍';
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize trip module
    window.HiddenGems.trip.init();
});