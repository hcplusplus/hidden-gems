/**
 * Create a buffer around the direct line between origin and destination
 * @param {Array} origin - [lng, lat] coordinates of origin
 * @param {Array} destination - [lng, lat] coordinates of destination
 * @param {number} bufferDistanceKm - Buffer distance in kilometers
 * @return {Object} Object with buffer polygon and bounding box
 */
function createRouteBuffer(origin, destination, bufferDistanceKm = 30) {
  // Calculate route direction vector
  const dx = destination[0] - origin[0];
  const dy = destination[1] - origin[1];
  
  // Calculate route length
  const routeLength = Math.sqrt(dx * dx + dy * dy);
  
  // Normalize direction vector
  const nx = dx / routeLength;
  const ny = dy / routeLength;
  
  // Calculate perpendicular vector
  const px = -ny;
  const py = nx;
  
  // Convert buffer distance from km to degrees (rough approximation)
  // 1 degree is approximately 111 km at the equator
  const bufferDistanceDeg = bufferDistanceKm / 111;
  
  // Calculate buffer points (rectanglar buffer around the route line)
  const bufferPoints = [
    [
      origin[0] + px * bufferDistanceDeg,
      origin[1] + py * bufferDistanceDeg
    ],
    [
      destination[0] + px * bufferDistanceDeg,
      destination[1] + py * bufferDistanceDeg
    ],
    [
      destination[0] - px * bufferDistanceDeg,
      destination[1] - py * bufferDistanceDeg
    ],
    [
      origin[0] - px * bufferDistanceDeg,
      origin[1] - py * bufferDistanceDeg
    ]
  ];
  
  // Calculate bounding box of the buffer
  let minLng = Math.min(...bufferPoints.map(p => p[0]), origin[0], destination[0]);
  let minLat = Math.min(...bufferPoints.map(p => p[1]), origin[1], destination[1]);
  let maxLng = Math.max(...bufferPoints.map(p => p[0]), origin[0], destination[0]);
  let maxLat = Math.max(...bufferPoints.map(p => p[1]), origin[1], destination[1]);
  
  // Add a small padding to the bounding box
  const padding = 0.01; // About 1km
  minLng -= padding;
  minLat -= padding;
  maxLng += padding;
  maxLat += padding;
  
  return {
    bufferPoints: bufferPoints,
    boundingBox: [minLng, minLat, maxLng, maxLat] // [west, south, east, north]
  };
}

/**
 * Check if a point is within a polygon defined by an array of points
 * @param {Array} point - [lng, lat] coordinates of the point
 * @param {Array} polygon - Array of [lng, lat] coordinates forming a polygon
 * @return {boolean} True if the point is within the polygon
 */
