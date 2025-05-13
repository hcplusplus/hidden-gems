/**
 * map-recs.js
 */

// Map initialization variables



document.addEventListener('DOMContentLoaded', function () {


    function exploreGem(gemId) {
        fetch("static/assets/data/recommendations.json").then(res => res.json()).then(gems => {
            const selected = gems.find(g => g.id === gemId);
            return fetch("http://127.0.0.1:5000/generate_review", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(selected)
            });
        }).then(res => res.json()).then(data => {
            window.HiddenGems.data.storage.set("selectedGemReview", data.review);
            window.location.href = "trip-select.html";
        }).catch(err => console.error("Error generating review:", err));
    }


    function getValidCoordinates(coords) {
        return window.HiddenGems.data.coordUtils.normalize(coords);
    }

    // Get coordinates from sessionStorage
    var originCoords = JSON.parse(window.HiddenGems.data.storage.get("originCoords"));
    var destinationCoords = JSON.parse(window.HiddenGems.data.storage.get("destinationCoords"));

    //window.HiddenGems.map.clearMarkers();


    // Add fallback coordinates for Berkeley and Sacramento if none exist in sessionStorage
    if (!originCoords) {
        console.log("No origin coordinates found in sessionStorage, using Berkeley as fallback");
        originCoords = getValidCoordinates(window.HiddenGems.constants.DEFAULT_ORIGIN); // Berkeley coordinates
        window.HiddenGems.data.storage.set("originCoords", JSON.stringify(originCoords));
    }

    if (!destinationCoords) {
        console.log("No destination coordinates found in sessionStorage, using Sacramento as fallback");
        destinationCoords = getValidCoordinates(window.HiddenGems.constants.DEFAULT_DESTINATION); // Sacramento coordinates
        window.HiddenGems.data.storage.set("destinationCoords", JSON.stringify(destinationCoords));
    }


  



    async function prepareGemsForPlotting() {
        try {


            // Then, fetch and wait for the recommendations
            const response = await fetch("static/assets/data/recommendations.json");
            const recommendedGems = await response.json();

            // Now both async operations are complete, find matches
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

       
        } catch (error) {
            console.error("Error preparing gems for plotting:", error);
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

        //window.initializeMap('map-recs', midPoint, 7);
        //const map = window.map;
        // Initialize map 
        window.initializeMap()
            .then(map => {
                // Load gems along the route
                return window.HiddenGems.map.loadGems(
                    'map-recs', // pageName
                    midPoint,    // center
                    10,      // radius
                    10,      // sampleSize
                    originCoords,  // originCoord
                    destinationCoords // destinationCoord
                );
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
            if (typeof window.notifyMapReady === 'function') {
                window.notifyMapReady();
            }
            window.map.addControl(new maplibregl.NavigationControl(), 'top-left');


            // Call the function and handle the result
            prepareGemsForPlotting().then(plotGems => {
                // Your code to plot the gems goes here
                console.log("Ready to plot these gems:", plotGems);

                renderGems(plotGems);
                initializeDetailCards(plotGems)

                console.log("Map rendering complete with", window.markers.length, "markers");

                // Add origin and destination markers only once
                addTripMarkers(originCoords, destinationCoords);

                // Add base route (origin to destination)
                addBaseRoute(originCoords, destinationCoords);

                // Render route for the initial active gem (assuming first one is active by default)
                if (plotGems.length > 0) {
                    const firstGem = plotGems[0];
                    console.log("First gem for detour route:", firstGem);
                    const coords = window.HiddenGems.data.coordUtils.fromGem(firstGem);
                    if (coords) {
                        console.log(firstGem);
                        console.log(coords);
                        renderDetourRoute(originCoords, destinationCoords, coords);
                    }
                }
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
        /*
    } else {
        console.error("Missing origin or destination coordinates");
        // Handle case where coordinates aren't available
        document.getElementById('map').innerHTML =
            '<div style="padding: 20px; text-align: center;">Please set your trip origin and destination first.</div>';
    }*/
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
    detailCards.addEventListener('card-change', function (event) {
        const activeIndex = event.detail.index;
        const activeGem = gems[activeIndex];

        if (activeGem) {
            // Use the unified coordinate utility
            const coords = window.HiddenGems.data.coordUtils.fromGem(activeGem);

            if (coords) {
                // Debug log
                //  console.log(`Card changed to gem at index ${activeIndex}:`, activeGem.name || 'unnamed');
                // window.HiddenGems.coordUtil.debug(coords, "Active Gem");
                // Fly to the gem
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


