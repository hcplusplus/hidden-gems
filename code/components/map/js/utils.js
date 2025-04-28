/**
 * Utility functions for the Hidden Gems application
 */

// App namespace to avoid global variable pollution
var HiddenGems = window.HiddenGems || {};

// Utility functions sub-namespace
HiddenGems.utils = {
    /**
     * Calculate distance between two coordinates
     * @param {Array} point1 - [longitude, latitude]
     * @param {Array} point2 - [longitude, latitude]
     * @returns {number} Distance between points
     */
    calculateDistance: function(point1, point2) {
        const dx = point1[0] - point2[0];
        const dy = point1[1] - point2[1];
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Get color based on category
     * @param {string} category - Category name ('nature', 'food', 'cultural')
     * @returns {string} Color hex code
     */
    getCategoryColor: function(category) {
        const colorMap = {
            'nature': '#27ae60',
            'food': '#e74c3c',
            'cultural': '#9b59b6'
        };
        
        return colorMap[category] || '#3498db';
    },

    /**
     * Get previous index in an array with wrapping
     * @param {number} currentIndex - Current index
     * @param {number} arrayLength - Length of the array
     * @returns {number} Previous index with wrapping
     */
    getPrevIndex: function(currentIndex, arrayLength) {
        return (currentIndex - 1 + arrayLength) % arrayLength;
    },

    /**
     * Get next index in an array with wrapping
     * @param {number} currentIndex - Current index
     * @param {number} arrayLength - Length of the array
     * @returns {number} Next index with wrapping
     */
    getNextIndex: function(currentIndex, arrayLength) {
        return (currentIndex + 1) % arrayLength;
    },

    /**
     * Check if a gem's popularity matches the user preference
     * @param {number} gemPopularity - Popularity of the gem (1-5)
     * @param {number} userPreference - User's popularity preference (1-5)
     * @returns {boolean} Whether the gem matches the preference
     */
    matchesPopularityPreference: function(gemPopularity, userPreference) {
        // userPreference: 1 = Only Hidden Gems, 5 = Popular Spots
        // gemPopularity: 1-2 = Hidden Gem, 3-5 = Increasingly popular
        
        switch(userPreference) {
            case 1: // Only Hidden Gems
                return gemPopularity <= 2;
            case 2: // Mostly Hidden
                return gemPopularity <= 3;
            case 3: // Balanced
                return true; // Show all
            case 4: // Some Popular
                return gemPopularity >= 2;
            case 5: // Popular Spots
                return gemPopularity >= 3;
            default:
                return true;
        }
    }
};

// Export the namespace for other modules
window.HiddenGems = HiddenGems;