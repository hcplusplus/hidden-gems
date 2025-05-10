// Update card-controller.js with single-gem selection logic
window.HiddenGems.cards = {
  // Track the currently selected gem
  selectedGemId: null,
  
  // Initialize card functionality
  initialize: function() {
    this.createCards();
    this.initSwipeListener();
  },
  
  // Create gem cards
  createCards: function() {
    const gems = HiddenGems.data.gems;
    if (!gems || !gems.length) {
      console.error('No gems data available for creating cards');
      return;
    }
    
    // Get containers
    const cardsContainer = document.querySelector('.cards-container');
    const swipeIndicator = document.querySelector('.swipe-indicator');
    
    // Clear existing content
    cardsContainer.innerHTML = '';
    swipeIndicator.innerHTML = '';
    
    // Create cards and indicators
    gems.forEach((gem, index) => {
      // Create card
      const card = document.createElement('div');
      card.id = `card-${index}`;
      card.className = 'gem-card';
      
      // Determine if this gem is selected
      const isSelected = gem.id === this.selectedGemId;
      
      // Set card content
      card.innerHTML = `
        <div class="card-header">
          <img class="card-image" src="${gem.image || 'static/images/default-gem.jpg'}" alt="${gem.name}">
          <div class="card-title-section">
            <div class="card-title">${gem.name}</div>
            <div class="card-subtitle">${gem.region || gem.location || 'Northern California'}</div>
          </div>
        </div>
        <div class="card-description">
          ${gem.description || 'A hidden gem waiting to be explored.'}
        </div>
        <div class="card-actions">
          <button class="explore-now-btn ${isSelected ? 'selected' : ''}" 
                  onclick="HiddenGems.cards.toggleGemSelection('${gem.id}', this)">
            ${isSelected ? 'Selected for Trip' : 'Select This Gem'}
          </button>
        </div>
      `;
      
      // Add to container (hidden initially)
      card.style.display = 'none';
      cardsContainer.appendChild(card);
      
      // Create indicator dot
      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.dataset.index = index;
      dot.addEventListener('click', () => this.updateCardPositions(index));
      swipeIndicator.appendChild(dot);
    });
    
    // Show first card
    this.updateCardPositions(0);
  },
  
  // Toggle gem selection (only one gem can be selected)
  toggleGemSelection: function(gemId, buttonEl) {
    console.log('Toggling gem selection for:', gemId);
    
    // If already selected, deselect it
    if (this.selectedGemId === gemId) {
      this.selectedGemId = null;
      
      // Update button
      if (buttonEl) {
        buttonEl.textContent = 'Select This Gem';
        buttonEl.classList.remove('selected');
      }
      
      // Update any other existing buttons for this gem
      document.querySelectorAll('.explore-now-btn').forEach(btn => {
        if (btn !== buttonEl && btn.dataset.gemId === gemId) {
          btn.textContent = 'Select This Gem';
          btn.classList.remove('selected');
        }
      });
      
      // Show deselection notification
      this._showNotification(gemId, 'Removed from your trip');
    } 
    // Select this gem, deselect any others
    else {
      // Get old selected gem for notification
      const oldSelectedId = this.selectedGemId;
      
      // Update to new selected gem
      this.selectedGemId = gemId;
      
      // Update all buttons to reflect the change
      document.querySelectorAll('.explore-now-btn').forEach(btn => {
        const btnGemId = btn.dataset.gemId || btn.getAttribute('onclick').match(/'([^']+)'/)[1];
        
        if (btnGemId === gemId) {
          // This gem is now selected
          btn.textContent = 'Selected for Trip';
          btn.classList.add('selected');
        } else {
          // Other gems are not selected
          btn.textContent = 'Select This Gem';
          btn.classList.remove('selected');
        }
      });
      
      // Show selection notification
      this._showNotification(gemId, 'Added to your trip');
    }
    
    // Save selection to preferences
    this._saveSelection();
    
    // Update map marker to highlight selected gem
    this._updateMapMarkers();
    
    return this.selectedGemId === gemId;
  },
  
  // Update active card display
  updateCardPositions: function(newActiveIndex) {
    const gems = HiddenGems.data.gems;
    if (!gems || !gems.length) return;
    
    // Hide all cards
    document.querySelectorAll('.gem-card').forEach(card => {
      card.style.display = 'none';
      card.classList.remove('active');
    });
    
    // Show and highlight active card
    const activeCard = document.getElementById(`card-${newActiveIndex}`);
    if (activeCard) {
      activeCard.style.display = 'flex';
      activeCard.classList.add('active');
    }
    
    // Update active indicator dot
    document.querySelectorAll('.dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === newActiveIndex);
    });
    
    // Update map to center on this gem
    if (typeof window.highlightGemMarker === 'function') {
      window.highlightGemMarker(newActiveIndex);
    }
    
    // Update global active index
    if (HiddenGems.map) {
      HiddenGems.map.activeGemIndex = newActiveIndex;
    }
  },
  
  // Get the currently selected gem object
  getSelectedGem: function() {
    if (!this.selectedGemId) return null;
    
    const gems = HiddenGems.data.gems || [];
    return gems.find(gem => gem.id === this.selectedGemId);
  },
  
  // Initialize swipe listener
  initSwipeListener: function() {
    const cardsContainer = document.querySelector('.cards-container');
    if (!cardsContainer) return;
    
    let startX, startY;
    let isDragging = false;
    
    // Touch start
    cardsContainer.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
    });
    
    // Touch move
    cardsContainer.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      
      // Determine if horizontal swipe
      const diffX = startX - currentX;
      const diffY = startY - currentY;
      
      if (Math.abs(diffX) > Math.abs(diffY) * 2) {
        // Prevent page scrolling for horizontal swipes
        e.preventDefault();
      }
    });
    
    // Touch end
    cardsContainer.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      
      const endX = e.changedTouches[0].clientX;
      const diffX = startX - endX;
      
      // Threshold for swipe detection (50px)
      if (Math.abs(diffX) > 50) {
        const activeIndex = HiddenGems.map?.activeGemIndex || 0;
        const gemsCount = HiddenGems.data.gems?.length || 0;
        
        if (gemsCount > 0) {
          if (diffX > 0) {
            // Swipe left - next gem
            const nextIndex = (activeIndex + 1) % gemsCount;
            this.updateCardPositions(nextIndex);
          } else {
            // Swipe right - previous gem
            const prevIndex = (activeIndex - 1 + gemsCount) % gemsCount;
            this.updateCardPositions(prevIndex);
          }
        }
      }
      
      isDragging = false;
    });
  },
  
  // Display notification when gem selection changes
  _showNotification: function(gemId, message) {
    const gem = HiddenGems.data.gems.find(g => g.id === gemId);
    if (!gem) return;
    
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'gem-notification';
    notificationDiv.innerHTML = `
      <div class="notification-icon">💎</div>
      <div class="notification-content">
        <div class="notification-title">${gem.name}</div>
        <div class="notification-message">${message}</div>
      </div>
    `;
    
    document.body.appendChild(notificationDiv);
    
    // Show notification with animation
    setTimeout(() => {
      notificationDiv.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notificationDiv.classList.remove('show');
      setTimeout(() => {
        notificationDiv.remove();
      }, 500);
    }, 3000);
  },
  
  // Save selection to preferences
  _saveSelection: function() {
    // Save to data controller if available
    if (window.HiddenGemsData) {
      const prefs = window.HiddenGemsData.preferences.get();
      prefs.selectedGem = this.selectedGemId;
      window.HiddenGemsData.preferences.save(prefs);
    }
    
    // Also save to traditional preferences
    if (window.HiddenGems && window.HiddenGems.preferences) {
      const prefs = window.HiddenGems.preferences.getUserPreferences();
      prefs.selectedGem = this.selectedGemId;
      window.HiddenGems.preferences.saveUserPreferences(prefs);
    }
  },
  
  // Update map markers to show selected gem
  _updateMapMarkers: function() {
    if (!window.map || !window.markers) return;
    
    // Set all markers to normal style
    window.markers.forEach((marker, i) => {
      const el = marker.getElement();
      el.style.transform = 'scale(1.0)';
      el.style.zIndex = '1';
      el.style.boxShadow = 'none';
      
      // Check if this marker matches the selected gem
      const gem = HiddenGems.data.gems[i];
      if (gem && gem.id === this.selectedGemId) {
        // Highlight this marker
        el.style.transform = 'scale(1.3)';
        el.style.zIndex = '10';
        el.style.boxShadow = '0 0 0 4px rgba(66, 133, 244, 0.8)';
        
        // Add pulse animation if not present
        if (!el.querySelector('.pulse-effect')) {
          const pulse = document.createElement('div');
          pulse.className = 'pulse-effect';
          pulse.style.position = 'absolute';
          pulse.style.top = '0';
          pulse.style.left = '0';
          pulse.style.right = '0';
          pulse.style.bottom = '0';
          pulse.style.borderRadius = '50%';
          pulse.style.animation = 'pulse 2s infinite';
          el.appendChild(pulse);
          
          // Add pulse animation to the document if not present
          if (!document.getElementById('pulse-animation')) {
            const style = document.createElement('style');
            style.id = 'pulse-animation';
            style.textContent = `
              @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.6); }
                70% { box-shadow: 0 0 0 10px rgba(66, 133, 244, 0); }
                100% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0); }
              }
            `;
            document.head.appendChild(style);
          }
        }
      } else {
        // Remove pulse animation if present
        const pulse = el.querySelector('.pulse-effect');
        if (pulse) pulse.remove();
      }
    });
  },
  
  // Load selection from preferences on initialization
  loadSelection: function() {
    let selectedId = null;
    
    // Try to get from data controller
    if (window.HiddenGemsData) {
      const prefs = window.HiddenGemsData.preferences.get();
      selectedId = prefs.selectedGem;
    }
    
    // Fall back to traditional preferences
    if (!selectedId && window.HiddenGems && window.HiddenGems.preferences) {
      const prefs = window.HiddenGems.preferences.getUserPreferences();
      selectedId = prefs.selectedGem;
    }
    
    // Set selected gem
    if (selectedId) {
      this.selectedGemId = selectedId;
      
      // Update UI to reflect selection
      this._updateMapMarkers();
      
      // Update button states
      document.querySelectorAll('.explore-now-btn').forEach(btn => {
        const btnGemId = btn.dataset.gemId || btn.getAttribute('onclick').match(/'([^']+)'/)[1];
        btn.textContent = btnGemId === selectedId ? 'Selected for Trip' : 'Select This Gem';
        btn.classList.toggle('selected', btnGemId === selectedId);
      });
    }
  }
};