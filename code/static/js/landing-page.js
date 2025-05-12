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

        window.map.addControl(new maplibregl.NavigationControl(), 'top-left');

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
            window.HiddenGems.data.findGemsAlongRoute('landing-page', originCoords, destinationCoords)
            
            // render gems and cards
            gems = window.HiddenGems.data.pageGems;
            
            renderGems(gems, map);
            // Initialize card display
            initializeDetailCards(gems);
            console.log("Map rendering complete with", window.markers.length, "markers");

            gems.forEach((gem, index) => {
                const coords = gem.coords || gem.coordinates;
                if (!coords || coords.length !== 2) return;

                // Normalize coordinates using data controller utility if available
                let lngLat;

                if (window.HiddenGems?.data?.utils?.isValidCoordinate) {
                  // Use data controller utility to validate and normalize
                  const [a, b] = coords;
                
                  if (window.HiddenGems.data.utils.isValidCoordinate(a, b)) {
                    lngLat = [a, b]; // Already valid lng/lat format
                  } else if (window.HiddenGems.data.utils.isValidCoordinate(b, a)) {
                    lngLat = [b, a]; // Swapped to lng/lat format
                  } else {
                    console.warn(`Invalid coordinates for gem ${gem.name || 'unnamed'}: [${coords}]`);
                    return; // Skip this gem
                  }
                } else {
                  // Fallback to original logic
                  const [a, b] = coords;
                
                  if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
                    lngLat = [a, b]; // Already in [lng, lat] format
                  } else if (Math.abs(a) <= 90 && Math.abs(b) > 90) {
                    lngLat = [b, a]; // Need to swap to [lng, lat] format
                  } else {
                    // For Northern California, longitude is negative, latitude is positive
                    lngLat = a < 0 ? [a, b] : [b, a];
                  }
                }
                window.renderRoutes(lngLat);
            });

        
        });

        // Define function to render routes
        window.renderRoutes = function (gemCoords) {
            if (!originCoords || !destinationCoords || !gemCoords)
                return;

            const baseRoute = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [originCoords, destinationCoords]
                }
            };

            const detourRoute = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [originCoords, gemCoords, destinationCoords]
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
                    .setLngLat(originCoords)
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
                    .setLngLat(destinationCoords)
                    .addTo(map);
            }
        };
    } else {
        console.error("Missing origin or destination coordinates");
        // Handle case where coordinates aren't available
        document.getElementById('map').innerHTML =
            '<div style="padding: 20px; text-align: center;">Please set your trip origin and destination first.</div>';
    }
});

// shuffle gems from route (TODO change to shuffle recommended gems)
function loadFilteredGems(originCoords, destinationCoords, map) {
    const routeFilteredGemsStr = sessionStorage.getItem("routeFilteredGems");

    if (routeFilteredGemsStr) {
        try {
            const parsedGems = JSON.parse(routeFilteredGemsStr);

            let filteredGems = parsedGems;
            let shuffledGems = filteredGems;
            if (window.HiddenGems && window.HiddenGems.utils && 
        typeof window.HiddenGems.utils.shuffleArray === 'function') {
            shuffledGems = window.HiddenGems.utils.shuffleArray(filteredGems);
            sessionStorage.setItem("shuffledGems", JSON.stringify(shuffledGems));
        }

            const limitGems = shuffledGems.slice(0, window.HiddenGems.constants.DEFAULT_LIMIT || 10); 
            console.log("Shuffled gems:", limitGems);
            sessionStorage.setItem("recommendedGems", JSON.stringify(limitGems));


        } catch (error) {
            console.error("Error processing gems:", error);
        }
    } else {
        console.log("No filtered gems found in sessionStorage, checking if filterGemsByRoute is available");

        // Try to load gems if we have the function but no stored gems
        // this is a fallback for when landing-page is accessed directly without takin the quiz
        if (typeof window.filterGemsByRoute === 'function' && originCoords && destinationCoords) {
            console.log("Attempting to filter gems by route...");
            window.filterGemsByRoute(originCoords, destinationCoords).then(gems => {
                if (gems && gems.length > 0) {
                    sessionStorage.setItem("routeFilteredGems", JSON.stringify(gems));
                    

                    var shuffledGems = sessionStorage.getItem("shuffledGems")
                    
                    
                    const limitGems = shuffledGems.slice(0, window.HiddenGems.constants.DEFAULT_LIMIT || 10); 
                    console.log("Shuffled gems:", limitGems);
                    sessionStorage.setItem("recommendedGems", JSON.stringify(limitGems));
    
                } else {
                    console.log("No gems found along the route");
                }
            }).catch(err => {
                console.error("Error filtering gems:", err);
            });
        } else {
            console.log("Cannot filter gems, function not available or missing coordinates");
        }
    }
}

