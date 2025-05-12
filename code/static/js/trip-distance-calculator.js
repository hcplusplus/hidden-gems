/**
 * Creates enhanced trip distance information with smart calculations
 * @param {Object} cardData - The card data from session storage
 * @returns {string} HTML string with comprehensive trip distance information
 */
function createTripDistanceInfo(cardData) {
  // Extract coordinates from card data
  const coordinates = cardData.coordinates;
  let lat, lng;
  
  // Parse coordinates if available
  if (coordinates) {
    try {
      // Try to parse coordinates in different formats
      if (typeof coordinates === 'string') {
        if (coordinates.includes(',')) {
          // Format: "lat,lng"
          [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
        } else if (coordinates.includes(' ')) {
          // Format: "lat lng"
          [lat, lng] = coordinates.split(' ').map(coord => parseFloat(coord.trim()));
        }
      } else if (Array.isArray(coordinates) && coordinates.length >= 2) {
        // Format: [lng, lat] or [lat, lng]
        // We'll assume [lat, lng] format here
        [lat, lng] = coordinates;
      }
    } catch (error) {
      console.warn('Error parsing coordinates:', error);
    }
  }
  
  // Default values if coordinates are not available or couldn't be parsed
  const directDistance = 5; // km
  const detourDistance = 8; // km
  const addedDistance = 3; // km
  
  // Calculate distances if coordinates are available
  let calculatedDirectDistance = directDistance;
  let calculatedDetourDistance = detourDistance;
  let calculatedAddedDistance = addedDistance;
  
  // If we have coordinates and origin/destination from session storage, calculate actual distances
  const originCoords = JSON.parse(sessionStorage.getItem('originCoords'));
  const destinationCoords = JSON.parse(sessionStorage.getItem('destinationCoords'));
  
  if (lat && lng && originCoords && destinationCoords) {
    // Calculate direct distance (origin to destination)
    calculatedDirectDistance = calculateHaversineDistance(
      originCoords[1], originCoords[0], 
      destinationCoords[1], destinationCoords[0]
    );
    
    // Calculate detour distances
    const originToGemDistance = calculateHaversineDistance(
      originCoords[1], originCoords[0],
      lat, lng
    );
    
    const gemToDestinationDistance = calculateHaversineDistance(
      lat, lng,
      destinationCoords[1], destinationCoords[0]
    );
    
    // Calculate total detour distance
    calculatedDetourDistance = originToGemDistance + gemToDestinationDistance;
    
    // Calculate added distance
    calculatedAddedDistance = calculatedDetourDistance - calculatedDirectDistance;
  }
  
  // Format distances with appropriate units
  let formattedDetourDistance, formattedAddedDistance;
  
  if (calculatedDetourDistance < 1) {
    formattedDetourDistance = `${Math.round(calculatedDetourDistance * 1000)}m`;
  } else {
    formattedDetourDistance = `${calculatedDetourDistance.toFixed(1)}km`;
  }
  
  if (calculatedAddedDistance < 1) {
    formattedAddedDistance = `${Math.round(calculatedAddedDistance * 1000)}m`;
  } else {
    formattedAddedDistance = `${calculatedAddedDistance.toFixed(1)}km`;
  }
  
  // Calculate time based on distances
  // Assuming average driving speed of 50 km/h
  const drivingSpeedKmPerHour = 50;
  
  // Calculate direct time
  const directTimeMinutes = Math.ceil((calculatedDirectDistance / drivingSpeedKmPerHour) * 60);
  
  // Calculate detour driving time
  const detourDrivingTimeMinutes = Math.ceil((calculatedDetourDistance / drivingSpeedKmPerHour) * 60);
  
  // Get visit time from card data or use default
  const visitTimeMinutes = cardData.time ? parseInt(cardData.time, 10) : 30;
  
  // Calculate total time (driving + visit)
  const totalTimeMinutes = detourDrivingTimeMinutes + visitTimeMinutes;
  
  // Calculate extra time compared to direct route
  const extraTimeMinutes = totalTimeMinutes - directTimeMinutes;
  
  // Format times
  const formattedTotalTime = formatTime(totalTimeMinutes);
  const formattedDrivingTime = formatTime(detourDrivingTimeMinutes);
  const formattedVisitTime = formatTime(visitTimeMinutes);
  const formattedExtraTime = formatTime(extraTimeMinutes);
  
  // Create HTML for the trip distance info
  return `
    <div class="trip-distance-info">
      <div class="distance-detail">
        <span class="distance-icon">🕒</span>
        <span class="distance-label">Visit time:</span>
        <span class="distance-value">${formattedTotalTime}</span>
      </div>
      <div class="distance-detail">
        <span class="distance-icon">↔️</span>
        <span class="distance-label">Total detour:</span>
        <span class="distance-value">${formattedDetourDistance}</span>
      </div>
      <div class="distance-detail">
        <span class="distance-icon">+</span>
        <span class="distance-label">Adds to trip:</span>
        <span class="distance-value">${formattedExtraTime}</span>
      </div>
      
      <div class="time-breakdown">
        <div class="breakdown-item">
          <span class="breakdown-label">🚗 Driving:</span>
          <span class="breakdown-value">${formattedDrivingTime}</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">👣 Exploring:</span>
          <span class="breakdown-value">${formattedVisitTime}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Format time in minutes to a readable string
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted time string
 */
function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
  }
}

/**
 * Calculate the Haversine distance between two points
 * @param {number} lat1 - Latitude of first point in degrees
 * @param {number} lon1 - Longitude of first point in degrees
 * @param {number} lat2 - Latitude of second point in degrees
 * @param {number} lon2 - Longitude of second point in degrees
 * @returns {number} Distance in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  // Convert degrees to radians
  const toRad = (value) => value * Math.PI / 180;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

// Enhanced styles for the trip distance info
const tripInfoStyles = `
  .trip-distance-info {
    margin: 15px 40px;
    padding: 12px;
    background-color: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #94c9ba;
  }
  
  .distance-detail {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .distance-detail:last-child {
    margin-bottom: 0;
  }
  
  .distance-icon {
    margin-right: 8px;
    font-size: 16px;
    width: 20px;
    text-align: center;
  }
  
  .distance-label {
    flex: 1;
    font-size: 14px;
    color: #555;
  }
  
  .distance-value {
    font-weight: bold;
    color: #94c9ba;
    margin-right: 4px;
  }
  
  .time-breakdown {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px dashed #ddd;
  }
  
  .breakdown-item {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #666;
    margin-bottom: 4px;
  }
  
  .breakdown-label {
    margin-right: 10px;
  }
  
  .breakdown-value {
    font-weight: 600;
  }
`;