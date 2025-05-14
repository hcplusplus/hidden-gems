/**
 * gem-cards.js - A simple, non-web-component implementation of gem cards
 * Handles card display, navigation, and map marker synchronization
 */

class GemCards {
  /**
   * Create a GemCards instance
   * @param {Object} options - Configuration options
   * @param {string} options.containerId - ID of the container element
   * @param {string} options.variant - Card variant ('index' or 'map-recs')
   * @param {Function} options.onCardChange - Callback when active card changes
   * @param {Function} options.onMarkerHighlight - Callback when marker should be highlighted
   * @param {Function} options.onExplore - Callback when explore button is clicked
   */
  constructor(options = {}) {
    // Store configuration options
    this.containerId = options.containerId || 'gem-cards-container';
    this.variant = options.variant || 'index';
    this.onCardChange = options.onCardChange || function () { };
    this.onMarkerHighlight = options.onMarkerHighlight || function () { };
    this.onExplore = options.onExplore || function () { };

    // Initialize state
    this.gems = [];
    this.activeIndex = 0;
    this.touchStartX = null;
    this.touchStartY = null;
    this.isDragging = false;
    this.currentX = null;
    this.swipeThreshold = 50;

    // References to DOM elements
    this.container = document.getElementById(this.containerId);
    this.wrapper = null;
    this.dotsContainer = null;

    // Trip distances data (for map-recs variant)
    this.tripDistances = {
      directDistance: null,
      detourDistance: null,
      addedDistance: null
    };

    // Map readiness state
    this.mapReady = false;
    this.pendingGems = null;

    // Initialize if container exists
    if (this.container) {
      this.init();
    } else {
      console.error(`GemCards: Container element with ID "${this.containerId}" not found`);
    }

    // Listen for map ready events
    document.addEventListener('mapReady', this.handleMapReady.bind(this));
  }

  /**
   * Handle map ready event
   */
  handleMapReady() {
    console.log('Map is ready, gem cards can now render');
    this.mapReady = true;

    // Process any pending operations
    if (this.pendingGems) {
      this.renderCards(this.pendingGems);
      this.pendingGems = null;
    }

    // Dispatch event that the cards are ready to interact with the map
    this.container.dispatchEvent(new CustomEvent('gem-cards-ready', {
      bubbles: true,
      detail: { gemCards: this }
    }));
  }

  /**
   * Initialize the gem cards
   */
  init() {
    // Clear container
    this.container.innerHTML = '';
    this.container.className = 'gem-cards-container';

    // Create card navigation dots
    this.dotsContainer = document.createElement('div');
    this.dotsContainer.className = 'card-nav-dots';
    this.container.appendChild(this.dotsContainer);

    // Create card wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'gem-cards-wrapper';

    // Apply variant class to wrapper
    if (this.variant) {
      this.wrapper.classList.add(`${this.variant}-variant`);
    }

    this.container.appendChild(this.wrapper);

    // Create navigation arrows
    const navArrows = document.createElement('div');
    navArrows.className = 'card-nav-arrows';
    navArrows.innerHTML = `
      <div class="nav-arrow prev-arrow">←</div>
      <div class="nav-arrow next-arrow">→</div>
    `;
    this.container.appendChild(navArrows);

    // Add event listeners for arrow navigation
    const prevArrow = navArrows.querySelector('.prev-arrow');
    const nextArrow = navArrows.querySelector('.next-arrow');

    prevArrow.addEventListener('click', () => this.showPrevCard());
    nextArrow.addEventListener('click', () => this.showNextCard());

    // Add touch/swipe event listeners
    this.wrapper.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.wrapper.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.wrapper.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Add keyboard navigation
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Check if map is already initialized
    if (window.map) {
      this.mapReady = true;
      console.log('Map already initialized');
    }

    // Dispatch ready event
    const event = new CustomEvent('gemCardsReady', { detail: { gemCards: this } });
    document.dispatchEvent(event);
  }