function isPointInPolygon(point, polygon) {
  // Ray casting algorithm
  let inside = false;
  const x = point[0];
  const y = point[1];
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Calculate the Haversine distance between two points
 * @param {Array} point1 - [lng, lat] coordinates of first point
 * @param {Array} point2 - [lng, lat] coordinates of second point
 * @return {number} Distance in kilometers
 */
function calculateDistance(point1, point2) {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;
  
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate the distance from a point to a line segment
 * @param {Array} point - [lng, lat] coordinates of the point
 * @param {Array} lineStart - [lng, lat] coordinates of line segment start
 * @param {Array} lineEnd - [lng, lat] coordinates of line segment end
 * @return {number} Distance in kilometers
 */
function distanceToLineSegment(point, lineStart, lineEnd) {
  // Convert to Cartesian coordinates for simplicity
  // This is an approximation that works for small distances
  const p = [point[0], point[1]];
  const v = [lineStart[0], lineStart[1]];
  const w = [lineEnd[0], lineEnd[1]];
  
  // Calculate squared length of line segment
  const lengthSquared = Math.pow(w[0] - v[0], 2) + Math.pow(w[1] - v[1], 2);
  
  // If line segment is a point, return distance to that point
  if (lengthSquared === 0) return calculateDistance(point, lineStart);
  
  // Calculate projection of point onto line segment
  const t = Math.max(0, Math.min(1, 
    ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / lengthSquared
  ));
  
  // Calculate closest point on line segment
  const projection = [
    v[0] + t * (w[0] - v[0]),
    v[1] + t * (w[1] - v[1])
  ];
  
  // Return distance to closest point
  return calculateDistance(point, projection);
}

/**
 * Filter gems that are within a buffer around a route
 * @param {Array} origin - [lng, lat] coordinates of origin
 * @param {Array} destination - [lng, lat] coordinates of destination
 * @param {number} bufferDistanceKm - Buffer distance in kilometers
 * @param {string} jsonPath - Path to JSON file with all gems
 * @return {Promise} Promise that resolves to filtered gems
 */
function filterGemsByRoute(origin, destination, bufferDistanceKm = 30, jsonPath = 'static/assets/data/hidden_gems.json') {
  // Create a promise to handle async operations
  return new Promise((resolve, reject) => {
    // Create route buffer
    const buffer = createRouteBuffer(origin, destination, bufferDistanceKm);
    console.log('Created route buffer:', buffer);
    
    // Fetch all gems from JSON
    fetch(jsonPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load gems: ${response.status}`);
        }
        return response.json();
      })
      .then(allGems => {
        console.log(`Loaded ${allGems.length} gems from ${jsonPath}`);
        
         // Use the gem shuffler to filter and shuffle gems
        if (window.HiddenGems && window.HiddenGems.gemShuffler) {
          const filteredShuffledGems = window.HiddenGems.gemShuffler.filterAndShuffleGemsAlongRoute(
            allGems, originCoords, destinationCoords, bufferDistanceKm
          );
          
          // Save to sessionStorage (already done in the shuffler)
          console.log(`Filtered and shuffled ${filteredShuffledGems.length} gems`);
          
          // Resolve the promise with the filtered shuffled gems
          resolve(filteredShuffledGems);
        } else {
        // Filter gems that are within the bounding box first (quick filter)
        const [minLng, minLat, maxLng, maxLat] = buffer.boundingBox;
        let gemsInBoundingBox = allGems.filter(gem => {
          const coords = gem.coordinates;
          if (!coords || coords.length !== 2) return false;
          
          const [lng, lat] = coords;
          return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
        });
        
        console.log(`Found ${gemsInBoundingBox.length} gems within bounding box`);
        
        // Further filter gems that are within the buffer polygon or close to the route
        const filteredGems = gemsInBoundingBox.filter(gem => {
          const coords = gem.coordinates;
          
          // Check if point is within buffer polygon
          if (isPointInPolygon(coords, buffer.bufferPoints)) {
            return true;
          }
          
          // If not in polygon, check if it's close to the route
          const distanceToRoute = distanceToLineSegment(coords, origin, destination);
          
          // Convert to km and compare with buffer distance
          return distanceToRoute <= bufferDistanceKm;
        });
        
        console.log(`Filtered to ${filteredGems.length} gems within route buffer`);
        
        // Add distance to route for each gem
        filteredGems.forEach(gem => {
          gem.distanceToRoute = distanceToLineSegment(gem.coordinates, origin, destination);
        });
        
        // Sort by distance to route
        filteredGems.sort((a, b) => a.distanceToRoute - b.distanceToRoute);
        
        // Save to sessionStorage
        sessionStorage.setItem('routeFilteredGems', JSON.stringify(filteredGems));
        console.log(`Saved ${filteredGems.length} route-filtered gems to sessionStorage`);
        
        // Also save route info
        const routeInfo = {
          origin: origin,
          destination: destination,
          bufferDistance: bufferDistanceKm,
          boundingBox: buffer.boundingBox
        };
        sessionStorage.setItem('routeInfo', JSON.stringify(routeInfo));
        
        // Resolve the promise with the filtered gems
        resolve(filteredGems);
  }
})
      .catch(error => {
        console.error('Error filtering gems by route:', error);
        reject(error);
      });
  });
}

/**
 * Filter gems based on user preferences from quiz
 * @param {Object} preferences - User preferences from quiz
 * @return {Array} Filtered gems
 */
function filterGemsByPreferences(preferences) {
  // Get route-filtered gems from sessionStorage
  const routeFilteredGemsStr = sessionStorage.getItem('routeFilteredGems');
  if (!routeFilteredGemsStr) {
    console.error('No route-filtered gems found in sessionStorage');
    return [];
  }
  
  const routeFilteredGems = JSON.parse(routeFilteredGemsStr);
  console.log(`Filtering ${routeFilteredGems.length} route gems by preferences:`, preferences);
  
  // Apply preference filters
  let filteredGems = routeFilteredGems;
  
  // Filter by activities if specified
  if (preferences.activities && preferences.activities.length > 0) {
    filteredGems = filteredGems.filter(gem => {
      // Check if any of the gem's tags match any of the requested activities
      const gemTags = gem.category_2 ? gem.category_2.split(', ') : [];
      return preferences.activities.some(activity => 
        gemTags.includes(activity) || 
        gem.category_1.toLowerCase().includes(activity.toLowerCase())
      );
    });
    console.log(`After activity filter: ${filteredGems.length} gems`);
  }
  
  // Filter by effort level if specified
  if (preferences.effortLevel) {
    filteredGems = filteredGems.filter(gem => {
      // Map effort levels
      const gemEffort = gem.effort || 'moderate';
      
      if (preferences.effortLevel === 'easy') {
        return gemEffort === 'easy';
      } else if (preferences.effortLevel === 'moderate') {
        return gemEffort === 'easy' || gemEffort === 'moderate';
      } else {
        return true; // challenging includes all
      }
    });
    console.log(`After effort filter: ${filteredGems.length} gems`);
  }
  
  // Filter by accessibility if specified
  if (preferences.accessibility && preferences.accessibility.length > 0) {
    if (preferences.accessibility.includes('wheelchair')) {
      filteredGems = filteredGems.filter(gem => {
        return gem.accessibility && gem.accessibility.wheelchair === 'yes';
      });
      console.log(`After wheelchair filter: ${filteredGems.length} gems`);
    }
  }
  
  // Filter by detour time if specified
  if (preferences.time) {
    const maxTime = parseFloat(preferences.time);
    filteredGems = filteredGems.filter(gem => {
      const gemTime = typeof gem.time === 'string' ? 
        parseFloat(gem.time.replace(' mins', '')) : gem.time;
      return gemTime <= maxTime * 60; // Convert hours to minutes
    });
    console.log(`After time filter: ${filteredGems.length} gems`);
  }
  
  // If too few gems remain, add some back from the route-filtered set
  if (filteredGems.length < 5 && routeFilteredGems.length > 5) {
    console.log('Too few gems after filtering, adding some back');
    
    // Sort remaining route gems by closest to route
    const additionalGems = routeFilteredGems
      .filter(gem => !filteredGems.some(g => g.id === gem.id))
      .sort((a, b) => a.distanceToRoute - b.distanceToRoute)
      .slice(0, 10);
    
    filteredGems = [...filteredGems, ...additionalGems]
      .sort((a, b) => a.distanceToRoute - b.distanceToRoute);
    
    console.log(`After adding additional gems: ${filteredGems.length} gems`);
  }
  
  // Save filtered gems to sessionStorage
  sessionStorage.setItem('preferenceFilteredGems', JSON.stringify(filteredGems));
  console.log(`Saved ${filteredGems.length} preference-filtered gems to sessionStorage`);
  
  return filteredGems;
}

/**
 * Shuffle route-filtered gems and update sessionStorage
 * @param {number} limit - Maximum number of gems to include
 * @return {Array} Shuffled gems
 */
function shuffleRouteGems(limit = 20) {
  // Get route-filtered gems from sessionStorage
  const routeFilteredGemsStr = sessionStorage.getItem('routeFilteredGems');
  if (!routeFilteredGemsStr) {
    console.error('No route-filtered gems found in sessionStorage');
    return [];
  }
  
  const routeFilteredGems = JSON.parse(routeFilteredGemsStr);
  
  // Shuffle gems using Fisher-Yates algorithm
  const shuffledGems = [...routeFilteredGems];
  for (let i = shuffledGems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledGems[i], shuffledGems[j]] = [shuffledGems[j], shuffledGems[i]];
  }
  
  // Limit number of gems
  const limitedGems = shuffledGems.slice(0, limit);
  
  // Save to sessionStorage
  //sessionStorage.setItem('gems', JSON.stringify(limitedGems));
  //console.log(`Saved ${limitedGems.length} shuffled gems to sessionStorage`);
  
  return limitedGems;
}

window.filterGemsByRoute = filterGemsByRoute;
window.filterGemsByPreferences = filterGemsByPreferences;