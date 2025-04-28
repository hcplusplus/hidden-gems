/**
 * Main entry point for the Hidden Gems application
 */

// Ensure namespace exists
var HiddenGems = window.HiddenGems || {};

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize application modules in the correct order
    initApp();
});

/**
 * Initialize the application
 */
async function initApp() {
    try {
        // Initialize map first (returns a promise)
        await HiddenGems.map.init();
        
        // Initialize remaining modules
        HiddenGems.preferences.init();
        HiddenGems.cards.createCards();
        HiddenGems.cards.createSwipeIndicators();
        HiddenGems.swipe.init();
        HiddenGems.achievements.init();
        
        // Apply preference filters
        HiddenGems.cards.applyPreferenceFilters();
        
        console.log('Hidden Gems App initialized successfully!');
    } catch (err) {
        console.error('Error initializing app:', err);
    }
}

// Export the namespace
window.HiddenGems = HiddenGems;