// Function to render gems on the map
/*function renderGems(gems, map) {
    originCoords = JSON.parse(sessionStorage.getItem("originCoords"));
    destinationCoords = JSON.parse(sessionStorage.getItem("destinationCoords"));
     // First, ensure any lingering loading elements are removed
    const locationLoading = document.getElementById('location-loading');
    if (locationLoading && locationLoading.parentNode) {
        locationLoading.parentNode.removeChild(locationLoading);
    }
    

    if (!Array.isArray(gems)) {
        console.error("Expected gems to be an array, got:", typeof gems);
        try {
            // Try to parse if it's a string
            if (typeof gems === 'string') {
                gems = JSON.parse(gems);
                if (!Array.isArray(gems)) {
                    console.error("Still not an array after parsing:", typeof gems);
                    return;
                }
            } else {
                return;
            }
        } catch (error) {
            console.error("Error parsing gems:", error);
            return;
        }
    }

    console.log("Rendering", gems.length, "gems on the map");

    const bounds = new maplibregl.LngLatBounds();
    window.markers = [];

    gems.forEach((gem, index) => {
        const coords = gem.coords || gem.coordinates;
        if (!coords || coords.length !== 2) {
            console.log("Skipping gem with invalid coordinates:", gem);
            return;
        }

        // Get a unique identifier for the gem
        const gemId = gem.id || `gem-${index}`;

        const [a, b] = coords;
        const lngLat = (Math.abs(a) > 90 && Math.abs(b) <= 90) ? [a, b] : [b, a];

        // Create the marker element
        const el = document.createElement('img');
        el.src = {
            red: '/static/icons/gem-red.svg',
            purple: '/static/icons/gem-purple.svg',
            blue: '/static/icons/gem-blue.svg'
        }[gem.color] || '/static/icons/gem-blue.svg';
        
   
        el.setAttribute('data-gem-id', gemId.toString());
        el.setAttribute('data-index', index.toString());
        el.className = 'gem-marker'; // Use class for styling

        // Create marker and add to map
        const marker = new maplibregl.Marker({
            element: el,
            anchor: 'center'
        }).setLngLat(lngLat).addTo(map);

        // Store marker in global array for later access and add the gemId and index to the marker object
        marker.gemId = gemId.toString();
        marker.gemIndex = index;

        // Add click handler
        el.addEventListener('click', function(e) {

            // Prevent event propagation to avoid map click events
            e.stopPropagation();
            e.preventDefault();

            // Update global active index
            window.activeGemIndex = index;

            if (typeof window.highlightGemMarker === 'function') {
                window.highlightGemMarker(index);
            }

            // Render routes if function exists
            if (typeof window.HiddenGems.routeUtils.renderRoutes === 'function') {
            window.HiddenGems.routeUtils.renderRoutes(map, lngLat, originCoords, destinationCoords);
            }

            // Update card display if needed
            const detailCards = document.querySelector('gem-cards[variant="detail"]');
            if (detailCards && typeof detailCards.showCard === 'function') {
                detailCards.showCard(index);
            }

            // Dispatch event for other components
            document.dispatchEvent(new CustomEvent('gemSelected', {
                detail: {
                    index: index,
                    id: gemId,
                    gem: gem
                }
            }));
        });

        
        window.markers.push(marker);

        // Extend map bounds
        bounds.extend(lngLat);
    });

    // Fit map to show all gems
    if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 40 });
    }

    // Initialize card display
    initializeDetailCards(gems);

    console.log("Map rendering complete with", window.markers.length, "markers");
}*/

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
}