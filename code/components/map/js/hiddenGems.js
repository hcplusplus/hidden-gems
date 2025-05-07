// hiddenGems.js - Example for reading and filtering hidden gems data

/**
 * Loads and filters hidden gems data
 */
class HiddenGemsService {
    constructor() {
      this.data = null;
    }
  
    /**
     * Load hidden gems data from a JSON file
     * @param {string} filePath - Path to the JSON file
     * @returns {Promise<Object>} - The loaded data
     */
    async loadData(filePath) {
      try {
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
        }
        this.data = await response.json();
        console.log(`Loaded ${this.data.gems.length} hidden gems`);
        return this.data;
      } catch (error) {
        console.error('Error loading hidden gems data:', error);
        throw error;
      }
    }
  
    /**
     * Get all gems
     * @returns {Array} - All gems
     */
    getAllGems() {
      return this.data?.gems || [];
    }
  
    /**
     * Filter gems by maximum popularity score (lower = more hidden)
     * @param {number} maxScore - Maximum popularity score
     * @returns {Array} - Filtered gems
     */
    getGemsByPopularity(maxScore) {
      if (!this.data?.gems) return [];
      
      return this.data.gems.filter(gem => 
        gem.popularity_score === null || gem.popularity_score <= maxScore
      );
    }
  
    /**
     * Filter gems by category and subcategory
     * @param {string} category - Primary category (leisure, amenity, etc.)
     * @param {string|null} subcategory - Optional subcategory
     * @returns {Array} - Filtered gems
     */
    getGemsByCategory(category, subcategory = null) {
      if (!this.data?.gems) return [];
      
      return this.data.gems.filter(gem => {
        // Check if the gem has this category
        const hasCategory = gem[category] !== undefined;
        
        // If subcategory is specified, check if it matches
        if (subcategory && hasCategory) {
          return gem[category] === subcategory;
        }
        
        return hasCategory;
      });
    }
  
    /**
     * Filter gems by activity
     * @param {string|Array} activities - Activity or array of activities
     * @returns {Array} - Filtered gems
     */
    getGemsByActivity(activities) {
      if (!this.data?.gems) return [];
      
      const activityList = Array.isArray(activities) ? activities : [activities];
      
      return this.data.gems.filter(gem => 
        gem.activities && activityList.some(activity => 
          gem.activities.includes(activity)
        )
      );
    }
  
    /**
     * Filter gems by accessibility requirement
     * @param {string} requirement - Accessibility requirement (e.g., 'wheelchair', 'parking')
     * @returns {Array} - Filtered gems
     */
    getAccessibleGems(requirement) {
      if (!this.data?.gems) return [];
      
      return this.data.gems.filter(gem => 
        gem.accessibility && 
        (gem.accessibility[requirement] === true || gem.accessibility[requirement] === 'yes')
      );
    }
  
    /**
     * Filter gems by region
     * @param {string|Array} regions - Region or array of regions
     * @returns {Array} - Filtered gems
     */
    getGemsByRegion(regions) {
      if (!this.data?.gems) return [];
      
      const regionList = Array.isArray(regions) ? regions : [regions];
      
      return this.data.gems.filter(gem => 
        gem.region && regionList.includes(gem.region)
      );
    }
  
    /**
     * Filter gems by maximum distance from a point
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {number} maxDistanceKm - Maximum distance in kilometers
     * @returns {Array} - Filtered gems
     */
    getGemsByDistance(lat, lng, maxDistanceKm) {
      if (!this.data?.gems) return [];
      
      return this.data.gems.filter(gem => {
        const distance = this.calculateDistance(
          lat, lng, 
          gem.coordinates.latitude, 
          gem.coordinates.longitude
        );
        return distance <= maxDistanceKm;
      });
    }
  
    /**
     * Calculate distance between two points using the Haversine formula
     * @param {number} lat1 - Latitude of point 1
     * @param {number} lon1 - Longitude of point 1
     * @param {number} lat2 - Latitude of point 2
     * @param {number} lon2 - Longitude of point 2
     * @returns {number} - Distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Earth's radius in km
      const dLat = this.toRadians(lat2 - lat1);
      const dLon = this.toRadians(lon2 - lon1);
      
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }
  
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} - Angle in radians
     */
    toRadians(degrees) {
      return degrees * (Math.PI / 180);
    }
  
    /**
     * Combine multiple filters with AND logic
     * @param {Array} filters - Array of filter functions
     * @returns {Array} - Gems that pass all filters
     */
    combineFilters(...filters) {
      if (!this.data?.gems) return [];
      
      return this.data.gems.filter(gem => 
        filters.every(filterFn => filterFn(gem))
      );
    }
  
    /**
     * Sort gems by rating
     * @param {Array} gems - Gems to sort
     * @param {boolean} ascending - Sort direction
     * @returns {Array} - Sorted gems
     */
    sortByRating(gems, ascending = false) {
      return [...gems].sort((a, b) => {
        // Calculate average rating if there are reviews
        const ratingA = a.reviews && a.reviews.length 
          ? a.reviews.reduce((sum, review) => sum + review.rating, 0) / a.reviews.length 
          : 0;
        
        const ratingB = b.reviews && b.reviews.length 
          ? b.reviews.reduce((sum, review) => sum + review.rating, 0) / b.reviews.length 
          : 0;
        
        return ascending ? ratingA - ratingB : ratingB - ratingA;
      });
    }
  }
  
  // Example usage
  async function exampleUsage() {
    const gemsService = new HiddenGemsService();
    
    try {
      // Load data
      await gemsService.loadData('../../assets/data/berkeley_hidden_gems.geojson');
      
      // Get all gems
      const allGems = gemsService.getAllGems();
      console.log(`Total gems: ${allGems.length}`);
      
      // Get hidden gems (popularity score below 20)
      const hiddenGems = gemsService.getGemsByPopularity(20);
      console.log(`Hidden gems (popularity < 20): ${hiddenGems.length}`);
      
      // Get parks
      const parks = gemsService.getGemsByCategory('leisure', 'park');
      console.log(`Parks: ${parks.length}`);
      
      // Get wheelchair accessible restaurants
      const accessibleRestaurants = gemsService.combineFilters(
        gem => gem.amenity === 'restaurant',
        gem => gem.accessibility && (gem.accessibility.wheelchair === true || gem.accessibility.wheelchair === 'yes')
      );
      console.log(`Wheelchair accessible restaurants: ${accessibleRestaurants.length}`);
      
      // Get hiking spots within 5km of Berkeley
      const nearbyHiking = gemsService.combineFilters(
        gem => gem.activities && gem.activities.includes('hiking'),
        gem => gemsService.calculateDistance(37.87, -122.27, gem.coordinates.latitude, gem.coordinates.longitude) <= 5
      );
      console.log(`Hiking spots within 5km: ${nearbyHiking.length}`);
      
      // Sort results by rating
      const topRatedGems = gemsService.sortByRating(allGems);
      console.log("Top 3 highest-rated gems:");
      topRatedGems.slice(0, 3).forEach(gem => console.log(`- ${gem.name}: ${gem.rating || 'No rating'}`));
      
    } catch (error) {
      console.error('Example usage error:', error);
    }
  }
  
  // Run the example
  exampleUsage();