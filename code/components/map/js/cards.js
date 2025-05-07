/**
 * Cards component for displaying Berkeley Hidden Gems
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
        
        // Clear container
        if (!cardsContainer) {
            console.error('Cards container not found');
            return;
        }
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
            
            // Determine tier class and label
            let tierClass = '';
            let tierLabel = '';
            
            switch(gem.tier) {
                case 1:
                    tierClass = 'super-rare';
                    tierLabel = 'Super Rare Gem';
                    break;
                case 2:
                    tierClass = 'rare';
                    tierLabel = 'Rare Gem';
                    break;
                case 3:
                    tierClass = 'uncommon';
                    tierLabel = 'Uncommon Gem';
                    break;
            }
            
            // Check if this gem has been visited
            const userPreferences = HiddenGems.preferences.getUserPreferences();
            const isVisited = userPreferences.visitedGems.includes(gem.id);
            
            // Card content
            card.innerHTML = `
                <div class="card-handle"></div>
                <div class="card-content">
                    <div class="card-header">
                        <h3 class="card-title">${gem.is_unnamed ? 'Undiscovered Location' : gem.title}</h3>
                        <span class="gem-tier ${tierClass}">${tierLabel}</span>
                    </div>
                    <div class="card-image">
                        <div class="card-icon">${gem.icon}</div>
                    </div>
                    <div class="card-details">
                        <div class="card-detail">
                            <i class="card-icon">📍</i>
                            <span>${gem.address}</span>
                        </div>
                        <div class="card-detail">
                            <i class="card-icon">🕒</i>
                            <span>${gem.hours}</span>
                        </div>
                        <div class="card-detail">
                            <i class="card-icon">⏱️</i>
                            <span>Visit: ${gem.detourTime}</span>
                        </div>
                        <div class="card-tags">
                            ${gem.tags.slice(0, 3).map(tag => `<span class="card-tag">${tag}</span>`).join('')}
                        </div>
                        <button class="add-to-trip-btn" data-gem-id="${gem.id}" ${isVisited ? 'disabled' : ''}>
                            ${isVisited ? 'Added to Trip' : 'Add to Trip'}
                        </button>
                    </div>
                </div>
            `;
            
            cardsContainer.appendChild(card);
        });
        
        // Add event listeners to all "Add to Trip" buttons
        document.querySelectorAll('.add-to-trip-btn').forEach(button => {
            button.addEventListener('click', function() {
                const gemId = this.getAttribute('data-gem-id');
                HiddenGems.cards.addGemToTrip(gemId, this);
            });
        });
    },
    
    /**
     * Add a gem to the user's trip
     * @param {string} gemId - ID of the gem to add
     * @param {HTMLElement} buttonEl - Button element that was clicked
     */
    addGemToTrip: function(gemId, buttonEl) {
        // Get current preferences
        const userPreferences = HiddenGems.preferences.getUserPreferences();
        
        // Check if gem is already in the trip
        if (!userPreferences.visitedGems.includes(gemId)) {
            // Add to visited gems
            userPreferences.visitedGems.push(gemId);
            
            // Update button style
            buttonEl.textContent = 'Added to Trip';
            buttonEl.disabled = true;
            
            // Save preferences
            HiddenGems.preferences.saveUserPreferences(userPreferences);
            
            // Check achievements if available
            if (typeof HiddenGems.achievements !== 'undefined' && 
                typeof HiddenGems.achievements.checkAndAwardAchievements === 'function') {
                HiddenGems.achievements.checkAndAwardAchievements();
            }
            
            // Show achievement notification
            this._showAchievementNotification(gemId);
        }
    },
    
    /**
     * Show achievement notification
     * @param {string} gemId - ID of the gem that was added
     * @private
     */
    _showAchievementNotification: function(gemId) {
        // Find gem by ID
        const gem = HiddenGems.data.gems.find(g => g.id === gemId);
        
        if (!gem) return;
        
        // Find achievement notification element
        const notificationEl = document.querySelector('.achievement-notification');
        
        if (!notificationEl) return;
        
        // Set notification content
        notificationEl.innerHTML = `
            <div class="achievement-icon">💎</div>
            <div class="achievement-details">
                <div class="achievement-title">Gem Discovered!</div>
                <div class="achievement-description">
                    You've added ${gem.is_unnamed ? 'an undiscovered location' : gem.title} to your trip
                </div>
            </div>
        `;
        
        // Show notification
        notificationEl.classList.add('show');
        
        // Hide after delay
        setTimeout(() => {
            notificationEl.classList.remove('show');
        }, 3000);
    },
    
    /**
     * Create swipe indicators (dots)
     */
    createSwipeIndicators: function() {
        const indicatorContainer = document.querySelector('.swipe-indicator');
        
        if (!indicatorContainer) {
            console.error('Swipe indicator container not found');
            return;
        }
        
        indicatorContainer.innerHTML = '';
        
        const gems = HiddenGems.data.gems;
        const activeIndex = HiddenGems.map.activeGemIndex;
        
        // Don't show indicators if too many gems (more than 15)
        if (gems.length > 15) {
            // Just show current position text instead
            const positionText = document.createElement('div');
            positionText.className = 'position-text';
            positionText.textContent = `${activeIndex + 1} / ${gems.length}`;
            indicatorContainer.appendChild(positionText);
            return;
        }
        
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
            card.style.transform = 'none'; // Reset any transforms from swiping
        });
        
        // Add appropriate position classes
        const activeCard = document.getElementById(`card-${newActiveIndex}`);
        const prevCard = document.getElementById(`card-${prevIndex}`);
        const nextCard = document.getElementById(`card-${nextIndex}`);
        
        if (activeCard) activeCard.classList.add('active');
        if (prevCard) prevCard.classList.add('prev');
        if (nextCard) nextCard.classList.add('next');
        
        // Update active indicator dot
        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === newActiveIndex);
        });
        
        // Update position text if it exists
        const positionText = document.querySelector('.position-text');
        if (positionText) {
            positionText.textContent = `${newActiveIndex + 1} / ${gems.length}`;
        }
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
            
            // Parse detour time as minutes
            const detourMinutes = parseInt(gem.detourTime);
            const matchesDetourTime = isNaN(detourMinutes) || detourMinutes <= userPreferences.detourTime;
            
            // Use tier as popularity proxy
            // Lower tier = more hidden
            const matchesPopularity = 
                (userPreferences.popularity === 1 && gem.tier === 1) || // Only super rare
                (userPreferences.popularity === 2 && gem.tier <= 2) ||  // Rare and super rare
                (userPreferences.popularity === 3) ||                   // All gems
                (userPreferences.popularity === 4 && gem.tier >= 2) ||  // Common and rare
                (userPreferences.popularity === 5 && gem.tier === 3);   // Only common
            
            // Apply styling based on match
            if (matchesActivities && matchesAccessibility && matchesDetourTime && matchesPopularity) {
                // Add a subtle highlight effect to the card
                card.classList.add('preference-match');
            } else {
                card.classList.remove('preference-match');
            }
        });
    }
};

// Export the namespace
window.HiddenGems = HiddenGems;