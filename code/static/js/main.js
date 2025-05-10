/**
 * Main entry point for the Hidden Gems application
 * Complete fresh implementation with all enhancements
 */

// Create the HiddenGems namespace immediately to avoid race conditions
window.HiddenGems = window.HiddenGems || {};

// Define application-wide constants
window.HiddenGems.constants = {
    // Default location (Berkeley, CA)
    DEFAULT_CENTER: [-122.2730, 37.8715],
    DEFAULT_ZOOM: 11, // Higher default zoom for better initial density
    
    // Search settings
    DEFAULT_RADIUS: 5, // miles
    DEFAULT_LIMIT: 10,
    MIN_GEMS: 5, // Minimum number of gems to display
    MAX_ATTEMPTS: 3, // Maximum zoom-out attempts
    
    // JSON data path
    DATA_PATH: 'static/assets/data/hidden_gems.json',
    
    // Icon paths
    ICON_PATHS: {
        red: "static/icons/gem-red.svg",
        purple: "static/icons/gem-purple.svg",
        blue: "static/icons/gem-blue.svg"
    },
    
    // Category emoji mapping
    CATEGORY_EMOJI: {
        'nature': '🌲',
        'food': '🍽️',
        'cultural': '🏛️',
        'viewpoint': '🌄',
        'hidden-beach': '🏖️',
        'historic-site': '🏛️',
        'local-eatery': '🍽️',
        'natural-wonder': '🌲',
        'secret-trail': '🥾',
        'winery': '🍷',
        'coffee-shop': '☕'
    },
    
    // Swipe settings
    SWIPE_THRESHOLD: 80
};

// Define utility functions directly on the window.HiddenGems object
window.HiddenGems.utils = {

    
    getPrevIndex: function(currentIndex, total) {
        return (currentIndex - 1 + total) % total;
    },
    
    getNextIndex: function(currentIndex, total) {
        return (currentIndex + 1) % total;
    },
    
    // Convert degrees to radians
    toRadians: function(degrees) {
        return degrees * Math.PI / 180;
    },
    
    // Calculate distance between two points in miles
    calculateDistance: function(lat1, lon1, lat2, lon2) {
        const R = 3958.8; // Earth's radius in miles
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance;
    },
    
    // Fisher-Yates shuffle algorithm
    shuffleArray: function(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    },
    
    // Show loading animation
    showLoading: function(message = 'Loading...') {
        // Check if element already exists
        let loadingEl = document.getElementById('gems-loading');
        
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.id = 'gems-loading';
            loadingEl.style.position = 'fixed';
            loadingEl.style.top = '50%';
            loadingEl.style.left = '50%';
            loadingEl.style.transform = 'translate(-50%, -50%)';
            loadingEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            loadingEl.style.color = 'white';
            loadingEl.style.padding = '15px 20px';
            loadingEl.style.borderRadius = '5px';
            loadingEl.style.zIndex = '2000';
            loadingEl.innerHTML = message;
            
            document.body.appendChild(loadingEl);
        } else {
            loadingEl.innerHTML = message;
            loadingEl.style.display = 'block';
        }
        
        return loadingEl;
    },
    
    // Hide loading animation
    hideLoading: function() {
        const loadingEl = document.getElementById('gems-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
            // We don't remove it completely to avoid recreating on repeated calls
        }
    },
    
    // Validate coordinates
    isValidCoordinate: function(lng, lat) {
        if (isNaN(lng) || isNaN(lat)) return false;
        if (lng < -180 || lng > 180) return false;
        if (lat < -90 || lat > 90) return false;
        return true;
    },
    
    // Escape HTML for safe insertion
    escapeHtml: function(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// Add to main.js
window.HiddenGems.utils.getDeviceSize = function() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height;
    
    let deviceCategory = 'phone';
    if (width >= 768 || height >= 768) {
        deviceCategory = 'tablet';
    }
    if (width >= 1024 || height >= 1024) {
        deviceCategory = 'desktop';
    }
    
    return {
        width: width,
        height: height,
        isLandscape: isLandscape,
        deviceCategory: deviceCategory,
        isSmallPhone: height < 600,
        hasSafeArea: CSS.supports('padding: env(safe-area-inset-top)')
    };
};


// Initial data namespace
window.HiddenGems.data = {
    gems: [],
    isProcessingEvent: false, // Add a flag to prevent recursion
    loadGems: function(gemsData) {
        this.gems = gemsData;
        
        // Only dispatch event if not already processing an event
        if (!this.isProcessingEvent) {
            document.dispatchEvent(new CustomEvent('gemsLoaded', {
                detail: { gems: gemsData }
            }));
        }
    }
};

