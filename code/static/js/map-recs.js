/**
 * map-recs.js
 */

document.addEventListener('DOMContentLoaded', function () {

     // Load cached reviews at startup
    loadCachedReviews().then(() => {
        console.log('Reviews cache initialized');
    });

    function getValidCoordinates(coords) {
        return window.HiddenGems.data.coordUtils.normalize(coords);
    }

    // Create sanitized filename based on origin and destination
            const sanitizeForFilename = (name) => {
                return name.replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '_').toLowerCase();
            };

    // Get coordinates from sessionStorage
    var originCoords = JSON.parse(window.HiddenGems.data.storage.get("originCoords"));
    var destinationCoords = JSON.parse(window.HiddenGems.data.storage.get("destinationCoords"));

    // Get city names from sessionStorage
    var originCity = window.HiddenGems.data.storage.get("originName") || "unknown";
    var destinationCity = window.HiddenGems.data.storage.get("destinationName") || "unknown";


    // Add fallback coordinates for Berkeley and Sacramento if none exist in sessionStorage
    if (!originCoords) {
        console.log("No origin coordinates found in sessionStorage, using Berkeley as fallback");
        originCoords = getValidCoordinates(window.HiddenGems.constants.DEFAULT_ORIGIN); // Berkeley coordinates
        window.HiddenGems.data.storage.set("originCoords", originCoords);
        originCity = "berkeley";
        window.HiddenGems.data.storage.set("originName", originCity);
    }

    if (!destinationCoords) {
        console.log("No destination coordinates found in sessionStorage, using Sacramento as fallback");
        destinationCoords = getValidCoordinates(window.HiddenGems.constants.DEFAULT_DESTINATION); // Sacramento coordinates
        window.HiddenGems.data.storage.set("destinationCoords", destinationCoords);
        destinationCity = "sacramento";
        window.HiddenGems.data.storage.set("destinationName", destinationCity);
    }


    async function prepareGemsForPlotting() {

        try {
        // First check if we have recommendations in sessionStorage from the API
        const storedRecommendations = sessionStorage.getItem("recommendedGems");
        const storedSampledGems = sessionStorage.getItem("sampledGems");
        if (storedRecommendations) {
            console.log("Using recommendations from sessionStorage");
            const recommendedGems = JSON.parse(storedRecommendations);
            
            // Find matches with all gems
            const plotGems = [];
            recommendedGems.forEach(recommendedGem => {
                const matchingGem = JSON.parse(storedSampledGems).find(sampledGem =>
                    sampledGem.id === recommendedGem.id
                );

                if (matchingGem) {
                    plotGems.push(matchingGem);
                }
            });

            console.log(`Found ${plotGems.length} matching gems for plotting from sessionStorage`);
            if (plotGems.length > 0) {
                return plotGems;
            }
        } else {
            const origin = sanitizeForFilename(originCity);
            const destination = sanitizeForFilename(destinationCity);
            const recommendationsFilename = `recommendations_${origin}_to_${destination}.json`;
            
            console.log(`Looking for recommendations file: ${recommendationsFilename}`);

            // First try to fetch specific recommendation file for this trip
            try {
                const response = await fetch(`/static/assets/data/recommendations/${recommendationsFilename}`);
                
                if (response.ok) {
                    const recommendedGems = await response.json();
                    console.log(`Successfully loaded trip-specific recommendations for ${originCity} to ${destinationCity}`);
                    
                    // Find matches with all gems
                    const plotGems = [];
                    recommendedGems.forEach(recommendedGem => {
                        const matchingGem = window.HiddenGems.data.allGems.find(sampledGem =>
                            sampledGem.id === recommendedGem.id
                        );

                        if (matchingGem) {
                            plotGems.push(matchingGem);
                        }
                    });

                    console.log(`Found ${plotGems.length} matching gems for plotting`);
                    return plotGems;
                } else {
                    console.log(`Trip-specific recommendations not found, falling back to default recommendations`);
                    throw new Error('Trip-specific recommendations not found');
                }
            } catch (error) {
                // If specific recommendations don't exist, fall back to general recommendations
                console.log(`File of specific trip not found. `);
                return [];
            }
        }
     } catch (error) {
            console.error("Error preparing gems for plotting:", error);
            return []; // Return empty array on error
        }
    }



    //console.log("Sampled gems:", sampledGems);
    //console.log("Plot gems:", plotGems);




    // Initialize map if we have coordinates
    if (originCoords && destinationCoords) {
        const midPoint = getValidCoordinates([
            (originCoords[0] + destinationCoords[0]) / 2,
            (originCoords[1] + destinationCoords[1]) / 2
        ]);

        // Initialize map 
        window.initializeMap('map-recs')
            .then(map => {
                window.clearMarkers();
                // Set the map view to the midpoint
                map.setCenter(midPoint);
                map.setZoom(7);

            })
            .catch(error => {
                console.error('Error initializing route page:', error);
            });



        // Load the gems when map is ready
        window.map.on('load', function () {

            window.clearMarkers();
            // Dispatch mapReady event for gem-cards component
            document.dispatchEvent(new CustomEvent('mapReady', {
                bubbles: true
            }));

            // Notify any components that the map is ready
            //if (typeof window.notifyMapReady === 'function') {
            //    window.notifyMapReady();
            //}
            window.map.addControl(new maplibregl.NavigationControl(), 'top-left');

            // Keep track of generated reviews
            window.HiddenGems.reviewCache = window.HiddenGems.reviewCache || {};

            // Call the function and handle the result
            prepareGemsForPlotting().then(plotGems => {
                // Your code to plot the gems goes here
                console.log("Ready to plot these gems:", plotGems);


                renderGems(plotGems);
                //initializeDetailCards(plotGems)

                console.log("Map rendering complete with", window.markers.length, "markers");

                // Add origin and destination markers only once
                addTripMarkers(originCoords, destinationCoords);

                // Add base route (origin to destination)
                addBaseRoute(originCoords, destinationCoords);

                // Render route for the initial active gem (assuming first one is active by default)
                //if (plotGems.length > 0) {
                //    const firstGem = plotGems[0];
                //    console.log("First gem for detour route:", firstGem);
                //    const coords = window.HiddenGems.data.coordUtils.fromGem(firstGem);
                //    if (coords) {
                //        console.log(firstGem);
                //        console.log(coords);
                //        renderDetourRoute(originCoords, destinationCoords, coords);
                //    }
                //}
            });

   

        });


        // Define function to render routes
        window.renderRoutes = function (gemCoords) {
            console.log(gemCoords);
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



            // Normalize all coordinates to ensure consistent format
            const safeOrigin = getValidCoordinates(origin);
            const safeDestination = getValidCoordinates(destination);
            const safeGemCoords = getValidCoordinates(gemCoords);



            const detourRoute = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [safeOrigin, safeGemCoords, safeDestination]
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
                    .addTo(window.map);
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
                    .addTo(window.map);
            }
        }
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
    } else {
        // Try to access the class instance
        if (detailCards.gemCards && typeof detailCards.gemCards.setGems === 'function') {
            detailCards.gemCards.setGems(gems);
        } else {
            console.error("Cannot find setGems method on the gem-cards element");
        }
    }