  /**
  * Set the variant (index or detail)
  * @param {string} variant - Card variant ('index' or 'detail', 'map-recs', etc.)
  */
  setVariant(variant) {
    this.variant = variant;

    if (this.wrapper) {
      // Remove any existing variant classes
      const variantClasses = Array.from(this.wrapper.classList)
        .filter(cls => cls.endsWith('-variant'));

      variantClasses.forEach(cls => {
        this.wrapper.classList.remove(cls);
      });

      // Add the new variant class
      this.wrapper.classList.add(`${variant}-variant`);
    }

    // Update existing cards if any
    if (this.wrapper) {
      const cards = this.wrapper.querySelectorAll('.gem-card');
      cards.forEach(card => {
        // Remove existing variant classes
        const variantClasses = Array.from(card.classList)
          .filter(cls => cls.endsWith('-variant'));

        variantClasses.forEach(cls => {
          card.classList.remove(cls);
        });

        // Add the new variant class
        card.classList.add(`${variant}-variant`);
      });
    }
  }

  /**
   * Load gems data
   * @param {Array} gems - Array of gem data objects
   */
  loadGems(gems) {
    if (!Array.isArray(gems) || gems.length === 0) {
      console.warn('GemCards: No gems data provided or empty array');
      return;
    }

    this.gems = gems;

    // If map is ready, render immediately
    if (this.mapReady) {
      this.renderCards(gems);
      this.showCard(0);
    } else {
      // Store for rendering when map is ready
      this.pendingGems = gems;
      console.log('Map not ready yet. Gems will be rendered when map is ready.');

      // Show a loading state
      this.showLoadingState();
    }
  }

  /**
   * Show loading state while waiting for map
   */
  showLoadingState() {
    if (!this.wrapper) return;

    this.wrapper.innerHTML = `
      <div class="gem-card active">
        <div class="loading-card">
          <div class="loading-spinner"></div>
          <p>Waiting for map to initialize...</p>
        </div>
      </div>
    `;
  }

  /**
   * Render all gem cards
   */
  renderCards(gems) {
    if (!this.wrapper || !gems || !gems.length) return;

    // Clear existing content
    this.wrapper.innerHTML = '';
    this.dotsContainer.innerHTML = '';

    // Store gems for future reference
    this.gems = gems;

    // Create cards for each gem
    gems.forEach((gem, index) => {
      const card = this.createCardElement(gem, index);
      this.wrapper.appendChild(card);
    });

    // Create navigation dots
    gems.forEach((gem, index) => {
      const dot = document.createElement('div');
      dot.className = 'nav-dot';
      dot.dataset.index = index;

      dot.addEventListener('click', () => {
        this.showCard(index);
      });

      this.dotsContainer.appendChild(dot);
    });

    // Also add to global namespace for compatibility
    if (window.HiddenGems) {
      window.HiddenGems.data = window.HiddenGems.data || {};
      window.HiddenGems.data.gems = gems;
    }

    // Dispatch event that gems are rendered
    this.container.dispatchEvent(new CustomEvent('gems-rendered', {
      bubbles: true,
      detail: { gems }
    }));
  }