// Initialize preferences namespace
window.HiddenGems.preferences = {
    getUserPreferences: function() {
        const preferences = localStorage.getItem('userPreferences');
        if (preferences) {
            return JSON.parse(preferences);
        }
        return {
            activities: [],
            accessibility: [],
            detourTime: 60,
            popularity: 3,
            visitedGems: []
        };
    },
    
    saveUserPreferences: function(preferences) {
        localStorage.setItem('userPreferences', JSON.stringify(preferences));
    }
};

// Create a map namespace placeholder - will be populated by map-controller.js
window.HiddenGems.map = {
    activeGemIndex: 0,
    init: function() {
        return new Promise((resolve) => {
            console.log('Map init placeholder called - waiting for real implementation');
            // Resolve immediately - will be overridden by map-controller.js
            resolve();
        })
    }
};

// Define global functions that can be called from anywhere
window.showLoading = function(message) {
    return window.HiddenGems.utils.showLoading(message);
};

window.hideLoading = function() {
    window.HiddenGems.utils.hideLoading();
};

// Create a safer async initialization that won't throw uncaught errors
async function initApp() {
    try {
        // Show loading indicator
        try {
            window.HiddenGems.utils.showLoading('Starting Hidden Gems...');
        } catch (e) {
            console.warn('Error using namespaced loading function:', e);
            // Fallback to direct creation
            const loadingEl = document.createElement('div');
            loadingEl.id = 'gems-loading';
            loadingEl.style.position = 'fixed';
            loadingEl.style.top = '50%';
            loadingEl.style.left = '50%';
            loadingEl.style.transform = 'translate(-50%, -50%)';
            loadingEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            loadingEl.style.color = 'white';
            loadingEl.style.padding = '15px 20px';
            loadingEl.style.borderRadius = '5px';
            loadingEl.style.zIndex = '2000';
            loadingEl.innerHTML = 'Starting Hidden Gems...';
            document.body.appendChild(loadingEl);
        }
        
        // Initialize map first (returns a promise)
        if (window.HiddenGems.map && typeof window.HiddenGems.map.init === 'function') {
            await window.HiddenGems.map.init();
        } else {
            // Fallback to basic map initialization if namespaced version not available
            if (typeof initializeMap === 'function') {
                initializeMap();
            }
        }
        
        // Map is initialized, gem loading will happen in the map initialization
        // based on location and adaptive sampling strategy
        
        // Show welcome message if needed
        if (!localStorage.getItem('welcomeShown') && typeof showWelcomeMessage === 'function') {
            setTimeout(showWelcomeMessage, 500);
        }

        // initialize preferences
        if (typeof initializePreferences === 'function') {
            initializePreferences();
        }
        
        console.log('Hidden Gems App initialized successfully!');
        
        // Try to hide loading indicator
        try {
            window.HiddenGems.utils.hideLoading();
        } catch (e) {
            console.warn('Error hiding loading indicator:', e);
            // Fallback approach
            const loadingEl = document.getElementById('gems-loading');
            if (loadingEl) loadingEl.style.display = 'none';
        }
    } catch (err) {
        console.error('Error initializing app:', err);
        
        // Try to hide loading indicator
        try {
            window.HiddenGems.utils.hideLoading();
        } catch (e) {
            const loadingEl = document.getElementById('gems-loading');
            if (loadingEl) loadingEl.style.display = 'none';
        }
        
        // Show error message
        const errorEl = document.createElement('div');
        errorEl.style.position = 'fixed';
        errorEl.style.top = '50%';
        errorEl.style.left = '50%';
        errorEl.style.transform = 'translate(-50%, -50%)';
        errorEl.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
        errorEl.style.color = 'white';
        errorEl.style.padding = '20px';
        errorEl.style.borderRadius = '5px';
        errorEl.style.zIndex = '2000';
        errorEl.style.maxWidth = '80%';
        errorEl.innerHTML = `<h3>Error Loading App</h3><p>${err.message || 'Unknown error'}</p>`;
        document.body.appendChild(errorEl);
        
        // Remove error after 5 seconds
        setTimeout(() => {
            if (errorEl.parentNode) {
                errorEl.parentNode.removeChild(errorEl);
            }
        }, 5000);
    }
}


