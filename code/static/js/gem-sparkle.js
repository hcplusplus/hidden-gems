/**
 * active-gem-indicator.js
 * Complete solution for highlighting the active gem on the map
 * with clear visual indication and animations
 */

// Make sure namespace exists
window.HiddenGems = window.HiddenGems || {};

/**
 * ActiveGemIndicator
 * Provides clear visual indication of which gem on the map is currently active
 */
window.HiddenGems.activeGemIndicator = {
  // Configuration
  config: {
    // Pulse animation duration in milliseconds
    pulseDuration: 1500,
    
    // Size increase factor for the active marker
    sizeIncreaseFactor: 1.4,
    
    // Z-index for active marker to ensure it's on top
    activeZIndex: 1000,
    
    // CSS class for the active marker
    activeMarkerClass: 'active-gem-marker',
    
    // Map marker selector (adjust if needed based on your implementation)
    markerSelector: '.maplibregl-marker',
    
    // Gem icon selector (adjust if needed)
    gemIconSelector: 'img',
    
    // Active card label
    showActiveLabel: true,
    activeLabel: 'ACTIVE',
    
    // Custom colors
    pulseColor: '#4285F4', // Google blue
    accentColor: '#4285F4',
    
    // Scroll active gem into view on map
    scrollIntoView: true
  },
  
  /**
   * Initialize the active gem indicator
   */
  initialize: function() {
    console.log('Initializing active gem indicator');
    
    // Add necessary styles for the active gem indicator
    this.addStyles();
    
    // Hook into various gem selection events
    this.hookIntoGemSelection();
    
    // Process any already active gem
    this.processExistingActiveGem();
  },
  
  /**
   * Add the necessary styles for the active gem indicator
   */
  addStyles: function() {
    const style = document.createElement('style');
    style.textContent = `
      /* Active gem marker with pulsing effect */
      .${this.config.activeMarkerClass} {
        transform: scale(${this.config.sizeIncreaseFactor});
        z-index: ${this.config.activeZIndex} !important;
        animation: gem-pulse ${this.config.pulseDuration}ms infinite;
        filter: drop-shadow(0 0 8px ${this.config.pulseColor});
      }
      
      /* Marker icon within active gem marker */
      .${this.config.activeMarkerClass} ${this.config.gemIconSelector} {
        border: 2px solid ${this.config.accentColor};
        border-radius: 50%;
        box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3);
      }
      
      /* Pulse animation for active gem marker */
      @keyframes gem-pulse {
        0% {
          filter: drop-shadow(0 0 3px rgba(66, 133, 244, 0.6));
        }
        50% {
          filter: drop-shadow(0 0 12px rgba(66, 133, 244, 0.9));
        }
        100% {
          filter: drop-shadow(0 0 3px rgba(66, 133, 244, 0.6));
        }
      }
      
      /* Enhanced active card indication */
      .gem-card.active .card-wrapper,
      .gem-card.active {
        box-shadow: 0 -4px 20px rgba(66, 133, 244, 0.3);
      }
      
      /* Active card accent */
      .gem-card.active .card-accent,
      .gem-card.active::before {
        height: 6px;
        background: linear-gradient(to right, #4285F4, #34A853);
        box-shadow: 0 0 10px rgba(66, 133, 244, 0.5);
      }
      
      /* Active label on card */
      .gem-card.active::after {
        content: "${this.config.activeLabel}";
        position: absolute;
        top: 10px;
        right: 10px;
        background: ${this.config.accentColor};
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 3px 8px;
        border-radius: 10px;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        opacity: ${this.config.showActiveLabel ? 1 : 0};
      }
      
      /* For card containers without a card-accent */
      .gem-card.active:not(:has(.card-accent))::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 6px;
        background: linear-gradient(to right, #4285F4, #34A853);
        border-radius: 16px 16px 0 0;
        z-index: 5;
      }
    `;
    document.head.appendChild(style);
  },
  
  /**
   * Hook into various gem selection events
   */
  hookIntoGemSelection: function() {
    // Listen for marker clicks on the map
    document.addEventListener('click', (e) => {
      // Find closest marker ancestor if any
      const marker = e.target.closest(this.config.markerSelector);
      if (marker) {
        // Wait a moment for the application to update its state
        setTimeout(() => {
          this.updateActiveGemVisibility();
        }, 100);
      }
    });
    
    // Listen for card selection
    document.addEventListener('click', (e) => {
      // Find closest card ancestor if any
      const card = e.target.closest('.gem-card');
      if (card) {
        // Wait a moment for the application to update its state
        setTimeout(() => {
          this.updateActiveGemVisibility();
        }, 100);
      }
    });
    
    // Listen for dot indicator clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('dot')) {
        // Wait a moment for the application to update its state
        setTimeout(() => {
          this.updateActiveGemVisibility();
        }, 100);
      }
    });
    
    // Listen for custom events that might indicate gem selection
    document.addEventListener('gemSelected', (e) => {
      if (e.detail && (e.detail.gemId || e.detail.index !== undefined)) {
        setTimeout(() => {
          this.updateActiveGemVisibility();
        }, 100);
      }
    });
    
    // Also hook into swipe events by observing class changes
    this.observeCardChanges();
  },
  
  /**
   * Observe card class changes to detect active card changes
   */
  observeCardChanges: function() {
    // Create mutation observer
    const observer = new MutationObserver((mutations) => {
      let activeCardChanged = false;
      
      // Check for active class changes
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'class' &&
            (mutation.target.classList.contains('gem-card') || 
             mutation.target.classList.contains('card-wrapper'))) {
          activeCardChanged = true;
        }
      });
      
      // If active card changed, update visibility
      if (activeCardChanged) {
        this.updateActiveGemVisibility();
      }
    });
    
    // Start observing
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true
    });
  },
  
  /**
   * Process any existing active gem on initialization
   */
  processExistingActiveGem: function() {
    // Wait for the DOM to be fully loaded
    setTimeout(() => {
      this.updateActiveGemVisibility();
    }, 500);
  },
  
  /**
   * Find the active gem card
   * @returns {HTMLElement|null} The active card element or null if not found
   */
  findActiveCard: function() {
    // Try to find active card
    let activeCard = document.querySelector('.gem-card.active');
    
    // If not found, try alternatives
    if (!activeCard) {
      // Try to find by display style
      document.querySelectorAll('.gem-card').forEach(card => {
        if (card.style.display !== 'none') {
          activeCard = card;
        }
      });
    }
    
    return activeCard;
  },
  
  /**
   * Find marker by various methods
   * @param {string} gemId - Gem ID to search for
   * @param {string|number} activeIndex - Index to search for
   * @returns {HTMLElement|null} The marker element or null if not found
   */
  findMarker: function(gemId, activeIndex) {
    let activeMarker = null;
    
    // Try to find marker by gem ID first
    if (gemId) {
      document.querySelectorAll(this.config.markerSelector).forEach(marker => {
        const markerGemId = marker.getAttribute('data-gem-id');
        if (markerGemId === gemId) {
          activeMarker = marker;
        }
      });
    }
    
    // If not found and we have an active index, try by index
    if (!activeMarker && activeIndex !== null) {
      document.querySelectorAll(this.config.markerSelector).forEach(marker => {
        const markerIndex = marker.getAttribute('data-index');
        if (markerIndex === activeIndex.toString()) {
          activeMarker = marker;
        }
      });
    }
    
    // If still not found, try to infer from global state (fallback)
    if (!activeMarker) {
      // Try to get active index from global state
      const globalIndex = window.activeGemIndex || 
                         (window.HiddenGems && window.HiddenGems.map && 
                          window.HiddenGems.map.activeGemIndex);
      
      if (globalIndex !== undefined) {
        // Find marker by index
        document.querySelectorAll(this.config.markerSelector).forEach(marker => {
          const markerIndex = marker.getAttribute('data-index');
          if (markerIndex == globalIndex) { // Use loose equality for string/number comparison
            activeMarker = marker;
          }
        });
      }
    }
    
    return activeMarker;
  },
  
  /**
   * Update the visibility of the active gem
   */
  updateActiveGemVisibility: function() {
    // Find active card
    const activeCard = this.findActiveCard();
    if (!activeCard) {
      console.log('No active card found');
      return;
    }
    
    // Get gem ID and index from the active card
    const gemId = activeCard.getAttribute('data-gem-id');
    const activeIndex = activeCard.getAttribute('data-index');
    
    console.log(`Active card found: gemId=${gemId}, index=${activeIndex}`);
    
    // Remove active class from all markers
    document.querySelectorAll(this.config.markerSelector).forEach(marker => {
      marker.classList.remove(this.config.activeMarkerClass);
    });
    
    // Find corresponding marker
    const activeMarker = this.findMarker(gemId, activeIndex);
    
    // If we found the active marker, highlight it
    if (activeMarker) {
      activeMarker.classList.add(this.config.activeMarkerClass);
      
      // Ensure it's visible on the map if requested
      if (this.config.scrollIntoView) {
        // If map is available, try to center on the marker
        if (window.map && typeof window.map.flyTo === 'function' && 
            activeMarker._lngLat && activeMarker._lngLat.lng && activeMarker._lngLat.lat) {
          window.map.flyTo({
            center: [activeMarker._lngLat.lng, activeMarker._lngLat.lat],
            zoom: window.map.getZoom(),
            duration: 500
          });
        }
        // For MapLibre GL JS
        else if (window.map && typeof window.map.easeTo === 'function' && 
                activeMarker._lngLat && activeMarker._lngLat.lng && activeMarker._lngLat.lat) {
          window.map.easeTo({
            center: [activeMarker._lngLat.lng, activeMarker._lngLat.lat],
            duration: 500
          });
        }
        // Alternative: use the highlightGemMarker function if available
        else if (typeof window.highlightGemMarker === 'function' && activeIndex) {
          // Don't update cards to avoid recursion - just ensure marker is visible
          window.highlightGemMarker(parseInt(activeIndex), true);
        }
      }
      
      console.log('Active gem marker highlighted');
    } else {
      console.warn('Could not find corresponding marker for active card');
    }
  },
  
  /**
   * Highlight a specific gem by ID or index
   * @param {string|null} gemId - Gem ID to highlight
   * @param {number|null} index - Index to highlight
   */
  highlightGem: function(gemId, index) {
    // Remove active class from all cards
    document.querySelectorAll('.gem-card').forEach(card => {
      card.classList.remove('active');
    });
    
    // Find and activate the card
    let cardToActivate = null;
    
    if (gemId) {
      cardToActivate = document.querySelector(`.gem-card[data-gem-id="${gemId}"]`);
    }
    
    if (!cardToActivate && index !== null && index !== undefined) {
      cardToActivate = document.querySelector(`.gem-card[data-index="${index}"]`);
    }
    
    if (cardToActivate) {
      cardToActivate.classList.add('active');
    }
    
    // Update marker visibility
    this.updateActiveGemVisibility();
  }
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize active gem indicator
  window.HiddenGems.activeGemIndicator.initialize();
  
  // Make the highlightGem function available globally
  window.highlightGem = function(gemId, index) {
    window.HiddenGems.activeGemIndicator.highlightGem(gemId, index);
  };
});