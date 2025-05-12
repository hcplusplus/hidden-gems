/**
 * landing-page.js
 * Targeted fix for gem positioning and route rendering issues
 */

document.addEventListener('DOMContentLoaded', function () {
    // Get coordinates from sessionStorage
    var originCoords = JSON.parse(sessionStorage.getItem("originCoords"));
    var destinationCoords = JSON.parse(sessionStorage.getItem("destinationCoords"));

    console.log("Landing page initialized");

    // Add fallback coordinates for Berkeley and Sacramento if none exist in sessionStorage
    if (!originCoords) {
        console.log("No origin coordinates found in sessionStorage, using Berkeley as fallback");
        originCoords = [-122.2714, 37.8705]; // Berkeley coordinates
        sessionStorage.setItem("originCoords", JSON.stringify(originCoords));
    }

    if (!destinationCoords) {
        console.log("No destination coordinates found in sessionStorage, using Sacramento as fallback");
        destinationCoords = [-121.4944, 38.5816]; // Sacramento coordinates
        sessionStorage.setItem("destinationCoords", JSON.stringify(destinationCoords));
    }

     window.HiddenGems.data.findGemsAlongRoute('landing-page', originCoords, destinationCoords)

    // Initialize map if we have coordinates
    if (originCoords && destinationCoords) {
        const midPoint = [
            (originCoords[0] + destinationCoords[0]) / 2,
            (originCoords[1] + destinationCoords[1]) / 2
        ];
        
        //const map = window.initializeMap('landing-page')
        window.map
        .setCenter(midPoint)
        .setZoom(7)

        

        // Load the gems when map is ready
        window.map.on('load', function () {
            // Dispatch mapReady event for gem-cards component
            document.dispatchEvent(new CustomEvent('mapReady', {
                bubbles: true
            }));

            // Notify any components that the map is ready
            if (typeof window.notifyMapReady === 'function') {
                window.notifyMapReady();
            }
            window.map.addControl(new maplibregl.NavigationControl(), 'top-left');

           

            // render gems and cards
            const recommendedGems = window.HiddenGems.data.pageGems;
            console.log("Recommended gems:", recommendedGems);
            renderGems(recommendedGems, map);
            // Initialize card display
            initializeDetailCards(recommendedGems);
            console.log("Map rendering complete with", window.markers.length, "markers");

             // Add origin and destination markers only once
            addTripMarkers(originCoords, destinationCoords);
            
            // Add base route (origin to destination)
            addBaseRoute(originCoords, destinationCoords);
            
            // Render route for the initial active gem (assuming first one is active by default)
            if (recommendedGems.length > 0) {
                const firstGem = recommendedGems[0];
                const coords = getValidCoordinates(firstGem.coords || firstGem.coordinates);
                if (coords) {
                    renderDetourRoute(originCoords, destinationCoords, coords);
                }
            }
        });


        // Define function to render routes
        window.renderRoutes = function (gemCoords) {
            if (!originCoords || !destinationCoords || !gemCoords)
                return;
                
            // Clear any existing detour route
            clearDetourRoute();
            
            // Add new detour route
            renderDetourRoute(originCoords, destinationCoords, gemCoords);
        };
        
        // Function to add base route
        function addBaseRoute(origin, destination) {
            const baseRoute = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [origin, destination]
                }
            };
            
            if (!map.getSource('baseRoute')) {
                map.addSource('baseRoute', {
                    type: 'geojson',
                    data: baseRoute
                });
                map.addLayer({
                    id: 'baseRouteLine',
                    type: 'line',
                    source: 'baseRoute',
                    paint: {
                        'line-color': '#000',
                        'line-width': 4
                    }
                });
            } else {
                map.getSource('baseRoute').setData(baseRoute);
            }
        }
        
        // Function to render detour route
        function renderDetourRoute(origin, destination, gemCoords) {
            const detourRoute = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [origin, gemCoords, destination]
                }
            };
            
            if (!map.getSource('detourRoute')) {
                map.addSource('detourRoute', {
                    type: 'geojson',
                    data: detourRoute
                });
                map.addLayer({
                    id: 'detourRouteLine',
                    type: 'line',
                    source: 'detourRoute',
                    paint: {
                        'line-color': '#000',
                        'line-width': 2,
                        'line-dasharray': [2, 2]
                    }
                });
            } else {
                map.getSource('detourRoute').setData(detourRoute);
            }
        }
        
        // Function to clear detour route
        function clearDetourRoute() {
            if (map.getSource('detourRoute')) {
                const emptyFeature = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                };
                map.getSource('detourRoute').setData(emptyFeature);
            }
        }
        
        // Function to add origin and destination markers
        function addTripMarkers(origin, destination) {
            // Add origin marker if not already present
            if (!window.originMarker) {
                const originEl = document.createElement('div');
                originEl.className = 'origin-marker';
                originEl.style.width = '20px';
                originEl.style.height = '20px';
                originEl.style.borderRadius = '50%';
                originEl.style.backgroundColor = '#4CAF50';
                originEl.style.border = '3px solid white';
                originEl.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';

                window.originMarker = new maplibregl.Marker({
                    element: originEl,
                    anchor: 'center'
                })
                    .setLngLat(origin)
                    .addTo(map);
            }

            // Add destination marker if not already present
            if (!window.destMarker) {
                const destEl = document.createElement('div');
                destEl.className = 'dest-marker';
                destEl.style.width = '20px';
                destEl.style.height = '20px';
                destEl.style.borderRadius = '50%';
                destEl.style.backgroundColor = '#F44336';
                destEl.style.border = '3px solid white';
                destEl.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';

                window.destMarker = new maplibregl.Marker({
                    element: destEl,
                    anchor: 'center'
                })
                    .setLngLat(destination)
                    .addTo(map);
            }
        }
        
    } else {
        console.error("Missing origin or destination coordinates");
        // Handle case where coordinates aren't available
        document.getElementById('map').innerHTML =
            '<div style="padding: 20px; text-align: center;">Please set your trip origin and destination first.</div>';
    }
});

