/**
 * User preferences management for the Hidden Gems application
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
        const savedPrefs = localStorage.getItem('hiddenGemsPreferences');
        
        if (savedPrefs) {
            try {
                this._userPreferences = JSON.parse(savedPrefs);
            } catch (e) {
                console.error('Failed to parse saved preferences');
                this._userPreferences = { ...HiddenGems.data.defaultPreferences };
            }
        } else {
            // Use default preferences if none saved
            this._userPreferences = { ...HiddenGems.data.defaultPreferences };
        }
    },
    
    /**
     * Save user preferences to localStorage
     * @param {Object} preferences - Preferences object to save
     */
    saveUserPreferences: function(preferences) {
        this._userPreferences = preferences;
        localStorage.setItem('hiddenGemsPreferences', JSON.stringify(preferences));
    },
    
    /**
     * Setup preferences UI event handlers
     * @private
     */
    _setupPreferencesUI: function() {
        const profileButton = document.getElementById('profile-button');
        const preferencesOverlay = document.querySelector('.preferences-overlay');
        const preferencesPanel = document.querySelector('.preferences-panel');
        const closeButton = document.querySelector('.close-preferences');
        const saveButton = document.querySelector('.save-preferences-btn');
        
        // Show preferences when profile button is clicked
        profileButton.addEventListener('click', () => {
            // Update UI with current preferences
            this._updatePreferencesUI();
            
            preferencesOverlay.style.display = 'block';
            setTimeout(() => {
                preferencesPanel.classList.add('active');
            }, 50);
        });
        
        // Close preferences when close button is clicked
        closeButton.addEventListener('click', () => {
            preferencesPanel.classList.remove('active');
            setTimeout(() => {
                preferencesOverlay.style.display = 'none';
            }, 300);
        });
        
        // Save preferences when save button is clicked
        saveButton.addEventListener('click', () => {
            // Collect preferences from UI
            const updatedPreferences = this._collectPreferencesFromUI();
            
            // Save to localStorage
            this.saveUserPreferences(updatedPreferences);
            
            // Apply filters
            HiddenGems.cards.applyPreferenceFilters();
            
            // Show success message and close panel
            alert('Preferences saved! Your recommendations will now be more personalized.');
            
            preferencesPanel.classList.remove('active');
            setTimeout(() => {
                preferencesOverlay.style.display = 'none';
            }, 300);
        });
        
        // Initialize sliders
        this._initSliders();
    },
    
    /**
     * Initialize preference sliders
     * @private
     */
    _initSliders: function() {
        const detourSlider = document.getElementById('detour-time-slider');
        const detourValue = document.getElementById('detour-time-value');
        
        detourSlider.addEventListener('input', function() {
            const value = this.value;
            detourValue.textContent = `${value} min`;
        });
        
        const popularitySlider = document.getElementById('popularity-slider');
        const popularityValue = document.getElementById('popularity-value');
        
        popularitySlider.addEventListener('input', () => {
            const value = popularitySlider.value;
            this._updatePopularityLabel(value);
        });
    },
    
    /**
     * Update popularity label based on slider value
     * @param {string|number} value - Slider value
     * @private
     */
    _updatePopularityLabel: function(value) {
        const popularityValue = document.getElementById('popularity-value');
        const labels = {
            '1': 'Only Hidden Gems',
            '2': 'Mostly Hidden',
            '3': 'Balanced',
            '4': 'Some Popular',
            '5': 'Popular Spots'
        };
        
        popularityValue.textContent = labels[value] || 'Balanced';
    },
    
    /**
     * Update preferences UI with current preferences
     * @private
     */
    _updatePreferencesUI: function() {
        const prefs = this.getUserPreferences();
        
        // Update activities checkboxes
        document.querySelectorAll('.preference-checkbox[data-preference="activities"]').forEach(checkbox => {
            checkbox.checked = prefs.activities.includes(checkbox.value);
        });
        
        // Update accessibility checkboxes
        document.querySelectorAll('.preference-checkbox[data-preference="accessibility"]').forEach(checkbox => {
            checkbox.checked = prefs.accessibility.includes(checkbox.value);
        });
        
        // Update sliders
        const detourSlider = document.getElementById('detour-time-slider');
        const detourValue = document.getElementById('detour-time-value');
        
        detourSlider.value = prefs.detourTime;
        detourValue.textContent = `${prefs.detourTime} min`;
        
        const popularitySlider = document.getElementById('popularity-slider');
        
        popularitySlider.value = prefs.popularity;
        this._updatePopularityLabel(prefs.popularity);
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
        
        // Collect slider values
        const detourSlider = document.getElementById('detour-time-slider');
        const popularitySlider = document.getElementById('popularity-slider');
        
        prefs.detourTime = parseInt(detourSlider.value);
        prefs.popularity = parseInt(popularitySlider.value);
        
        return prefs;
    }
};

// Export the namespace
window.HiddenGems = HiddenGems;