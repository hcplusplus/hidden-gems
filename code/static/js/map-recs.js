/**
 * map-recs.js
 */
let recsCardsInitialized = false;

/**
 * Center the map on the active card's gem
 * @param {Object} gem - The gem object
 * @param {number} index - The index of the gem
 */
function centerCard(gem, index) {
    const activeIndex = index;
    const activeGem = gem;

    if (activeGem) {
        // Use the unified coordinate utility
        const coords = window.HiddenGems.data.coordUtils.fromGem(activeGem);
        console.log("active gem:", activeGem);
        console.log("active index:", activeIndex);
        if (coords) {
            window.map.flyTo({
                center: coords,
                zoom: window.map.getZoom()
            });
        } else {
            console.warn(`Invalid coordinates for gem at index ${activeIndex}`);
        }
    }
}

/**
 * Handle card change events
 * @param {Event} event - The card change event
 */
function handleCardChange(event) {
    const activeIndex = event.detail.index;
    const gems = window.HiddenGems.data.pageGems || [];
    const activeGem = gems[activeIndex];

    if (activeGem) {
        // Use the unified coordinate utility
        const coords = window.HiddenGems.data.coordUtils.fromGem(activeGem);
        console.log("Card changed - active gem:", activeGem.name || "Unnamed gem");
        console.log("Card changed - active index:", activeIndex);

        if (coords) {
            // Fly to the gem location
            window.map.flyTo({
                center: coords,
                zoom: window.map.getZoom()
            });

            // Update the route for the active gem
            //window.renderRoutes(coords);
        } else {
            console.warn(`Invalid coordinates for gem at index ${activeIndex}`);
        }
    }
}

/**
   * Navigate to gem details page
   * @param {Object} gem - Gem object
   */
function navigateToGemDetails(gem) {
    const gemId = gem.id || `gem-${this.activeIndex}`;

     
    
  
    // Process time information for trip details
    let timeDisplay = '1 hr 30 min';
    let visitTime = '30'; // Default visit time in minutes
    
    // Process gem time if available (assuming it's stored in minutes)
    if (gem.time) {
      visitTime = gem.time.toString();
      
      // Calculate total time (visit time + estimated driving time)
      const visitTimeMinutes = parseInt(visitTime);
      const drivingTimeMinutes = 60; // Default driving time estimate
      const totalTimeMinutes = visitTimeMinutes + drivingTimeMinutes;
      
      if (totalTimeMinutes >= 60) {
        const hours = Math.floor(totalTimeMinutes / 60);
        const minutes = totalTimeMinutes % 60;
        timeDisplay = minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
      } else {
        timeDisplay = `${totalTimeMinutes} min`;
      }
    }
    
    // Process coordinates for distance calculations
    let coordinates = '';
    if (gem.coordinates) {
      coordinates = gem.coordinates;
    } else if (gem.latitude && gem.longitude) {
      coordinates = `${gem.latitude},${gem.longitude}`;
    }

    // Get the review from cache
    const review = window.HiddenGems.reviewCache[gemId];
    
    // Create a cardData object with all relevant information
    const cardData = {
      id: gemId,
      name: gem.name || 'Hidden Gem',
      description: gem.description || 'A hidden gem waiting to be explored.',
      coordinates: coordinates,
      openingHours: gem.opening_hours || gem.openingHours || '',
      price: gem.dollar_sign || gem.price || '$',
      timeDisplay: timeDisplay,
      time: visitTime,
      gemColor: gem.color,
      categories: [
        gem.category_1 || gem.categories?.[0] || 'Outdoor',
        gem.category_2 || gem.categories?.[1] || 'Nature'
      ],
      rarity: gem.rarity || 'super-rare',
      review: review
    };
    
    // Store the card data in session storage
    window.HiddenGems.data.storage.set('selectedCard', JSON.stringify(cardData));
    
    // Dispatch navigation event before redirecting
    this.dispatchEvent(new CustomEvent('navigate-to-trip-select', {
      bubbles: true,
      composed: true,
      detail: { gem, gemId }
    }));
    
    // Add a small delay before navigating for a smoother transition
    setTimeout(() => {
        window.location.href = "trip-select.html";
    }, 600); // Short delay for better UX
}


/**
 * Center the map on the active card's gem
 * @param {Object} gem - The gem object
 * @param {number} index - The index of the gem
 */
