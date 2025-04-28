/**
 * Card management for the Hidden Gems application
 */

// Ensure namespace exists
var HiddenGems = window.HiddenGems || {};

// Cards sub-namespace
HiddenGems.cards = {
    /**
     * Create all gem cards
     */
    createCards: function() {
        const cardsContainer = document.querySelector('.cards-container');
        cardsContainer.innerHTML = '';
        
        const gems = HiddenGems.data.gems;
        const activeIndex = HiddenGems.map.activeGemIndex;
        
        // Create a card for each gem
        gems.forEach((gem, index) => {
            const card = document.createElement('div');
            card.className = 'gem-card';
            card.id = `card-${index}`;
            
            // Set initial position (active, prev, next)
            if (index === activeIndex) {
                card.classList.add('active');
            } else if (index === HiddenGems.utils.getPrevIndex(activeIndex, gems.length)) {
                card.classList.add('prev');
            } else if (index === HiddenGems.utils.getNextIndex(activeIndex, gems.length)) {
                card.classList.add('next');
            }
            
            // Emoji for card image
            const emojiMap = {
                'nature': '🌲',
                'food': '🍷',
                'cultural': '🏛️'
            };
            
            // Check if this gem has been visited
            const userPreferences = HiddenGems.preferences.getUserPreferences();
            const isVisited = userPreferences.visitedGems.includes(gem.id);
            
            // Card content
            card.innerHTML = `
                <div class="card-handle"></div>
                <div class="card-content">
                    <div class="card-image">${emojiMap[gem.category] || '📍'}</div>
                    <div class="card-details">
                        <h3 class="card-title">${gem.title}</h3>
                        <div class="card-address">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            <span>${gem.address}</span>
                        </div>
                        <div class="card-hours">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                                <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                            </svg>
                            <span>${gem.hours}</span>
                        </div>
                        <button class="add-to-trip-btn" data-gem-id="${gem.id}" ${isVisited ? 'style="background-color: #27ae60;"' : ''}>
                            ${isVisited ? 'Added to Itinerary' : 'Add to Itinerary'}
                        </button>
                    </div>
                </div>
            `;
            
            cardsContainer.appendChild(card);
        });
        
        // Add event listeners to all "Add to Itinerary" buttons
        document.querySelectorAll('.add-to-trip-btn').forEach(button => {
            button.addEventListener('click', function() {
                const gemId = this.getAttribute('data-gem-id');
                HiddenGems.cards.addGemToItinerary(gemId, this);
            });
        });
    },
    
    /**
     * Add a gem to the user's itinerary
     * @param {string} gemId - ID of the gem to add
     * @param {HTMLElement} buttonEl - Button element that was clicked
     */
    addGemToItinerary: function(gemId, buttonEl) {
        // Get current preferences
        const userPreferences = HiddenGems.preferences.getUserPreferences();
        
        // Check if gem is already in the itinerary
        if (!userPreferences.visitedGems.includes(gemId)) {
            // Add to visited gems
            userPreferences.visitedGems.push(gemId);
            
            // Update button style
            buttonEl.textContent = 'Added to Itinerary';
            buttonEl.style.backgroundColor = '#27ae60';
            
            // Save preferences
            HiddenGems.preferences.saveUserPreferences(userPreferences);
            
            // Check achievements
            HiddenGems.achievements.checkAndAwardAchievements();
        }
    },
    
    /**
     * Create swipe indicators (dots)
     */
    createSwipeIndicators: function() {
        const indicatorContainer = document.querySelector('.swipe-indicator');
        indicatorContainer.innerHTML = '';
        
        const gems = HiddenGems.data.gems;
        const activeIndex = HiddenGems.map.activeGemIndex;
        
        // Create a dot for each gem
        gems.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            if (index === activeIndex) {
                dot.classList.add('active');
            }
            indicatorContainer.appendChild(dot);
        });
    },
    
    /**
     * Update card positions based on active gem
     * @param {number} newActiveIndex - New active gem index
     */
    updateCardPositions: function(newActiveIndex) {
        const gems = HiddenGems.data.gems;
        const prevIndex = HiddenGems.utils.getPrevIndex(newActiveIndex, gems.length);
        const nextIndex = HiddenGems.utils.getNextIndex(newActiveIndex, gems.length);
        
        // Remove all position classes
        document.querySelectorAll('.gem-card').forEach(card => {
            card.classList.remove('active', 'prev', 'next');
        });
        
        // Add appropriate position classes
        document.getElementById(`card-${newActiveIndex}`).classList.add('active');
        document.getElementById(`card-${prevIndex}`).classList.add('prev');
        document.getElementById(`card-${nextIndex}`).classList.add('next');
        
        // Update active indicator dot
        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === newActiveIndex);
        });
    },
    
    /**
     * Apply filters to cards based on user preferences
     */
    applyPreferenceFilters: function() {
        const gems = HiddenGems.data.gems;
        const userPreferences = HiddenGems.preferences.getUserPreferences();
        
        // For each gem, check if it matches preferences
        gems.forEach((gem, index) => {
            const card = document.getElementById(`card-${index}`);
            
            // Skip if card doesn't exist
            if (!card) return;
            
            // Check if gem should be highlighted based on preferences
            const matchesActivities = userPreferences.activities.length === 0 || 
                gem.tags.some(tag => userPreferences.activities.includes(tag));
            
            const matchesAccessibility = userPreferences.accessibility.length === 0 || 
                gem.tags.some(tag => userPreferences.accessibility.includes(tag));
            
            const matchesDetourTime = parseInt(gem.detourTime) <= userPreferences.detourTime;
            
            const matchesPopularity = HiddenGems.utils.matchesPopularityPreference(
                gem.popularity, 
                userPreferences.popularity
            );
            
            // Apply styling based on match
            if (matchesActivities && matchesAccessibility && matchesDetourTime && matchesPopularity) {
                // Add a subtle highlight effect to the card
                card.style.borderLeft = `4px solid ${HiddenGems.utils.getCategoryColor(gem.category)}`;
            } else {
                card.style.borderLeft = 'none';
            }
        });
    }
};

// Export the namespace
window.HiddenGems = HiddenGems;