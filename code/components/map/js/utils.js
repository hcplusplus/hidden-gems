/**
 * Utility functions for the Hidden Gems application
 */

// Ensure namespace exists
var HiddenGems = window.HiddenGems || {};

// Utils sub-namespace
HiddenGems.utils = {
    /**
     * Get the previous index in a circular array
     * @param {number} currentIndex - Current index
     * @param {number} arrayLength - Length of the array
     * @returns {number} Previous index
     */
    getPrevIndex: function(currentIndex, arrayLength) {
        return (currentIndex > 0) ? currentIndex - 1 : arrayLength - 1;
    },
    
    /**
     * Get the next index in a circular array
     * @param {number} currentIndex - Current index
     * @param {number} arrayLength - Length of the array
     * @returns {number} Next index
     */
    getNextIndex: function(currentIndex, arrayLength) {
        return (currentIndex < arrayLength - 1) ? currentIndex + 1 : 0;
    },
    
    /**
     * Calculate distance between two coordinates
     * @param {Array} coord1 - First coordinate [lng, lat]
     * @param {Array} coord2 - Second coordinate [lng, lat]
     * @returns {number} Distance in kilometers
     */
    calculateDistance: function(coord1, coord2) {
        // Haversine formula to calculate distance between two points on Earth
        const toRad = (value) => (value * Math.PI) / 180;
        
        const R = 6371; // Radius of the Earth in km
        const dLat = toRad(coord2[1] - coord1[1]);
        const dLon = toRad(coord2[0] - coord1[0]);
        
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(coord1[1])) * Math.cos(toRad(coord2[1])) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },
    
    /**
     * Check if a gem matches the user's popularity preference
     * @param {number} gemPopularity - Gem popularity score
     * @returns {boolean} Whether the gem matches the preference
     */
    matchesPopularityPreference: function(gemPopularity) {
        const threshold = 60; // Default to balanced
        
        return gemPopularity <= threshold;
    },
    
    /**
     * Get color for gem category
     * @param {string} category - Gem category
     * @returns {string} Color hex code
     */
    getCategoryColor: function(category) {
        const colors = {
            'leisure': '#4CAF50', // Green
            'natural': '#8BC34A', // Light Green
            'historic': '#FFC107', // Amber
            'amenity': '#FF5722'  // Deep Orange
        };
        
        return colors[category] || '#2196F3'; // Default to blue
    },
    
    /**
     * Format date to YYYY-MM-DD format
     * @param {Date} date - Date object
     * @returns {string} Formatted date
     */
    formatDate: function(date) {
        const d = date || new Date();
        
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    },
    
    /**
     * Generate a unique ID
     * @returns {string} Unique ID
     */
    generateId: function() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    },
    
    /**
     * Debounce a function to prevent multiple rapid calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce: function(func, wait) {
        let timeout;
        
        return function(...args) {
            const context = this;
            
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    },
    
    /**
     * Throttle a function to limit call frequency
     * @param {Function} func - Function to throttle
     * @param {number} limit - Limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle: function(func, limit) {
        let inThrottle;
        
        return function(...args) {
            const context = this;
            
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
        };
    },
    
    /**
     * Check if a gem matches search criteria
     * @param {Object} gem - Gem object
     * @param {string} query - Search query
     * @returns {boolean} Whether the gem matches the search
     */
    matchesSearch: function(gem, query) {
        if (!query || query.trim() === '') {
            return true;
        }
        
        const searchTerms = query.toLowerCase().trim().split(/\s+/);
        
        // Check if gem matches all search terms
        return searchTerms.every(term => {
            return (
                // Search in title
                (gem.title && gem.title.toLowerCase().includes(term)) ||
                // Search in description
                (gem.description && gem.description.toLowerCase().includes(term)) ||
                // Search in categories
                (gem.category && gem.category.toLowerCase().includes(term)) ||
                (gem.subcategory && gem.subcategory.toLowerCase().includes(term)) ||
                // Search in tags
                (gem.tags && gem.tags.some(tag => tag.toLowerCase().includes(term)))
            );
        });
    }
};

// Export the namespace
window.HiddenGems = HiddenGems;