function centerCard(gem, index) {
    const activeIndex = index;
    const activeGem = gem;

    if (activeGem) {
        // Use the unified coordinate utility
        const coords = window.HiddenGems.data.coordUtils.fromGem(activeGem);
        console.log("active gem:", activeGem);
        console.log("active index:", activeIndex);
        if (coords) {
            window.map.flyTo({
                center: coords,
                zoom: window.map.getZoom()
            });
        } else {
            console.warn(`Invalid coordinates for gem at index ${activeIndex}`);
        }
    }
}

/**
 * Navigate to gem details page
 * @param {Object} gem - Gem object
 */
function navigateToGemDetails(gem) {
    const gemId = gem.id || `gem-${window.HiddenGems.gemCards?.activeIndex || 0}`;
    
    // Process time information for trip details
    let timeDisplay = '1 hr 30 min';
    let visitTime = '30'; // Default visit time in minutes
    
    // Process gem time if available (assuming it's stored in minutes)
    if (gem.time) {
      visitTime = gem.time.toString();
      
      // Calculate total time (visit time + estimated driving time)
      const visitTimeMinutes = parseInt(visitTime);
      const drivingTimeMinutes = 60; // Default driving time estimate
      const totalTimeMinutes = visitTimeMinutes + drivingTimeMinutes;
      
      if (totalTimeMinutes >= 60) {
        const hours = Math.floor(totalTimeMinutes / 60);
        const minutes = totalTimeMinutes % 60;
        timeDisplay = minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
      } else {
        timeDisplay = `${totalTimeMinutes} min`;
      }
    }
    
    // Process coordinates for distance calculations
    let coordinates = '';
    if (gem.coordinates) {
      coordinates = gem.coordinates;
    } else if (gem.latitude && gem.longitude) {
      coordinates = `${gem.latitude},${gem.longitude}`;
    }

    // Get the review from cache
    const review = window.HiddenGems.reviewCache[gemId];
    
    // Create a cardData object with all relevant information
    const cardData = {
      id: gemId,
      name: gem.name || 'Hidden Gem',
      description: gem.description || 'A hidden gem waiting to be explored.',
      coordinates: coordinates,
      openingHours: gem.opening_hours || gem.openingHours || '',
      price: gem.dollar_sign || gem.price || '$',
      timeDisplay: timeDisplay,
      time: visitTime,
      gemColor: gem.color,
      categories: [
        gem.category_1 || gem.categories?.[0] || 'Outdoor',
        gem.category_2 || gem.categories?.[1] || 'Nature'
      ],
      rarity: gem.rarity || 'super-rare',
      review: review
    };
    
    // Store the card data in session storage
    window.HiddenGems.data.storage.set('selectedCard', JSON.stringify(cardData));
    
    // Dispatch navigation event before redirecting
    document.dispatchEvent(new CustomEvent('navigate-to-trip-select', {
      bubbles: true,
      composed: true,
      detail: { gem, gemId }
    }));
    
    // Add a small delay before navigating for a smoother transition
    setTimeout(() => {
        window.location.href = "trip-select.html";
    }, 600); // Short delay for better UX
}

/**
 * Handle card change events
 * @param {Event} event - The card change event
 */