  /**
   * Create a single card element
   * @param {Object} gem - Gem data object
   * @param {number} index - Index of the gem in the array
   * @returns {HTMLElement} Card element
   */
  createCardElement(gem, index) {
    const card = document.createElement('div');
    card.className = 'gem-card';

    // Apply variant class to the card
    if (this.variant) {
      card.classList.add(`${this.variant}-variant`);
    }

    card.dataset.index = index;
    card.dataset.gemId = gem.id || `gem-${index}`;

    // Determine gem color
    const gemColor = this.getGemColor(gem);

    // Set corresponding accent color
    const accentColor = gemColor === 'red' ? 'red-accent' :
      gemColor === 'purple' ? 'purple-accent' : 'blue-accent';

    // Create category tags
    const categoryTags = this.createCategoryTags(gem.category_1, gem.category_2, gem.category);

    // Format display values
    const priceDisplay = gem.dollar_sign || '';
    const timeDisplay = gem.time ? `${gem.time} min` : '';
    const distanceText = gem.distance ? `${gem.distance} miles away` : '';
    const address = gem.address || '';
    const openingHours = gem.opening_hours || '';

    // Set rarity class
    let rarityClass = '';
    if (gem.rarity) {
      if (gem.rarity.includes('most') || gem.rarity.includes('very')) {
        rarityClass = 'most-hidden';
      } else if (gem.rarity.includes('moderately')) {
        rarityClass = 'moderately-hidden';
      } else {
        rarityClass = 'least-hidden';
      }
    }

    // Create card HTML
    card.innerHTML = `
      <div class="card-accent ${accentColor}"></div>
      <div class="card-header">
        <div class="card-img-container">
          <div class="gem-icon-container">
            <div class="gem-icon ${gemColor}-gem"></div>
            <div class="gem-sparkle">💎</div>
          </div>
        </div>
        <div class="card-title-section">
          <div class="card-title">${gem.name || 'Hidden Gem'}</div>
          <div class="card-subtitle">${categoryTags}</div>
          ${distanceText ? `<div class="card-distance"><span class="distance-icon">📍</span> ${distanceText}</div>` : ''}
        </div>
        ${index === this.activeIndex ? '<div class="active-gem-label">ACTIVE</div>' : ''}
      </div>
      
      <div class="card-meta">
        ${timeDisplay ? `<div class="meta-item time-meta"><span class="meta-icon">⏱️</span> ${timeDisplay}</div>` : ''}
        ${priceDisplay ? `<div class="meta-item price-meta ${priceDisplay.length === 1 ? 'affordable' : priceDisplay.length === 2 ? 'moderate' : 'expensive'}">${priceDisplay}</div>` : ''}
        ${gem.rarity ? `<div class="meta-item rarity-meta ${rarityClass}">${this.formatRarity(gem.rarity)}</div>` : ''}
      </div>
      
      <div class="card-details">
        ${address ? `<div class="detail-item address-detail"><span class="detail-icon">📍</span> ${address}</div>` : ''}
        ${openingHours ? `<div class="detail-item hours-detail"><span class="detail-icon">🕒</span> ${openingHours}</div>` : ''}
      </div>
      
      <div class="card-description">
        ${gem.description || 'A hidden gem waiting to be explored.'}
      </div>
      
      
      <div class="card-actions">
        <button class="explore-now-btn">Explore Now!</button>
      </div>
    `;

    // Add click event listener to card
    card.addEventListener('click', (e) => {
      // Don't trigger for button clicks
      if (e.target.closest('.explore-now-btn')) return;

      // Highlight marker and center map
      this.highlightMarker(index);

      // Center map on gem if coordinates are available
      this.centerMapOnGem(gem);

      // Dispatch card click event for compatibility
      this.container.dispatchEvent(new CustomEvent('card-click', {
        bubbles: true,
        detail: { gem, index }
      }));
    });

    // Add click event listener to explore button
    const exploreBtn = card.querySelector('.explore-now-btn');
    if (exploreBtn) {
      exploreBtn.addEventListener('click', () => {
        this.onExplore(gem, index);
      });
    }

    return card;
  }