// Function to adjust map for current device
window.HiddenGems.map.adjustForDevice = function() {
    const deviceSize = window.HiddenGems.utils.getDeviceSize();
    
    // Adjust card height based on device size
    const cardsContainer = document.querySelector('.cards-container');
    if (cardsContainer) {
        if (deviceSize.isSmallPhone) {
            cardsContainer.style.height = '140px';
        } else if (deviceSize.isLandscape) {
            cardsContainer.style.height = '130px';
        } else {
            cardsContainer.style.height = '170px';
        }
    }
    
    // Adjust map padding
    if (map) {
        const padding = {
            top: deviceSize.isLandscape ? 40 : 60,
            bottom: deviceSize.isLandscape ? 140 : 180,
            left: 20,
            right: 20
        };
        
        if (deviceSize.hasSafeArea) {
            // Add safe area insets for notched phones
            padding.left += 10;
            padding.right += 10;
        }
        
        // Update map bounds padding
        if (typeof map.fitBounds === 'function') {
            this._mapPadding = padding;
        }
    }
};

// Add this function to main.js
function navigateWithData(url, data) {
    // Save current state to data controller
    if (window.HiddenGemsData) {
        // Save preferences
        const prefs = window.HiddenGemsData.preferences.get();
        
        // Update with new data if provided
        if (data && data.preferences) {
            Object.assign(prefs, data.preferences);
            window.HiddenGemsData.preferences.save(prefs);
        }
        
        // Save gems if provided
        if (data && data.selectedGems) {
            window.HiddenGemsData.gemsData.save(data.selectedGems);
        }
        
        // Generate URL with minimal data (just a reference ID)
        const sessionId = Date.now().toString();
        sessionStorage.setItem(`hiddenGems_session_${sessionId}`, JSON.stringify(data));
        
        // Navigate with lightweight param instead of all the data
        window.location.href = `${url}?session=${sessionId}`;
    } else {
        // Fallback to direct URL encoding if data controller not available
        const encodedData = data ? encodeURIComponent(JSON.stringify(data)) : '';
        window.location.href = `${url}${encodedData ? '?data=' + encodedData : ''}`;
    }
}

// Wait for DOM to be fully loaded, then initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Initialize application modules in the correct order
    initApp();
});

// Add to main.js
window.HiddenGems.debug = {
    enabled: false,
    
    enable: function() {
        this.enabled = true;
        console.log('Debug mode enabled');
        this.addDebugPanel();
        return 'Debug mode enabled - check the bottom of the screen for debug panel';
    },
    
    disable: function() {
        this.enabled = false;
        const panel = document.getElementById('debug-panel');
        if (panel) panel.remove();
        console.log('Debug mode disabled');
        return 'Debug mode disabled';
    },
    
    log: function(message, data) {
        if (!this.enabled) return;
        
        console.log('[HiddenGems Debug]', message, data);
        
        // Update debug panel if it exists
        const debugContent = document.getElementById('debug-content');
        if (debugContent) {
            const entry = document.createElement('div');
            entry.innerHTML = `<strong>${message}</strong>: ${JSON.stringify(data)}`;
            debugContent.appendChild(entry);
            
            // Limit entries to most recent 10
            while (debugContent.children.length > 10) {
                debugContent.removeChild(debugContent.firstChild);
            }
        }
    },
    
    addDebugPanel: function() {
        let panel = document.getElementById('debug-panel');
        
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'debug-panel';
            panel.style.position = 'fixed';
            panel.style.bottom = '0';
            panel.style.left = '0';
            panel.style.right = '0';
            panel.style.background = 'rgba(0,0,0,0.8)';
            panel.style.color = 'white';
            panel.style.padding = '10px';
            panel.style.fontSize = '12px';
            panel.style.maxHeight = '30%';
            panel.style.overflow = 'auto';
            panel.style.zIndex = '9999';
            
            const heading = document.createElement('div');
            heading.innerHTML = '<strong>Debug Mode</strong> <button id="debug-close">Close</button>';
            
            const content = document.createElement('div');
            content.id = 'debug-content';
            
            panel.appendChild(heading);
            panel.appendChild(content);
            document.body.appendChild(panel);
            
            // Add close button functionality
            document.getElementById('debug-close').addEventListener('click', () => this.disable());
        }
    },
    
    inspectGemCoordinates: function() {
        if (!HiddenGems.data || !HiddenGems.data.gems) {
            return 'No gems data available';
        }
        
        const gems = HiddenGems.data.gems;
        const results = [];
        
        gems.forEach((gem, index) => {
            const coords = gem.coords || gem.coordinates;
            const normalized = coords ? normalizeCoordinates(coords) : null;
            
            results.push({
                index,
                name: gem.name || `Gem ${index}`,
                originalCoords: coords,
                normalizedCoords: normalized,
                valid: !!normalized
            });
        });
        
        console.table(results);
        return `Inspected ${results.length} gems - check console for details`;
    }
};

// Shortcut to enable debug mode
window.debugGems = function() {
    return window.HiddenGems.debug.enable();
};

// Shortcut to check coordinates
window.checkCoords = function() {
    return window.HiddenGems.debug.inspectGemCoordinates();
};