function handleCardChange(event) {
    const activeIndex = event.detail.index;
    const gems = window.HiddenGems.data.pageGems || [];
    const activeGem = gems[activeIndex];

    if (activeGem) {
        // Use the unified coordinate utility
        const coords = window.HiddenGems.data.coordUtils.fromGem(activeGem);
        console.log("Card changed - active gem:", activeGem.name || "Unnamed gem");
        console.log("Card changed - active index:", activeIndex);
        
        if (coords) {
            // Fly to the gem location
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
}

// Event listener for gems loaded specifically for map-recs.js
// This overwrites the one from map-controller.js for this page
document.addEventListener('gemsLoaded', function(e) {
    // Get gems from the event or fallback to global data
    const gems = e.detail?.gems || window.HiddenGems.data?.pageGems || [];
    
    // We only want to handle this event for the map-recs page
    const pageName = e.detail?.pageName || window.HiddenGems.map?.currentPage;
    if (pageName !== 'map-recs') {
        console.log(`Ignoring gemsLoaded event for non-map-recs page: ${pageName}`);
        return;
    }
    
    console.log(`gemsLoaded event received with ${gems.length} gems for map-recs page`);
    
    // Prevent duplicate initialization
    if (!recsCardsInitialized && gems.length > 0) {
        console.log('Initializing map-recs gem cards for the first time');
        
        const gemCards = new window.HiddenGems.GemCards({
            containerId: 'gem-cards-container',
            variant: 'map-recs',
            onCardChange: function(gem, index) {
                centerCard(gem, index);
                console.log(`Card changed to gem: ${gem.name} at index ${index}`);
            },
            onMarkerHighlight: function(gem, index) {
                console.log(`Highlighting marker for: ${gem.name}`);
            },
            onExplore: function(gem, index) {
                navigateToGemDetails(gem);
            }
        });
        
        // Store the cards instance for future reference
        window.HiddenGems.gemCards = gemCards;
        
        // Load gems data
        gemCards.loadGems(gems);
        
        // Mark as initialized to prevent duplicates
        cardsInitialized = true;
        
        console.log('Map-recs gem cards successfully initialized with data');
        
        // Ensure first card is activated
        setTimeout(() => {
            const container = document.getElementById('gem-cards-container');
            if (container) {
                const cards = container.querySelectorAll('.gem-card');
                const activeCards = container.querySelectorAll('.gem-card.active');
                
                if (cards.length > 0 && activeCards.length === 0) {
                    console.log('No active cards found - activating the first card');
                    cards[0].classList.add('active');
                    
                    // Update the active index in the gemCards instance
                    if (window.HiddenGems.gemCards) {
                        window.HiddenGems.gemCards.activeIndex = 0;
                        
                        // Trigger the change callback if it exists
                        if (typeof window.HiddenGems.gemCards.onCardChange === 'function' && gems[0]) {
                            window.HiddenGems.gemCards.onCardChange(gems[0], 0);
                        }
                    }
                }
            }
        }, 200);
    } else if (cardsInitialized) {
        // If already initialized, just update the existing instance
        console.log('Updating existing map-recs gem cards with new data');
        if (window.HiddenGems.gemCards) {
            window.HiddenGems.gemCards.loadGems(gems);
            
            // Check if any card is active after update
            setTimeout(() => {
                const container = document.getElementById('gem-cards-container');
                if (container) {
                    const cards = container.querySelectorAll('.gem-card');
                    const activeCards = container.querySelectorAll('.gem-card.active');
                    
                    if (cards.length > 0 && activeCards.length === 0) {
                        console.log('No active cards found after update - activating the first card');
                        cards[0].classList.add('active');
                        
                        // Update the active index in the gemCards instance
                        if (window.HiddenGems.gemCards) {
                            window.HiddenGems.gemCards.activeIndex = 0;
                            
                            // Trigger the change callback if it exists
                            if (typeof window.HiddenGems.gemCards.onCardChange === 'function' && gems[0]) {
                                window.HiddenGems.gemCards.onCardChange(gems[0], 0);
                            }
                        }
                    }
                }
            }, 200);
        }
    }
});


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


            window.map.addControl(new maplibregl.NavigationControl(), 'top-left');

            // Keep track of generated reviews
            window.HiddenGems.reviewCache = window.HiddenGems.reviewCache || {};

            // Call the function and handle the result
prepareGemsForPlotting().then(plotGems => {
 
    // Sort the plotGems by their position along the route from origin to destination
    plotGems.sort((a, b) => {
        // Calculate progress along the route for gem A
        const progressA = a.routeProgress;

        // Calculate progress along the route for gem B
        const progressB = b.routeProgress;

        // Sort by progress (0 = at origin, 1 = at destination)
        return progressA - progressB;
    });

    // Store the gems in the global data structure for card initialization
    window.HiddenGems.data.pageGems = plotGems;

    renderGems(plotGems);
    console.log("Map rendering complete with", window.markers.length, "markers");

    // Add origin and destination markers only once
    addTripMarkers(originCoords, destinationCoords);

    // Add base route (origin to destination)
    addBaseRoute(originCoords, destinationCoords);

    // Dispatch event to initialize gem cards
    console.log('Dispatching gemsLoaded event with', plotGems.length, 'gems for map-recs page');
    document.dispatchEvent(new CustomEvent('gemsLoaded', {
        bubbles: true,
        detail: {
            gems: plotGems,
            pageName: 'map-recs'
        }
    }));

    // Initialize first card and route after a short delay
    setTimeout(() => {
        if (plotGems.length > 0 && window.HiddenGems.gemCards) {
            // Make sure first card is showing
            window.HiddenGems.gemCards.showCard(0);
            
            // Show initial detour route
            const firstGem = plotGems[0];
            const coords = window.HiddenGems.data.coordUtils.fromGem(firstGem);
            if (coords) {
                window.renderRoutes(coords);
            }
        }
    }, 500);
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
    detailCards.removeEventListener('card-change');

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