  /**
   * Center map on gem coordinates if available
   * @param {Object} gem - Gem data object
   */
  centerMapOnGem(gem) {
    if (!window.map) return;

    const coords = gem.coords || gem.coordinates;

    if (coords && coords.length === 2) {
      // Ensure coordinates are in correct format [lng, lat]
      let lngLat;
      if (Math.abs(coords[0]) > 90 && Math.abs(coords[1]) <= 90) {
        lngLat = coords; // Already in [lng, lat] format
      } else if (Math.abs(coords[0]) <= 90 && Math.abs(coords[1]) > 90) {
        lngLat = [coords[1], coords[0]]; // Need to swap to [lng, lat] format
      } else {
        // For Northern California, longitude is negative, latitude is positive
        lngLat = coords[0] < 0 ? coords : [coords[1], coords[0]];
      }

      // Center map on gem with smooth animation
      window.map.flyTo({
        center: lngLat,
        essential: true,
        duration: 800,
        easing: function (t) {
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }
      });
    }
  }

  /**
   * Show a specific card by index
   * @param {number} index - Index of the card to show
   */
  showCard(index) {
    if (!this.gems.length) return;

    // Prevent recursive calls
    if (window._showingCard) return;
    window._showingCard = true;

    // Keep index within bounds
    if (index < 0) index = 0;
    if (index >= this.gems.length) index = this.gems.length - 1;

    // Update active index
    this.activeIndex = index;

    // Update global reference for compatibility
    if (window.HiddenGems && window.HiddenGems.map) {
      window.HiddenGems.map.activeGemIndex = index;
    }
    window.activeGemIndex = index;

    // Update cards
    const cards = this.wrapper.querySelectorAll('.gem-card');
    cards.forEach((card, i) => {
      if (i === index) {
        card.classList.add('active');

        // Apply variant class to active card
        if (this.variant && !card.classList.contains(`${this.variant}-variant`)) {
          card.classList.add(`${this.variant}-variant`);
        }

        // Add active label if not present
        if (!card.querySelector('.active-gem-label')) {
          const label = document.createElement('div');
          label.className = 'active-gem-label';
          label.textContent = 'ACTIVE';
          card.querySelector('.card-header').appendChild(label);
        }
      } else {
        card.classList.remove('active');

        // Remove active label if present
        const label = card.querySelector('.active-gem-label');
        if (label) label.remove();
      }
    });

    // Update navigation dots
    const dots = this.dotsContainer.querySelectorAll('.nav-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    // Update trip distance info if in map-recs variant
    if (this.variant === 'map-recs') {
      this.updateTripDistanceInfo();
    }

    // Highlight marker
    this.highlightMarker(index);

    // Call callback
    this.onCardChange(this.gems[index], index);

    // Dispatch event for compatibility
    this.container.dispatchEvent(new CustomEvent('card-change', {
      bubbles: true,
      detail: { index, gem: this.gems[index] }
    }));

    // Clear recursive protection
    setTimeout(() => {
      window._showingCard = false;
    }, 50);
  }

  /**
   * Show the next card
   */
  showNextCard() {
    const nextIndex = (this.activeIndex + 1) % this.gems.length;
    this.showCard(nextIndex);
  }

  /**
   * Show the previous card
   */
  showPrevCard() {
    const prevIndex = (this.activeIndex - 1 + this.gems.length) % this.gems.length;
    this.showCard(prevIndex);
  }

  /**
   * Highlight the corresponding map marker
   * @param {number} index - Index of the marker to highlight
   */
  highlightMarker(index) {
    // First try global highlightGemMarker function for compatibility
    if (typeof window.highlightGemMarker === 'function') {
      try {
        // Use skipCardUpdate to prevent recursion
        window.highlightGemMarker(index, true);
        return;
      } catch (error) {
        console.warn('Error using global highlightGemMarker function:', error);
      }
    }

    // Call marker highlight callback
    this.onMarkerHighlight(this.gems[index], index);

    // Dispatch event for marker highlight compatibility
    this.container.dispatchEvent(new CustomEvent('marker-highlight', {
      bubbles: true,
      detail: { index }
    }));

    // Dispatch legacy event for compatibility
    document.dispatchEvent(new CustomEvent('gemSelected', {
      detail: {
        index,
        id: this.gems[index].id || `gem-${index}`
      }
    }));
  }

  /**
   * Update trip distance information
   */
  updateTripDistanceInfo() {
    if (this.variant !== 'map-recs' || !this.gems.length) return;

    const activeCard = this.wrapper.querySelector('.gem-card.active');
    if (!activeCard) return;

    const tripInfo = activeCard.querySelector('.trip-distance-info');
    if (!tripInfo) return;

    // If we have distance data
    if (this.tripDistances.detourDistance) {
      const detourEl = tripInfo.querySelector('.distance-detail:nth-child(2) .distance-value');
      const addedEl = tripInfo.querySelector('.distance-detail:nth-child(3) .distance-value');

      if (detourEl) {
        detourEl.textContent = this.formatDistance(this.tripDistances.detourDistance);
      }

      if (addedEl) {
        const addedTime = this.formatTime(this.tripDistances.addedDistance / 50 * 60); // Rough estimate
        addedEl.textContent = addedTime;
      }
    }
  }

  /**
   * Set trip distance data
   * @param {Object} distances - Trip distance data
   */
  setTripDistances(distances) {
    this.tripDistances = distances;

    if (this.variant === 'map-recs') {
      this.updateTripDistanceInfo();
    }
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyDown(e) {
    if (e.key === 'ArrowLeft') {
      this.showPrevCard();
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      this.showNextCard();
      e.preventDefault();
    }
  }

  /**
   * Handle touch start event
   * @param {TouchEvent} e - Touch event
   */
  handleTouchStart(e) {
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.isDragging = true;
    this.currentX = this.touchStartX;

    // Get active card
    const activeCard = this.wrapper.querySelector('.gem-card.active');
    if (activeCard) {
      activeCard.style.transition = 'none';
    }
  }

  /**
   * Handle touch move event
   * @param {TouchEvent} e - Touch event
   */
  handleTouchMove(e) {
    if (!this.isDragging) return;

    const touch = e.touches[0];
    this.currentX = touch.clientX;
    const offsetX = this.currentX - this.touchStartX;

    // Check if horizontal swipe
    const currentY = touch.clientY;
    const offsetY = currentY - this.touchStartY;

    if (Math.abs(offsetX) > Math.abs(offsetY)) {
      e.preventDefault(); // Prevent page scrolling

      // Move active card
      const activeCard = this.wrapper.querySelector('.gem-card.active');
      if (activeCard) {
        activeCard.style.transform = `translateX(${offsetX}px)`;
      }
    }
  }

  /**
   * Handle touch end event
   * @param {TouchEvent} e - Touch event
   */
  handleTouchEnd(e) {
    if (!this.isDragging) return;

    // Reset transition
    const activeCard = this.wrapper.querySelector('.gem-card.active');
    if (activeCard) {
      activeCard.style.transition = 'transform 0.3s ease';
    }

    // Calculate swipe
    const offsetX = this.currentX - this.touchStartX;

    if (Math.abs(offsetX) > this.swipeThreshold) {
      if (offsetX > 0) {
        // Swiped right - go to previous
        this.showPrevCard();
      } else {
        // Swiped left - go to next
        this.showNextCard();
      }
    } else {
      // Not enough swipe distance, reset position
      if (activeCard) {
        activeCard.style.transform = 'translateX(0)';
      }
    }

    // Reset variables
    this.isDragging = false;
    this.touchStartX = null;
    this.touchStartY = null;
  }

  /**
   * Create category tags HTML
   * @param {string} category1 - Primary category
   * @param {string} category2 - Secondary category
   * @param {string} fallbackCategory - Fallback category
   * @returns {string} HTML for category tags
   */
  createCategoryTags(category1, category2, fallbackCategory) {
    let tagsHtml = '';

    if (category1) {
      tagsHtml += `<span class="category-tag primary">${category1}</span>`;
    }

    if (category2) {
      tagsHtml += `<span class="category-tag secondary">${category2}</span>`;
    }

    if (!category1 && !category2 && fallbackCategory) {
      tagsHtml += `<span class="category-tag default">${fallbackCategory}</span>`;
    }

    return tagsHtml || '<span class="category-tag default">Hidden Gem</span>';
  }

  /**
   * Format rarity text
   * @param {string} rarity - Rarity level
   * @returns {string} Formatted rarity text
   */
  formatRarity(rarity) {
    if (!rarity) return '';

    let icon = '';

    if (rarity.includes('most') || rarity.includes('very')) {
      icon = '🔴';
    } else if (rarity.includes('moderately')) {
      icon = '🟣';
    } else {
      icon = '🔵';
    }

    return `${icon} ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}`;
  }

  /**
   * Get gem color based on properties
   * @param {Object} gem - Gem object
   * @returns {string} Color name (red, purple, blue)
   */
  getGemColor(gem) {
    if (gem.color) {
      return gem.color;
    } else if (gem.rarity) {
      if (gem.rarity.includes('most') || gem.rarity.includes('very')) {
        return 'red';
      } else if (gem.rarity.includes('moderately')) {
        return 'purple';
      }
    } else if (gem.popularity !== undefined) {
      if (gem.popularity < 2) {
        return 'red';
      } else if (gem.popularity < 4) {
        return 'purple';
      }
    }

    return 'blue';
  }

  /**
   * Format distance with appropriate units
   * @param {number} distance - Distance in kilometers
   * @returns {string} Formatted distance
   */
  formatDistance(distance) {
    if (!distance) return '0 km';

    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  }

  /**
   * Format time in minutes to human readable
   * @param {number} timeMinutes - Time in minutes
   * @returns {string} Formatted time
   */
  formatTime(timeMinutes) {
    if (!timeMinutes) return '0 min';

    const minutes = Math.ceil(timeMinutes);

    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
    }
  }

  /**
   * Get current active gem
   * @returns {Object} Active gem data
   */
  getActiveGem() {
    if (this.gems.length > 0 && this.activeIndex >= 0) {
      return this.gems[this.activeIndex];
    }
    return null;
  }

  /**
   * Get active index
   * @returns {number} Active index
   */
  getActiveIndex() {
    return this.activeIndex;
  }

  /**
   * Force map to be ready (for testing or when map events aren't working)
   */
  forceMapReady() {
    this.mapReady = true;

    if (this.pendingGems) {
      this.renderCards(this.pendingGems);
      this.showCard(0);
      this.pendingGems = null;
    }
  }
}

/**
 * Creates enhanced trip distance information with smart calculations
 * @param {Object} cardData - The card data from session storage
 * @returns {string} HTML string with comprehensive trip distance information
 */
function createTripDistanceInfo(cardData) {
  // Extract coordinates from card data
  const coordinates = cardData.coordinates;
  let lat, lng;
  
  // Parse coordinates if available
  if (coordinates) {
    try {
      // Try to parse coordinates in different formats
      if (typeof coordinates === 'string') {
        if (coordinates.includes(',')) {
          // Format: "lat,lng"
          [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
        } else if (coordinates.includes(' ')) {
          // Format: "lat lng"
          [lat, lng] = coordinates.split(' ').map(coord => parseFloat(coord.trim()));
        }
      } else if (Array.isArray(coordinates) && coordinates.length >= 2) {
        // Format: [lng, lat] or [lat, lng]
        // We'll assume [lat, lng] format here
        [lat, lng] = coordinates;
      }
    } catch (error) {
      console.warn('Error parsing coordinates:', error);
    }
  }
  
  // Default values if coordinates are not available or couldn't be parsed
  const directDistance = 5; // km
  const detourDistance = 8; // km
  const addedDistance = 3; // km
  
  // Calculate distances if coordinates are available
  let calculatedDirectDistance = directDistance;
  let calculatedDetourDistance = detourDistance;
  let calculatedAddedDistance = addedDistance;
  
  // If we have coordinates and origin/destination from session storage, calculate actual distances
  const originCoords = JSON.parse(sessionStorage.getItem('originCoords'));
  const destinationCoords = JSON.parse(sessionStorage.getItem('destinationCoords'));
  
  if (lat && lng && originCoords && destinationCoords) {
    // Calculate direct distance (origin to destination)
    calculatedDirectDistance = calculateHaversineDistance(
      originCoords[1], originCoords[0], 
      destinationCoords[1], destinationCoords[0]
    );
    
    // Calculate detour distances
    const originToGemDistance = calculateHaversineDistance(
      originCoords[1], originCoords[0],
      lat, lng
    );
    
    const gemToDestinationDistance = calculateHaversineDistance(
      lat, lng,
      destinationCoords[1], destinationCoords[0]
    );
    
    // Calculate total detour distance
    calculatedDetourDistance = originToGemDistance + gemToDestinationDistance;
    
    // Calculate added distance
    calculatedAddedDistance = calculatedDetourDistance - calculatedDirectDistance;
  }
  
  // Format distances with appropriate units
  let formattedDetourDistance, formattedAddedDistance;
  
  if (calculatedDetourDistance < 1) {
    formattedDetourDistance = `${Math.round(calculatedDetourDistance * 1000)}m`;
  } else {
    formattedDetourDistance = `${calculatedDetourDistance.toFixed(1)}km`;
  }
  
  if (calculatedAddedDistance < 1) {
    formattedAddedDistance = `${Math.round(calculatedAddedDistance * 1000)}m`;
  } else {
    formattedAddedDistance = `${calculatedAddedDistance.toFixed(1)}km`;
  }
  
  // Calculate time based on distances
  // Assuming average driving speed of 50 km/h
  const drivingSpeedKmPerHour = 50;
  
  // Calculate direct time
  const directTimeMinutes = Math.ceil((calculatedDirectDistance / drivingSpeedKmPerHour) * 60);
  
  // Calculate detour driving time
  const detourDrivingTimeMinutes = Math.ceil((calculatedDetourDistance / drivingSpeedKmPerHour) * 60);
  
  // Get visit time from card data or use default
  const visitTimeMinutes = cardData.time ? parseInt(cardData.time, 10) : 30;
  
  // Calculate total time (driving + visit)
  const totalTimeMinutes = detourDrivingTimeMinutes + visitTimeMinutes;
  
  // Calculate extra time compared to direct route
  const extraTimeMinutes = totalTimeMinutes - directTimeMinutes;
  
  // Format times
  const formattedDrivingTime = formatTime(detourDrivingTimeMinutes);
  const formattedVisitTime = formatTime(visitTimeMinutes);
  const formattedExtraTime = formatTime(extraTimeMinutes);
  
  // Create HTML for the trip distance info
  return `
    <div class="trip-distance-info">
      <div class="distance-detail">
        <span class="distance-icon">+</span>
        <span class="distance-label">Adds to trip:</span>
        <span class="distance-value">${formattedExtraTime}</span>
      </div>
      
      <div class="time-breakdown">
        <div class="breakdown-item">
          <span class="breakdown-label">🚗 Driving:</span>
          <span class="breakdown-value">${formattedDrivingTime}</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">👣 Exploring:</span>
          <span class="breakdown-value">${formattedVisitTime}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Format time in minutes to a readable string
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted time string
 */
function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
  }
}

/**
 * Calculate the Haversine distance between two points
 * @param {number} lat1 - Latitude of first point in degrees
 * @param {number} lon1 - Longitude of first point in degrees
 * @param {number} lat2 - Latitude of second point in degrees
 * @param {number} lon2 - Longitude of second point in degrees
 * @returns {number} Distance in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  // Convert degrees to radians
  const toRad = (value) => value * Math.PI / 180;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}


// Create global namespace if it doesn't exist
window.HiddenGems = window.HiddenGems || {};
window.HiddenGems.GemCards = GemCards;

/**
 * Function to highlight a gem marker - compatibility with the original implementation
 * @param {number} index - Index of the gem to highlight
 * @param {boolean} skipCardUpdate - Whether to skip updating the card (to prevent recursion)
 */
window.highlightGemMarker = function (index, skipCardUpdate = false) {
  // Update map markers if they exist
  const markers = window.markers || [];

  markers.forEach((marker, i) => {
    if (!marker || !marker.getElement) return;

    const el = marker.getElement();
    if (!el) return;

    // Update visual appearance
    if (i === index) {
      // Active marker
      el.style.transform = 'scale(1.4)';
      el.style.zIndex = '100';
      el.style.filter = 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.3))';

      // Add pulse effect
      if (!el.querySelector('.pulse-effect')) {
        const pulse = document.createElement('div');
        pulse.className = 'pulse-effect';
        pulse.style.position = 'absolute';
        pulse.style.top = '0';
        pulse.style.left = '0';
        pulse.style.width = '100%';
        pulse.style.height = '100%';
        pulse.style.borderRadius = '50%';
        pulse.style.boxShadow = '0 0 0 rgba(66, 133, 244, 0.6)';
        pulse.style.animation = 'pulse 2s infinite';
        el.appendChild(pulse);

        // Add pulse animation if not already in document
        if (!document.getElementById('gem-cards-pulse-style')) {
          const style = document.createElement('style');
          style.id = 'gem-cards-pulse-style';
          style.textContent = `
            @keyframes pulse {
              0% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7); }
              70% { box-shadow: 0 0 0 10px rgba(66, 133, 244, 0); }
              100% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0); }
            }
          `;
          document.head.appendChild(style);
        }
      }
    } else {
      // Inactive marker
      el.style.transform = 'scale(1.0)';
      el.style.zIndex = '1';
      el.style.filter = 'none';

      // Remove pulse effect
      const pulse = el.querySelector('.pulse-effect');
      if (pulse) pulse.remove();
    }
  });

  // Update global active gem index for compatibility
  window.activeGemIndex = index;
  if (window.HiddenGems && window.HiddenGems.map) {
    window.HiddenGems.map.activeGemIndex = index;
  }

  // Update gem-cards element if not skipping card update
  if (!skipCardUpdate) {
    const gemCards = document.querySelector(`#${window.gemCardsContainerId || 'gem-cards-container'}`);
    if (gemCards && gemCards.gemCards) {
      window._updatingCard = true;
      gemCards.gemCards.showCard(index);
      setTimeout(() => {
        window._updatingCard = false;
      }, 50);
    }
  }

  // Dispatch a global event for other components
  document.dispatchEvent(new CustomEvent('gemSelected', {
    detail: {
      index,
      id: window.HiddenGems?.data?.gems?.[index]?.id
    }
  }));
};

/**
 * Function to go to a specific gem - compatibility with the original implementation
 * @param {number} index - Index of the gem to display
 */
window.goToGem = function (index) {
  const gemCardsId = window.gemCardsContainerId || 'gem-cards-container';
  const gemCardsContainer = document.getElementById(gemCardsId);

  if (gemCardsContainer && gemCardsContainer.gemCards) {
    gemCardsContainer.gemCards.showCard(index);
  } else {
    // Fallback to just highlighting the marker
    window.highlightGemMarker(index);
  }
};

/**
 * Function to dispatch map ready event - compatibility with the original implementation
 */
window.notifyMapReady = function () {
  console.log('Map is ready, notifying components');

  // Dispatch event that the map is ready
  document.dispatchEvent(new CustomEvent('mapReady', {
    bubbles: true
  }));

  // For older implementations
  document.dispatchEvent(new CustomEvent('initializeApp', {
    bubbles: true
  }));

  document.dispatchEvent(new CustomEvent('appReady', {
    bubbles: true
  }));
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GemCards;
}