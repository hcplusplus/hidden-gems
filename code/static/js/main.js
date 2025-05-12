/**
 * main.js
 * Main entry point for the Hidden Gems application
 * Now leverages the consolidated data controller for all data operations
 */

// Make sure the HiddenGems namespace exists
window.HiddenGems = window.HiddenGems || {};


// Define utility functions directly on the window.HiddenGems object
window.HiddenGems.utils = {
    // Get previous index with wraparound
    getPrevIndex: function (currentIndex, total) {
        return (currentIndex - 1 + total) % total;
    },

    // Get next index with wraparound
    getNextIndex: function (currentIndex, total) {
        return (currentIndex + 1) % total;
    },

    // Convert degrees to radians
    toRadians: function (degrees) {
        return degrees * Math.PI / 180;
    },

    // Calculate distance between two points in miles
    calculateDistance: function (lat1, lon1, lat2, lon2) {
        const R = 3958.8; // Earth's radius in miles
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    // Fisher-Yates shuffle algorithm
    shuffleArray: function (array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    },

    // Show loading animation
    showLoading: function (message = 'Loading...') {
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
    hideLoading: function () {
        const loadingEl = document.getElementById('gems-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    },

    // Validate coordinates
    isValidCoordinate: function (lng, lat) {
        if (isNaN(lng) || isNaN(lat)) return false;
        if (lng < -180 || lng > 180) return false;
        if (lat < -90 || lat > 90) return false;
        return true;
    },

    // Escape HTML for safe insertion
    escapeHtml: function (unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    // Get device size information
    getDeviceSize: function () {
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
    }
};

// Create a map namespace placeholder - will be populated by map-controller.js
window.HiddenGems.map = {
    activeGemIndex: 0,

    // Map initialization placeholder
    init: function () {
        return new Promise((resolve) => {
            console.log('Map init placeholder called - waiting for real implementation');
            resolve();
        });
    },

};

// Define global functions that can be called from anywhere
window.showLoading = function (message) {
    return window.HiddenGems.utils.showLoading(message);
};

window.hideLoading = function () {
    window.HiddenGems.utils.hideLoading();
};


// async initialization that won't throw uncaught errors
async function initApp() {
    try {
        // Check if we're on index page with welcome overlay
        const isIndexPage = window.location.pathname.endsWith('index.html') || 
                            window.location.pathname.endsWith('/') ||
                            window.location.pathname === '';
        const welcomeOverlay = document.getElementById('welcome-overlay');
        
        // If on index page with welcome overlay, just show the welcome and return
        if (isIndexPage && welcomeOverlay) {
            console.log("On index page with welcome overlay - waiting for user interaction");
            
            // Make sure HiddenGems namespace exists
            window.HiddenGems = window.HiddenGems || {};
            window.HiddenGems.userHasInteracted = false;
            
            // Show welcome message if it's not been shown
            if (!localStorage.getItem('welcomeShown') && typeof window.showWelcomeMessage === 'function') {
                setTimeout(window.showWelcomeMessage, 100);
            }
            
            return; // exit- initialization will happen after user interacts
        }
        
        // For non-index pages, or index without welcome overlay, continue with normal init
        
        // Get pageName for initialization
        const pageName = getPageName();
        console.log(`Initializing app for page: ${pageName}`);
        
        // Initialize map first (returns a promise)
        if (window.HiddenGems.map && typeof window.HiddenGems.map.init === 'function') {
            await window.HiddenGems.map.init(pageName);
        } else {
            // Fallback to basic map initialization if namespaced version not available
            if (typeof window.initializeMap === 'function') {
                await window.initializeMap();
            }
        }
        
        // Initialize preferences if function exists
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

// Helper function to get current page name
function getPageName() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    
    if (!filename || filename === '' || filename === 'index.html') {
        return 'index';
    }
    
    return filename.replace('.html', '');
}

// Add navigation utility function
function navigateWithData(url, data) {
    // Save current state to data controller
    if (window.HiddenGems && window.HiddenGems.data) {
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

// Debug mode toggle and utilities
window.HiddenGems.debug = {
    enabled: false,

    enable: function () {
        this.enabled = true;
        console.log('Debug mode enabled');
        this.addDebugPanel();
        return 'Debug mode enabled - check the bottom of the screen for debug panel';
    },

    disable: function () {
        this.enabled = false;
        const panel = document.getElementById('debug-panel');
        if (panel) panel.remove();
        console.log('Debug mode disabled');
        return 'Debug mode disabled';
    },

    log: function (message, data) {
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

    addDebugPanel: function () {
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

    inspectGemCoordinates: function () {
        if (!window.HiddenGems.data || !window.HiddenGems.data.pageGems) {
            return 'No gems data available';
        }

        const gems = window.HiddenGems.data.pageGems;
        const results = [];

        gems.forEach((gem, index) => {
            const coords = gem.coords || gem.coordinates;

            // Try to normalize coordinates (lng/lat format)
            let normalized = null;
            if (coords) {
                if (window.HiddenGems.utils.isValidCoordinate(coords[0], coords[1])) {
                    normalized = coords;
                } else if (window.HiddenGems.utils.isValidCoordinate(coords[1], coords[0])) {
                    normalized = [coords[1], coords[0]];
                }
            }

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
window.debugGems = function () {
    return window.HiddenGems.debug.enable();
};

// Shortcut to check coordinates
window.checkCoords = function () {
    return window.HiddenGems.debug.inspectGemCoordinates();
};

// Wait for DOM to be fully loaded, then initialize the app
document.addEventListener('DOMContentLoaded', function () {
    // Initialize application modules in the correct order
    initApp();
});