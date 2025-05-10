/**
 * User preferences management for the Hidden Gems application
 * Compatible with data-controller.js
 */

// Ensure namespace exists
var HiddenGems = window.HiddenGems || {};

// Preferences sub-namespace
HiddenGems.preferences = {
    // Current user preferences
    _userPreferences: null,
    
    /**
     * Initialize user preferences
     */
    init: function() {
        // Load saved preferences
        this.loadUserPreferences();
        
        // Setup preferences UI
        this._setupPreferencesUI();
    },
    
    /**
     * Get current user preferences
     * @returns {Object} User preferences object
     */
    getUserPreferences: function() {
        // If preferences not loaded yet, load them
        if (!this._userPreferences) {
            this.loadUserPreferences();
        }
        
        return this._userPreferences;
    },
    
    /**
     * Load user preferences from localStorage
     */
    loadUserPreferences: function() {
        // First check if we have already loaded preferences from data controller
        if (window.HiddenGemsData && typeof window.HiddenGemsData.preferences === 'object') {
            try {
                this._userPreferences = window.HiddenGemsData.preferences.get();
                return;
            } catch (e) {
                console.warn('Failed to load preferences from data controller, falling back to local implementation');
            }
        }
        
        // Fall back to original method
        const savedPrefs = localStorage.getItem('hiddenGemsPreferences');
        
        if (savedPrefs) {
            try {
                this._userPreferences = JSON.parse(savedPrefs);
            } catch (e) {
                console.error('Failed to parse saved preferences');
                this._userPreferences = this._getDefaultPreferences();
            }
        } else {
            // Use default preferences if none saved
            this._userPreferences = this._getDefaultPreferences();
        }
        
        // Sync with data controller if available
        if (window.HiddenGemsData && typeof window.HiddenGemsData.preferences === 'object') {
            try {
                window.HiddenGemsData.preferences.save(this._userPreferences);
            } catch (e) {
                console.warn('Failed to sync preferences with data controller');
            }
        }
    },
    
    /**
     * Get default preferences
     * @returns {Object} Default preferences
     * @private
     */
    _getDefaultPreferences: function() {
        // Check if data namespace has defaults
        if (HiddenGems.data && HiddenGems.data.defaultPreferences) {
            return { ...HiddenGems.data.defaultPreferences };
        }
        
        // Otherwise use our own defaults
        return {
            activities: [],
            accessibility: [],
            detourTime: 60,
            popularity: 3,
            selectedGems: []
        };
    },
    
    /**
     * Save user preferences to localStorage
     * @param {Object} preferences - Preferences object to save
     */
    saveUserPreferences: function(preferences) {
        this._userPreferences = preferences;
        
        // Save to localStorage directly
        localStorage.setItem('hiddenGemsPreferences', JSON.stringify(preferences));
        
        // Also update data controller if available
        if (window.HiddenGemsData && typeof window.HiddenGemsData.preferences === 'object') {
            try {
                window.HiddenGemsData.preferences.save(preferences);
            } catch (e) {
                console.warn('Failed to save preferences to data controller');
            }
        }
    },
    
    /**
     * Setup preferences UI event handlers
     * @private
     */
    _setupPreferencesUI: function() {
        const preferencesOverlay = document.querySelector('.preferences-overlay');
        const preferencesPanel = document.querySelector('.preferences-panel');
        const saveButton = document.querySelector('.save-preferences-btn');
        
        // If UI elements aren't found, just return silently
        if (!preferencesOverlay || !preferencesPanel || !saveButton) {
            console.log('Preferences UI elements not found on this page');
            return;
        }
        
        // Save preferences when save button is clicked
        saveButton.addEventListener('click', () => {
            // Collect preferences from UI
            const updatedPreferences = this._collectPreferencesFromUI();
            
            // Save to localStorage and data controller
            this.saveUserPreferences(updatedPreferences);
            
            // Apply filters if function exists
            if (HiddenGems.cards && typeof HiddenGems.cards.applyPreferenceFilters === 'function') {
                HiddenGems.cards.applyPreferenceFilters();
            }
            
            // Show success message and close panel
            alert('Preferences saved! Your recommendations will now be more personalized.');
            
            preferencesPanel.classList.remove('active');
            setTimeout(() => {
                preferencesOverlay.style.display = 'none';
            }, 300);
        });
        
        // Initialize sliders if method exists
        if (typeof this._initSliders === 'function') {
            this._initSliders();
        }
    },
    
    /**
     * Initialize preference sliders
     * @private
     */
    _initSliders: function() {
        const detourSlider = document.getElementById('detour-time-slider');
        const detourValue = document.getElementById('detour-time-value');
        
        if (!detourSlider || !detourValue) {
            console.log('Slider elements not found on this page');
            return;
        }
        
        detourSlider.addEventListener('input', function() {
            const value = this.value;
            detourValue.textContent = `${value} min`;
        });
    },
    
    /**
     * Update preferences UI with current preferences
     * @private
     */
    _updatePreferencesUI: function() {
        const prefs = this.getUserPreferences();
        
        // Update activities checkboxes
        document.querySelectorAll('.preference-checkbox[data-preference="activities"]').forEach(checkbox => {
            checkbox.checked = prefs.activities && prefs.activities.includes(checkbox.value);
        });
        
        // Update accessibility checkboxes
        document.querySelectorAll('.preference-checkbox[data-preference="accessibility"]').forEach(checkbox => {
            checkbox.checked = prefs.accessibility && prefs.accessibility.includes(checkbox.value);
        });
        
        // Update sliders
        const detourSlider = document.getElementById('detour-time-slider');
        const detourValue = document.getElementById('detour-time-value');
        
        if (detourSlider && detourValue && prefs.detourTime) {
            detourSlider.value = prefs.detourTime;
            detourValue.textContent = `${prefs.detourTime} min`;
        }
        
        const popularitySlider = document.getElementById('popularity-slider');
        
        if (popularitySlider && prefs.popularity) {
            popularitySlider.value = prefs.popularity;
            
            if (typeof this._updatePopularityLabel === 'function') {
                this._updatePopularityLabel(prefs.popularity);
            }
        }
    },
    
    /**
     * Collect preferences from UI
     * @returns {Object} Updated preferences
     * @private
     */
    _collectPreferencesFromUI: function() {
        const prefs = { ...this.getUserPreferences() };
        
        // Collect activities preferences
        prefs.activities = [];
        document.querySelectorAll('.preference-checkbox[data-preference="activities"]:checked').forEach(checkbox => {
            prefs.activities.push(checkbox.value);
        });
        
        // Collect accessibility preferences
        prefs.accessibility = [];
        document.querySelectorAll('.preference-checkbox[data-preference="accessibility"]:checked').forEach(checkbox => {
            prefs.accessibility.push(checkbox.value);
        });
        
        // Collect slider values if they exist
        const detourSlider = document.getElementById('detour-time-slider');
        if (detourSlider) {
            prefs.detourTime = parseInt(detourSlider.value);
        }
        
        const popularitySlider = document.getElementById('popularity-slider');
        if (popularitySlider) {
            prefs.popularity = parseInt(popularitySlider.value);
        }
        
        return prefs;
    },
    
    // Debug helper function
    debug: function() {
        console.log('Current preferences:', this.getUserPreferences());
        
        // Check data controller status
        if (window.HiddenGemsData) {
            console.log('Data controller found');
            console.log('Data controller preferences:', window.HiddenGemsData.preferences.get());
        } else {
            console.log('Data controller not found');
        }
        
        // Check localStorage entries
        console.log('localStorage preferences:', localStorage.getItem('hiddenGemsPreferences'));
        console.log('HiddenGemsData preferences:', localStorage.getItem('hiddenGems_preferences'));
        
        return {
            preferences: this.getUserPreferences(),
            dataControllerFound: !!window.HiddenGemsData,
            dataControllerPrefs: window.HiddenGemsData ? window.HiddenGemsData.preferences.get() : null,
            localStoragePrefs: localStorage.getItem('hiddenGemsPreferences'),
            dataControllerStoragePrefs: localStorage.getItem('hiddenGems_preferences')
        };
    }
};

// Export the namespace
window.HiddenGems = HiddenGems;