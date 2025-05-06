/**
 * Map functionality for the Hidden Gems application
 */

// Ensure namespace exists
var HiddenGems = window.HiddenGems || {};

// Map sub-namespace
HiddenGems.map = {
    // MapLibre map instance
    mapInstance: null,
    
    // Markers for gems
    markers: [],
    
    // Lines for detours
    detourLines: [],
    
    // Origin and destination markers
    originMarker: null,
    destinationMarker: null,
    
    // Current active gem index
    activeGemIndex: 0,
    
    /**
     * Initialize the map
     * @returns {Promise} Resolves when map is loaded
     */
    init: function() {
        return new Promise((resolve, reject) => {
            try {
                // Check if maplibregl is available
                if (typeof maplibregl === 'undefined') {
                    console.error('MapLibre failed to load properly.');
                    document.getElementById('map').innerHTML = 
                        '<div style="padding: 20px; color: red;">Failed to load MapLibre. Please check console for errors.</div>';
                    reject(new Error('MapLibre not defined'));
                    return;
                }
                
                // Get route data
                const routeData = HiddenGems.data.routes.current;
                
                // Calculate center of route
                const centerLng = (routeData.origin.coordinates[0] + routeData.destination.coordinates[0]) / 2;
                const centerLat = (routeData.origin.coordinates[1] + routeData.destination.coordinates[1]) / 2;
                
                // Initialize the map
                this.mapInstance = new maplibregl.Map({
                    container: 'map',
                    style: 'https://demotiles.maplibre.org/style.json',
                    center: [centerLng, centerLat],
                    zoom: 11,
                    pitch: 0,
                    attributionControl: false
                });
                
                // Wait for map to load then setup features
                this.mapInstance.on('load', () => {
                    this._setupRoutes();
                    this._createMarkers();
                    resolve();
                });
            } catch (err) {
                reject(err);
            }
        });
    },
    
    /**
     * Set up main route and map layers
     * @private
     */
    _setupRoutes: function() {
        const routeData = HiddenGems.data.routes.current;
        
        // Add the main route source
        this.mapInstance.addSource('main-route', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': routeData.mainRoute
                }
            }
        });
        
        // Add main route line
        this.mapInstance.addLayer({
            'id': 'main-route-line',
            'type': 'line',
            'source': 'main-route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#000',
                'line-width': 4
            }
        });
        
        // Add dotted route decoration
        this.mapInstance.addLayer({
            'id': 'main-route-dots',
            'type': 'line',
            'source': 'main-route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#fff',
                'line-width': 2,
                'line-dasharray': [0, 2, 1]
            }
        });
    },
    
    /**
     * Create markers for origin, destination, and gems
     * @private
     */
    _createMarkers: function() {
        const routeData = HiddenGems.data.routes.current;
        const gems = HiddenGems.data.gems;
        
        // Create origin marker
        const originEl = document.createElement('div');
        originEl.className = 'current-location-marker';
        
        this.originMarker = new maplibregl.Marker(originEl)
            .setLngLat(routeData.origin.coordinates)
            .addTo(this.mapInstance);
        
        // Create destination marker
        const destinationEl = document.createElement('div');
        destinationEl.className = 'destination-marker';
        
        this.destinationMarker = new maplibregl.Marker(destinationEl)
            .setLngLat(routeData.destination.coordinates)
            .addTo(this.mapInstance);
        
        // Create markers and detour lines for each gem
        gems.forEach((gem, index) => {
            // Create marker element
            const markerEl = document.createElement('div');
            markerEl.className = `marker gem-tier-${gem.tier}`;

            if (index === this.activeGemIndex) {
                markerEl.classList.add('active');
            }
            
            // Create marker
            const marker = new maplibregl.Marker(markerEl)
                .setLngLat(gem.coordinates)
                .addTo(this.mapInstance);
            
            this.markers.push(marker);
            
            // Create detour route
            this._createDetourLine(gem, index);
        });
    },
    
    /**
     * Create a detour line from the main route to a gem
     * @param {Object} gem - Gem data
     * @param {number} index - Index of the gem
     * @private
     */
    _createDetourLine: function(gem, index) {
        const routeData = HiddenGems.data.routes.current;
        
        // Find the closest point on the main route to this gem
        let closestPointIndex = 0;
        let minDistance = Infinity;
        
        routeData.mainRoute.forEach((point, i) => {
            const distance = HiddenGems.utils.calculateDistance(point, gem.coordinates);
            if (distance < minDistance) {
                minDistance = distance;
                closestPointIndex = i;
            }
        });
        
        // Create a detour path from main route → gem → main route
        const detourCoordinates = [
            routeData.mainRoute[closestPointIndex],
            gem.coordinates,
            routeData.mainRoute[closestPointIndex]
        ];
        
        // Add detour source
        this.mapInstance.addSource(`detour-${index}`, {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': detourCoordinates
                }
            }
        });
        
        // Add detour layer (initially invisible except for active gem)
        const visibility = index === this.activeGemIndex ? 'visible' : 'none';
        const layerId = `detour-line-${index}`;
        
        this.mapInstance.addLayer({
            'id': layerId,
            'type': 'line',
            'source': `detour-${index}`,
            'layout': {
                'line-join': 'round',
                'line-cap': 'round',
                'visibility': visibility
            },
            'paint': {
                'line-color': getComputedStyle(document.documentElement)
               .getPropertyValue(`--gem-${gem.tier}`).trim(),
                'line-width': 3,
                'line-dasharray': [2, 2]
            }
        });
        
        this.detourLines.push(layerId);
    },
    
    /**
     * Update the active gem marker and detour line
     * @param {number} newIndex - Index of the new active gem
     */
    updateActiveGem: function(newIndex) {
        // Remove active class from current marker
        const currentMarkerEl = this.markers[this.activeGemIndex].getElement();
        currentMarkerEl.classList.remove('active');
        
        // Hide current detour line
        this.mapInstance.setLayoutProperty(this.detourLines[this.activeGemIndex], 'visibility', 'none');
        
        // Update active index
        this.activeGemIndex = newIndex;
        
        // Add active class to new marker
        const newMarkerEl = this.markers[this.activeGemIndex].getElement();
        newMarkerEl.classList.add('active');
        
        // Show new detour line
        this.mapInstance.setLayoutProperty(this.detourLines[this.activeGemIndex], 'visibility', 'visible');
        
        // Fly to the new marker location
        this.flyToGem(newIndex);
    },
    
    /**
     * Fly the map to a specific gem
     * @param {number} gemIndex - Index of the gem to fly to
     */
    flyToGem: function(gemIndex) {
        const gem = HiddenGems.data.gems[gemIndex];
        
        this.mapInstance.flyTo({
            center: gem.coordinates,
            zoom: 12,
            duration: 1000
        });
    }
};

// Export the namespace
window.HiddenGems = HiddenGems;