// Function to initialize detail cards
function initializeDetailCards(gems) {
    // Find the detail cards element
    const detailCards = document.querySelector('gem-cards[variant="detail"]');

    if (!detailCards) {
        console.error("Detail cards element not found");
        return;
    }

    console.log("Initializing detail cards with", gems.length, "gems");

    // Set the gems data
    if (typeof detailCards.setGems === 'function') {
        detailCards.setGems(gems);
    }

    // Show the first gem
    if (typeof detailCards.showCard === 'function') {
        detailCards.showCard(0);
    }

// Add event listener for card changes
    detailCards.addEventListener('card-change', function(event) {
        const activeIndex = event.detail.index;
        const activeGem = gems[activeIndex];
        
        if (activeGem) {
            const coords = getValidCoordinates(activeGem.coords || activeGem.coordinates);
            if (coords) {
                // Update the route for the active gem
                window.renderRoutes(coords);
                
           
            }
        }
    });
}
    
    // Helper function to get valid coordinates 
    function getValidCoordinates(coords) {
        if (!coords || coords.length !== 2) return null;
        
        // Normalize coordinates using data controller utility if available
        if (window.HiddenGems?.data?.utils?.isValidCoordinate) {
            // Use data controller utility to validate and normalize
            const [a, b] = coords;
          
            if (window.HiddenGems.data.utils.isValidCoordinate(a, b)) {
                return [a, b]; // Already valid lng/lat format
            } else if (window.HiddenGems.data.utils.isValidCoordinate(b, a)) {
                return [b, a]; // Swapped to lng/lat format
            } else {
                console.warn(`Invalid coordinates: [${coords}]`);
                return null;
            }
        } else {
            // Fallback to original logic
            const [a, b] = coords;
          
            if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
                return [a, b]; // Already in [lng, lat] format
            } else if (Math.abs(a) <= 90 && Math.abs(b) > 90) {
                return [b, a]; // Need to swap to [lng, lat] format
            } else {
                // For Northern California, longitude is negative, latitude is positive
                return a < 0 ? [a, b] : [b, a];
            }
        }
    }