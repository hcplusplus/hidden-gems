/**
 * improved-trip-distance-calculator.js
 * Calculates and displays the total detour time for visiting a gem
 */

// Create a namespace for the distance calculator
window.HiddenGems = window.HiddenGems || {};
window.HiddenGems.distanceCalculator = {
  /**
   * Initialize the distance calculator
   */
  initialize: function() {
    console.log('Initializing improved trip distance calculator');
    
    // Override the showCard function in enhancedCards to show distances
    this.enhanceShowCardFunction();
    
    // Override the renderRoutes function to calculate distances
    this.enhanceRenderRoutesFunction();
  },
  
  /**
   * Enhance the showCard function to display distance information
   */
  enhanceShowCardFunction: function() {
    // Check if enhancedCards exists
    if (!window.HiddenGems.enhancedCards || !window.HiddenGems.enhancedCards.showCard) {
      console.warn('Enhanced cards not found, waiting...');
      
      // Wait for enhancedCards to be available
      const checkInterval = setInterval(() => {
        if (window.HiddenGems.enhancedCards && window.HiddenGems.enhancedCards.showCard) {
          clearInterval(checkInterval);
          this.overrideShowCard();
        }
      }, 100);
      return;
    }
    
    this.overrideShowCard();
  },
  
  /**
   * Override the showCard function in enhancedCards
   */
  overrideShowCard: function() {
    // Store the original function
    const originalShowCard = window.HiddenGems.enhancedCards.showCard;
    
    // Override with enhanced version
    window.HiddenGems.enhancedCards.showCard = (index) => {
      // Call the original function first
      originalShowCard.call(window.HiddenGems.enhancedCards, index);
      
      // Then calculate and display the added distance
      this.updateDistanceDisplay(index);
    };
    
    console.log('Enhanced showCard function to display distances');
  },
  
  /**
   * Enhance the renderRoutes function to calculate distances
   */
  enhanceRenderRoutesFunction: function() {
    // Wait for the renderRoutes function to be available
    const checkInterval = setInterval(() => {
      if (typeof window.renderRoutes === 'function') {
        clearInterval(checkInterval);
        
        // Store the original function
        const originalRenderRoutes = window.renderRoutes;
        
        // Override with enhanced version that calculates distances
        window.renderRoutes = (gemCoords) => {
          // Call the original function
          originalRenderRoutes(gemCoords);
          
          // Calculate and store distance information
          this.calculateDistances(gemCoords);
        };
        
        console.log('Enhanced renderRoutes function to calculate distances');
      }
    }, 100);
  },
  
  /**
   * Calculate distances for direct and detour routes
   * @param {Array} gemCoords - Coordinates of the gem [lng, lat]
   */
  calculateDistances: function(gemCoords) {
    // Get origin and destination coordinates
    const originCoords = JSON.parse(sessionStorage.getItem('originCoords'));
    const destinationCoords = JSON.parse(sessionStorage.getItem('destinationCoords'));
    
    if (!originCoords || !destinationCoords || !gemCoords) {
      console.warn('Missing coordinates for distance calculation');
      return;
    }
    
    // Calculate direct distance (origin to destination)
    const directDistance = this.calculateHaversineDistance(
      originCoords[1], originCoords[0], 
      destinationCoords[1], destinationCoords[0]
    );
    
    // Calculate detour distances (origin to gem, gem to destination)
    const originToGemDistance = this.calculateHaversineDistance(
      originCoords[1], originCoords[0],
      gemCoords[1], gemCoords[0]
    );
    
    const gemToDestinationDistance = this.calculateHaversineDistance(
      gemCoords[1], gemCoords[0],
      destinationCoords[1], destinationCoords[0]
    );
    
    // Calculate total detour distance
    const detourDistance = originToGemDistance + gemToDestinationDistance;
    
    // Calculate added distance (total detour - direct route)
    const addedDistance = detourDistance - directDistance;
    
    // Store the distances
    this.directDistance = directDistance;
    this.detourDistance = detourDistance;
    this.addedDistance = addedDistance;
    this.originToGemDistance = originToGemDistance;
    this.gemToDestinationDistance = gemToDestinationDistance;
    
    // Find active card and update distance display
    const activeCardIndex = window.HiddenGems.enhancedCards?.activeIndex;
    if (activeCardIndex !== undefined) {
      this.updateDistanceDisplay(activeCardIndex);
    }
    
    console.log(`Route distances calculated - Direct: ${directDistance.toFixed(1)}km, Total detour: ${detourDistance.toFixed(1)}km`);
  },
  
  /**
   * Update the distance display on the active card
   * @param {number} index - Index of the active card
   */
  updateDistanceDisplay: function(index) {
    // Get the active card
    const activeCard = document.getElementById(`card-${index}`);
    if (!activeCard) return;
    
    // Get gem data
    const gem = this.getGemAtIndex(index);
    if (!gem) return;
    
    // Calculate distances if not already calculated
    if (this.detourDistance === undefined) {
      const coords = gem.coordinates || gem.coords;
      if (coords) {
        this.calculateDistances(coords);
      } else {
        return;
      }
    }
    
    // Check if distance display already exists
    let distanceDisplay = activeCard.querySelector('.trip-distance-info');
    
    if (!distanceDisplay) {
      // Create distance display element
      distanceDisplay = document.createElement('div');
      distanceDisplay.className = 'trip-distance-info';
      
      // Find a good place to insert it (before the card actions)
      const cardActions = activeCard.querySelector('.card-actions');
      if (cardActions) {
        cardActions.parentNode.insertBefore(distanceDisplay, cardActions);
      } else {
        // Fall back to appending to the card
        activeCard.appendChild(distanceDisplay);
      }
    }
    
    // Format the total detour distance with appropriate units
    let formattedDetourDistance;
    
    if (this.detourDistance < 1) {
      // Use meters for short distances
      formattedDetourDistance = `${Math.round(this.detourDistance * 1000)}m`;
    } else {
      // Use kilometers for longer distances
      formattedDetourDistance = `${this.detourDistance.toFixed(1)}km`;
    }
    
    // Calculate approximate driving time for the total detour
    // Using an average driving speed of 50 km/h
    const detourTimeMinutes = Math.ceil((this.detourDistance / 50) * 60);
    
    // Format the time in a more readable way
    let formattedTime;
    if (detourTimeMinutes < 60) {
      formattedTime = `${detourTimeMinutes} min`;
    } else {
      const hours = Math.floor(detourTimeMinutes / 60);
      const minutes = detourTimeMinutes % 60;
      formattedTime = minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    }
    
    // Calculate approximate driving time for the direct route
    const directTimeMinutes = Math.ceil((this.directDistance / 50) * 60);
    
    // Format the direct time
    let formattedDirectTime;
    if (directTimeMinutes < 60) {
      formattedDirectTime = `${directTimeMinutes} min`;
    } else {
      const hours = Math.floor(directTimeMinutes / 60);
      const minutes = directTimeMinutes % 60;
      formattedDirectTime = minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    }
    
    // Calculate how much extra time this adds to the trip
    const extraTimeMinutes = detourTimeMinutes - directTimeMinutes;
    
    // Format the extra time
    let formattedExtraTime;
    if (extraTimeMinutes < 60) {
      formattedExtraTime = `${extraTimeMinutes} min`;
    } else {
      const hours = Math.floor(extraTimeMinutes / 60);
      const minutes = extraTimeMinutes % 60;
      formattedExtraTime = minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    }
    
    // Update the content
    distanceDisplay.innerHTML = `
      <div class="distance-detail">
        <span class="distance-icon">🕒</span>
        <span class="distance-label">Visit time:</span>
        <span class="distance-value">${formattedTime}</span>
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
    `;
    
    // Add visit breakdown if we have gem visit time
    if (gem.time) {
      const gemVisitTime = parseInt(gem.time, 10);
      if (!isNaN(gemVisitTime)) {
        // Calculate driving time only (without the visit time)
        const drivingTimeMinutes = detourTimeMinutes - gemVisitTime;
        
        // Format the driving time
        let formattedDrivingTime;
        if (drivingTimeMinutes < 60) {
          formattedDrivingTime = `${drivingTimeMinutes} min`;
        } else {
          const hours = Math.floor(drivingTimeMinutes / 60);
          const minutes = drivingTimeMinutes % 60;
          formattedDrivingTime = minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
        }
        
        // Add breakdown section
        const breakdownDiv = document.createElement('div');
        breakdownDiv.className = 'time-breakdown';
        breakdownDiv.innerHTML = `
          <div class="breakdown-item">
            <span class="breakdown-label">🚗 Driving:</span>
            <span class="breakdown-value">${formattedDrivingTime}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">👣 Exploring:</span>
            <span class="breakdown-value">${gemVisitTime} min</span>
          </div>
        `;
        
        distanceDisplay.appendChild(breakdownDiv);
      }
    }
  },
  
  /**
   * Calculate the Haversine distance between two points
   * @param {number} lat1 - Latitude of first point in degrees
   * @param {number} lon1 - Longitude of first point in degrees
   * @param {number} lat2 - Latitude of second point in degrees
   * @param {number} lon2 - Longitude of second point in degrees
   * @returns {number} Distance in kilometers
   */
  calculateHaversineDistance: function(lat1, lon1, lat2, lon2) {
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
  },
  
  /**
   * Get gem data at index
   * @param {number} index - Index of the gem
   * @returns {Object|null} Gem data or null if not found
   */
  getGemAtIndex: function(index) {
    // Try different methods to get gem data
    
    // Try HiddenGems.data
    if (window.HiddenGems && window.HiddenGems.data && window.HiddenGems.data.gems) {
      if (index >= 0 && index < window.HiddenGems.data.gems.length) {
        return window.HiddenGems.data.gems[index];
      }
    }
    
    // Try sessionStorage
    const sources = [
      'shuffledGems',
      'recommendedGems',
      'routeFilteredGems',
      'gems'
    ];
    
    for (const source of sources) {
      const storedData = sessionStorage.getItem(source);
      if (storedData) {
        try {
          const gems = JSON.parse(storedData);
          if (index >= 0 && index < gems.length) {
            return gems[index];
          }
        } catch (error) {
          console.error(`Error parsing ${source}:`, error);
        }
      }
    }
    
    return null;
  }
};

// Add styles for the distance display
const style = document.createElement('style');
style.textContent = `
  .trip-distance-info {
    margin: 10px 0;
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
document.head.appendChild(style);

// Initialize the distance calculator when the page loads
document.addEventListener('DOMContentLoaded', function() {
  window.HiddenGems.distanceCalculator.initialize();
});