/**
 * data-controller.js
 * Unified data management system for Northern California Hidden Gems
 * Handles preferences, selected gems, and journey state across pages
 */

window.HiddenGemsData = window.HiddenGemsData || {
  // User preferences storage
  preferences: {
    save: function(data) {
      localStorage.setItem('hiddenGems_preferences', JSON.stringify(data));
    },
    
    get: function() {
      const savedPrefs = localStorage.getItem('hiddenGems_preferences');
      return savedPrefs ? JSON.parse(savedPrefs) : {
        activities: [],
        amenities: [],
        accessibility: [],
        effortLevel: '',
        detourTime: 60,
        maxDetour: 15,
        selectedGems: [],
        origin: null,
        destination: null
      };
    },
    
    // Update specific preference value
    update: function(key, value) {
      const prefs = this.get();
      prefs[key] = value;
      this.save(prefs);
      return prefs;
    }
  },
  
  // Selected gems management
  selectedGems: {
    add: function(gemId) {
      const prefs = HiddenGemsData.preferences.get();
      if (!prefs.selectedGems) prefs.selectedGems = [];
      if (!prefs.selectedGems.includes(gemId.toString())) {
        prefs.selectedGems.push(gemId.toString());
        HiddenGemsData.preferences.save(prefs);
        return true;
      }
      return false;
    },
    
    remove: function(gemId) {
      const prefs = HiddenGemsData.preferences.get();
      if (!prefs.selectedGems) return false;
      
      const index = prefs.selectedGems.indexOf(gemId.toString());
      if (index !== -1) {
        prefs.selectedGems.splice(index, 1);
        HiddenGemsData.preferences.save(prefs);
        return true;
      }
      return false;
    },
    
    toggle: function(gemId) {
      const prefs = HiddenGemsData.preferences.get();
      if (!prefs.selectedGems) prefs.selectedGems = [];
      
      const gemIdStr = gemId.toString();
      const index = prefs.selectedGems.indexOf(gemIdStr);
      
      if (index === -1) {
        // Add to selected gems
        prefs.selectedGems.push(gemIdStr);
        HiddenGemsData.preferences.save(prefs);
        return true; // Added
      } else {
        // Remove from selected gems
        prefs.selectedGems.splice(index, 1);
        HiddenGemsData.preferences.save(prefs);
        return false; // Removed
      }
    },
    
    isSelected: function(gemId) {
      const prefs = HiddenGemsData.preferences.get();
      return prefs.selectedGems && prefs.selectedGems.includes(gemId.toString());
    },
    
    getAll: function() {
      const prefs = HiddenGemsData.preferences.get();
      return prefs.selectedGems || [];
    },
    
    count: function() {
      return this.getAll().length;
    },
    
    clear: function() {
      const prefs = HiddenGemsData.preferences.get();
      prefs.selectedGems = [];
      HiddenGemsData.preferences.save(prefs);
    }
  },
  
  // Gems data storage and loading
  gemsData: {
    // Save the full list of gems to localStorage
    save: function(gems) {
      localStorage.setItem('hiddenGems_gems', JSON.stringify(gems));
    },
    
    // Get all stored gems
    getAll: function() {
      const savedGems = localStorage.getItem('hiddenGems_gems');
      return savedGems ? JSON.parse(savedGems) : [];
    },
    
    // Get a specific gem by ID
    getById: function(gemId) {
      const gems = this.getAll();
      return gems.find(g => (g.id || g.index).toString() === gemId.toString());
    },
    
    // Get all selected gems as full objects
    getSelected: function() {
      const selectedIds = HiddenGemsData.selectedGems.getAll();
      const allGems = this.getAll();
      
      return selectedIds.map(id => 
        allGems.find(g => (g.id || g.index).toString() === id)
      ).filter(g => g !== undefined);
    },
    
    // Add a user-submitted gem
    addUserGem: function(gem) {
      // Get user-added gems
      const userGems = JSON.parse(localStorage.getItem('userGems') || '[]');
      
      // Add an ID if missing
      if (!gem.id) {
        gem.id = 'user-' + Date.now();
      }
      
      // Add the new gem
      userGems.push(gem);
      
      // Save back to localStorage
      localStorage.setItem('userGems', JSON.stringify(userGems));
      
      // Update the combined gems
      const allGems = this.getAll();
      allGems.push(gem);
      this.save(allGems);
      
      return gem.id;
    }
  },
  
  // User trip/journey tracking
  tripState: {
    save: function(state) {
      localStorage.setItem('hiddenGems_tripState', JSON.stringify(state));
    },
    
    get: function() {
      const savedState = localStorage.getItem('hiddenGems_tripState');
      return savedState ? JSON.parse(savedState) : {
        currentStep: 'browse', // browse, planning, traveling, arrived
        lastGemVisited: null,
        currentRoute: null,
        progress: 0, // 0-100 percentage of journey completed
        timeRemaining: null // Time remaining in minutes
      };
    },
    
    update: function(key, value) {
      const state = this.get();
      state[key] = value;
      this.save(state);
      return state;
    },
    
    setProgress: function(percent) {
      const state = this.get();
      state.progress = Math.min(100, Math.max(0, percent));
      this.save(state);
      return state;
    },
    
    advanceToNextGem: function() {
      // Logic to move to the next gem in the journey
      const state = this.get();
      const selected = HiddenGemsData.gemsData.getSelected();
      
      if (selected.length === 0) return state;
      
      let nextIndex = 0;
      if (state.lastGemVisited) {
        const currentIndex = selected.findIndex(g => 
          (g.id || g.index).toString() === state.lastGemVisited.toString());
        nextIndex = (currentIndex + 1) % selected.length;
      }
      
      state.lastGemVisited = (selected[nextIndex].id || selected[nextIndex].index).toString();
      state.progress = (nextIndex + 1) * 100 / selected.length;
      
      this.save(state);
      return state;
    }
  },
  
  // Statistics for user exploration and achievement
  stats: {
    increment: function(statName) {
      const stats = this.getAll();
      stats[statName] = (stats[statName] || 0) + 1;
      localStorage.setItem('hiddenGems_stats', JSON.stringify(stats));
      return stats[statName];
    },
    
    getAll: function() {
      const savedStats = localStorage.getItem('hiddenGems_stats');
      return savedStats ? JSON.parse(savedStats) : {
        gemsDiscovered: 0,
        tripsCompleted: 0,
        hiddenGemsFound: 0,
        totalDistance: 0,
        lastActive: new Date().toISOString()
      };
    },
    
    recordGemVisit: function(gemId) {
      // Record that user has visited this gem
      const visitedGems = JSON.parse(localStorage.getItem('hiddenGems_visited') || '[]');
      
      if (!visitedGems.includes(gemId.toString())) {
        visitedGems.push(gemId.toString());
        localStorage.setItem('hiddenGems_visited', JSON.stringify(visitedGems));
        
        // Increment stats
        this.increment('gemsDiscovered');
        
        // Check if it's a hidden gem
        const gem = HiddenGemsData.gemsData.getById(gemId);
        if (gem && (gem.isHidden || gem.popularity < 2)) {
          this.increment('hiddenGemsFound');
        }
        
        return true;
      }
      return false;
    },
    
    isGemVisited: function(gemId) {
      const visitedGems = JSON.parse(localStorage.getItem('hiddenGems_visited') || '[]');
      return visitedGems.includes(gemId.toString());
    }
  },
  
  // Utility functions
  utils: {
    // Generate a URL with data for the next page
    generateDataUrl: function(url, data) {
      const encodedData = encodeURIComponent(JSON.stringify(data));
      return `${url}?data=${encodedData}`;
    },
    
    // Get data from URL
    getDataFromUrl: function() {
      const urlParams = new URLSearchParams(window.location.search);
      const encodedData = urlParams.get('data');
      
      if (!encodedData) return null;
      
      try {
        return JSON.parse(decodeURIComponent(encodedData));
      } catch (err) {
        console.error('Error parsing URL data:', err);
        return null;
      }
    },
    
    // Calculate distance between coordinates
    calculateDistance: function(lat1, lon1, lat2, lon2) {
      const R = 3958.8; // Earth's radius in miles
      const dLat = this._toRadians(lat2 - lat1);
      const dLon = this._toRadians(lon2 - lon1);
      
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this._toRadians(lat1)) * Math.cos(this._toRadians(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    },
    
    // Helper function for distance calculation
    _toRadians: function(degrees) {
      return degrees * Math.PI / 180;
    }
  }
};

// Add to the end of data-controller.js

// Gem loading functionality from gems-loader.js
window.HiddenGemsData.loadGems = function(options = {}) {
  // Show loading animation
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
  loadingEl.innerHTML = 'Loading gems...';
  document.body.appendChild(loadingEl);
  
  // Default settings
  const defaultOptions = {
    center: [-122.2730, 37.8715], // Berkeley
    radius: 30, // miles
    limit: 10,
    random: true
  };
  
  options = { ...defaultOptions, ...options };
  
  // First try to load from user-added gems in localStorage
  const userGems = JSON.parse(localStorage.getItem('userGems') || '[]');
  
  // Then load from the JSON file
  fetch('static/assets/data/hidden_gems.json')
    .then(response => response.json())
    .then(jsonGems => {
      // Combine user gems with JSON gems
      const allGems = [...jsonGems, ...userGems];
      
      // Filter gems by distance from center if specified
      let filteredGems = allGems;
      
      if (options.center) {
        filteredGems = allGems.filter(gem => {
          const coords = gem.coords || gem.coordinates;
          if (!coords || coords.length !== 2) return false;
          
          // Calculate distance from center
          const distance = HiddenGemsData.utils.calculateDistance(
            options.center[1], options.center[0],
            coords[1], coords[0]
          );
          
          // Add distance to gem object for display
          gem.distance = Math.round(distance * 10) / 10;
          
          // Include if within radius
          return distance <= options.radius;
        });
      }
      
      // Add ID if missing
      filteredGems = filteredGems.map((gem, index) => {
        if (!gem.id) {
          gem.id = `gem-${index}`;
        }
        return gem;
      });
      
      // Randomize if requested
      if (options.random) {
        filteredGems = HiddenGemsData.utils.shuffleArray(filteredGems);
      }
      
      // Limit the number of gems
      if (options.limit && options.limit > 0) {
        filteredGems = filteredGems.slice(0, options.limit);
      }
      
      // Save to data controller
      HiddenGemsData.gemsData.save(filteredGems);
      
      // Dispatch event
      document.dispatchEvent(new CustomEvent('gemsLoaded', {
        detail: { gems: filteredGems }
      }));
      
      // Hide loading
      loadingEl.remove();
    })
    .catch(error => {
      console.error('Error loading gems:', error);
      loadingEl.remove();
      
      // Show error message
      alert('Error loading gems. Please try again.');
    });
};

// Shuffle gems function
window.HiddenGemsData.shuffleGems = function() {
  window.HiddenGemsData.loadGems({
    random: true
  });
};

// Find nearby gems function
window.HiddenGemsData.findNearbyGems = function() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = [position.coords.longitude, position.coords.latitude];
        window.HiddenGemsData.loadGems({
          center: userLocation,
          radius: 10,
          limit: 10
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        window.HiddenGemsData.loadGems(); // Use default location
      }
    );
  } else {
    window.HiddenGemsData.loadGems(); // Use default location
  }
};

// Make these functions globally available
window.loadGems = window.HiddenGemsData.loadGems;
window.shuffleGems = window.HiddenGemsData.shuffleGems;
window.findNearbyGems = window.HiddenGemsData.findNearbyGems;
// Make the data controller available globally
window.HiddenGemsData = HiddenGemsData;