// Show the first gem
    if (typeof detailCards.showCard === 'function') {
        detailCards.showCard(0);
    } else if (detailCards.gemCards && typeof detailCards.gemCards.showCard === 'function') {
        detailCards.gemCards.showCard(0);
    }

    // Remove any existing card-change listeners to prevent duplicates
    detailCards.removeEventListener('card-change', handleCardChange);
    
    // Add event listener for card changes
    detailCards.addEventListener('card-change', handleCardChange);

    // Add event listener for card changes
    detailCards.addEventListener('card-change', function (event) {
        const activeIndex = event.detail.index;
        const activeGem = gems[activeIndex];

        if (activeGem) {
            // Use the unified coordinate utility
            const coords = window.HiddenGems.data.coordUtils.fromGem(activeGem);
            console.log("active gem:", activeGem)
            console.log("active index:", activeIndex);
            if (coords) {
 
                window.map.flyTo({
                  center: coords,
                  zoom: window.map.getZoom()
                });

                // Update the route for the active gem
                window.renderRoutes(coords);
            } else {
                console.warn(`Invalid coordinates for gem at index ${activeIndex}`);
            }
        }
    });
}

 async function loadCachedReviews() {
    if (!window.HiddenGems.reviewCache) {
        try {
            const response = await fetch('static/assets/data/reviews.json');
            if (response.ok) {
                const reviews = await response.json();
                window.HiddenGems.reviewCache = reviews;
                console.log(`Loaded ${Object.keys(reviews).length} cached reviews`);
            } else {
                console.error('Failed to load cached reviews');
                window.HiddenGems.reviewCache = {};
            }
        } catch (error) {
            console.error('Error loading cached reviews:', error);
            window.HiddenGems.reviewCache = {};
        }
    }
    return window.HiddenGems.reviewCache;
}


