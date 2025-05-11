/**
 * gem-cards.js
 * A unified custom element for displaying gem cards in both index and detail variants
 * Handles card rendering, swiping, and synchronization with map markers
 */

/**
 * Define the custom element for gem cards
 */
class GemCards extends HTMLElement {
  constructor() {
    super();
    
    // Create a shadow DOM
    this.attachShadow({ mode: 'open' });
    
    // Setup instance state
    this.activeIndex = 0;
    this.gems = [];
    this.cardVariant = this.getAttribute('variant') || 'index'; // 'index' or 'detail'
    this.markerId = this.getAttribute('marker-id') || null;
    
    // Initialize shadow DOM with styles and structure
    this.shadowRoot.innerHTML = `
      <style>
        /* Container styles */
        :host {
          display: block;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
          pointer-events: none;
        }
        
        /* Card container */
        .cards-container {
          position: relative;
          width: 100%;
          height: ${this.cardVariant === 'detail' ? '200px' : '170px'};
        }
        
        /* Individual gem card */
        .gem-card {
          position: absolute;
          bottom: 0;
          left: 10px;
          right: 10px;
          height: 100%;
          background-color: white;
          border-radius: 16px 16px 0 0;
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
          padding: 16px;
          display: flex;
          flex-direction: column;
          pointer-events: auto;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          opacity: 0;
          transform: translateY(20px);
        }
        
        .gem-card.visible {
          opacity: 1;
          transform: translateY(0);
        }
        
        .gem-card.active {
          border-top: 3px solid #4285F4;
        }
        
        /* Card hover effect */
        .gem-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 -8px 20px rgba(0, 0, 0, 0.2);
        }
        
        /* Card header with image and title */
        .card-header {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }
        
        /* Image container */
        .card-img-container {
          position: relative;
          width: 60px;
          height: 60px;
          flex-shrink: 0;
          border-radius: 12px;
          background: #f9f9f9;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        /* Gem icon styling */
        .gem-icon {
          position: absolute;
          right: -6px;
          top: -6px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          z-index: 2;
        }
        
        .gem-icon.red-gem {
          background: linear-gradient(to bottom right, #e74c3c, #c0392b);
        }
        
        .gem-icon.purple-gem {
          background: linear-gradient(to bottom right, #9b59b6, #8e44ad);
        }
        
        .gem-icon.blue-gem {
          background: linear-gradient(to bottom right, #3498db, #2980b9);
        }
        
        /* Gem sparkle effect */
        .gem-sparkle:before {
          content: "💎";
          font-size: 24px;
          opacity: 0.7;
        }
        
        /* Card title section */
        .card-title-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .card-title {
          font-weight: 700;
          font-size: 18px;
          color: #333;
          margin-bottom: 5px;
          line-height: 1.2;
        }
        
        .card-subtitle {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-bottom: 5px;
        }
        
        /* Category tags */
        .category-tag {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }
        
        .category-tag.primary {
          background-color: rgba(52, 152, 219, 0.1);
          color: #2980b9;
        }
        
        .category-tag.secondary {
          background-color: rgba(46, 204, 113, 0.1);
          color: #27ae60;
        }
        
        .category-tag.default {
          background-color: rgba(149, 165, 166, 0.1);
          color: #7f8c8d;
        }
        
        /* Distance display */
        .card-distance {
          font-size: 12px;
          color: #777;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        /* Meta information row */
        .card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 8px;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 12px;
          background-color: #f8f8f8;
        }
        
        /* Card details */
        .card-details {
          margin-bottom: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #555;
        }
        
        /* Card description */
        .card-description {
          flex: 1;
          font-size: 14px;
          line-height: 1.5;
          color: #444;
          overflow-y: auto;
          margin-bottom: 8px;
          padding-right: 6px;
          scrollbar-width: thin;
          scrollbar-color: #ddd transparent;
        }
        
        .card-description::-webkit-scrollbar {
          width: 4px;
        }
        
        .card-description::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .card-description::-webkit-scrollbar-thumb {
          background-color: #ddd;
          border-radius: 2px;
        }
        
        /* Trip distance info block - only for detail variant */
        .trip-distance-info {
          margin: 8px 0;
          padding: 12px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #94c9ba;
          display: ${this.cardVariant === 'detail' ? 'block' : 'none'};
        }
        
        .distance-detail {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .distance-detail:last-child {
          margin-bottom: 0;
        }
        
        .distance-icon {
          margin-right: 8px;
          font-size: 16px;
          width: 20px;
          text-align: center;
        }
        
        .distance-label {
          flex: 1;
          font-size: 14px;
          color: #555;
        }
        
        .distance-value {
          font-weight: bold;
          color: #94c9ba;
          margin-right: 4px;
        }
        
        /* Card actions - only shown for detail variant */
        .card-actions {
          display: ${this.cardVariant === 'detail' ? 'flex' : 'none'};
          justify-content: flex-end;
          padding-top: 8px;
        }
        
        /* Explore button */
        .explore-now-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(to right, #333, #555);
          color: white;
          border: none;
          border-radius: 20px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .explore-now-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          background: linear-gradient(to right, #222, #444);
        }
        
        /* Swipe indicator dots */
        .swipe-indicator {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 8px;
          z-index: 101;
          padding: 8px;
        }
        
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .dot.active {
          background-color: #3498db;
          transform: scale(1.3);
          box-shadow: 0 1px 5px rgba(52, 152, 219, 0.5);
        }
        
        /* Notification popup */
        .gem-notification {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%) translateY(-100px);
          background-color: white;
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          z-index: 2000;
          opacity: 0;
          transition: all 0.3s ease;
          max-width: 90%;
          pointer-events: auto;
        }
        
        .gem-notification.show {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
        
        .notification-icon {
          font-size: 24px;
        }
        
        .notification-content {
          flex: 1;
        }
        
        .notification-title {
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .notification-message {
          font-size: 14px;
          color: #666;
        }
        
        /* Active marker indicator */
        .active-marker-label {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #4285F4;
          color: white;
          font-size: 10px;
          font-weight: bold;
          padding: 3px 8px;
          border-radius: 10px;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        /* Media queries for different device sizes */
        @media (max-height: 600px) {
          .cards-container, .gem-card {
            height: ${this.cardVariant === 'detail' ? '170px' : '150px'};
          }
          
          .card-img-container {
            width: 50px;
            height: 50px;
          }
          
          .card-title {
            font-size: 16px;
          }
          
          .card-description {
            max-height: 60px;
          }
        }
        
        @media (min-height: 800px) {
          .cards-container, .gem-card {
            height: ${this.cardVariant === 'detail' ? '230px' : '190px'};
          }
          
          .card-img-container {
            width: 70px;
            height: 70px;
          }
          
          .card-description {
            max-height: 100px;
          }
        }
      </style>
      
      <!-- Swipe indicator dots -->
      <div class="swipe-indicator"></div>
      
      <!-- Main cards container -->
      <div class="cards-container"></div>
    `;
    
    // Bind methods to this
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.showCard = this.showCard.bind(this);
    this.highlightMarker = this.highlightMarker.bind(this);
    
    // Touch/swipe tracking variables
    this.startX = null;
    this.startY = null;
    this.isDragging = false;
    this.currentX = null;
    this.offsetX = null;
    this.swipeThreshold = 50;
    
    // Card and indicator container references
    this.cardsContainer = this.shadowRoot.querySelector('.cards-container');
    this.swipeIndicator = this.shadowRoot.querySelector('.swipe-indicator');
    
    // Store trip calculation data (for detail variant)
    this.tripDistances = {
      directDistance: null,
      detourDistance: null,
      addedDistance: null,
      originToGemDistance: null,
      gemToDestinationDistance: null
    };
  }
  
  /**
   * Connected callback - when element is added to DOM
   */
  connectedCallback() {
    // Set up event listeners
    this.setupEventListeners();
    
    // Check for variant attribute changes
    this.updateVariant();
    
    // Load gems if provided via attribute
    this.loadGemsFromAttribute();
    
    // Listen for gems loaded event
    document.addEventListener('gemsLoaded', this.handleGemsLoaded.bind(this));
    
    // Set up keyboard navigation
    this.setupKeyboardNavigation();
    
    // Dispatch custom event to inform the page that the gem cards are ready
    this.dispatchEvent(new CustomEvent('gem-cards-ready', {
      bubbles: true,
      composed: true
    }));
    
    // Automatically load gems from common sources if not explicitly provided
    if (this.gems.length === 0) {
      this.loadGemsFromCommonSources();
    }
  }
  
  /**
   * Disconnected callback - clean up when element is removed
   */
  disconnectedCallback() {
    // Remove event listeners
    this.removeEventListeners();
  }
  
  /**
   * Attribute changed callback - react to attribute changes
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'variant' && oldValue !== newValue) {
      this.cardVariant = newValue;
      this.updateVariant();
    } else if (name === 'active-index' && oldValue !== newValue) {
      this.activeIndex = parseInt(newValue, 10);
      this.showCard(this.activeIndex);
    } else if (name === 'marker-id' && oldValue !== newValue) {
      this.markerId = newValue;
    } else if (name === 'gems-data' && oldValue !== newValue) {
      this.loadGemsFromAttribute();
    }
  }
  
  /**
   * Static get for observed attributes
   */
  static get observedAttributes() {
    return ['variant', 'active-index', 'marker-id', 'gems-data'];
  }
  
  /**
   * Handle gems loaded event from document
   * @param {CustomEvent} event - The gemsLoaded event
   */
  handleGemsLoaded(event) {
    if (event.detail && event.detail.gems) {
      this.renderCards(event.detail.gems);
    }
  }
  
  /**
   * Load gems from the gems-data attribute
   */
  loadGemsFromAttribute() {
    const gemsData = this.getAttribute('gems-data');
    if (gemsData) {
      try {
        this.gems = JSON.parse(gemsData);
        this.renderCards(this.gems);
      } catch (error) {
        console.error('Error parsing gems data from attribute:', error);
      }
    }
  }
  
  /**
   * Load gems from common sources (window.HiddenGems, sessionStorage, etc.)
   */
  loadGemsFromCommonSources() {
    // Check if gems are in HiddenGems namespace
    if (window.HiddenGems && window.HiddenGems.data && window.HiddenGems.data.gems) {
      this.renderCards(window.HiddenGems.data.gems);
      return;
    }
    
    // Check sessionStorage for common gem storage keys
    const sessionStorageKeys = [
      'recommendedGems',
      'routeFilteredGems',
      'shuffledGems',
      'gems'
    ];
    
    for (const key of sessionStorageKeys) {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        try {
          const gems = JSON.parse(stored);
          if (Array.isArray(gems) && gems.length > 0) {
            this.renderCards(gems);
            return;
          }
        } catch (error) {
          console.warn(`Error parsing gems from sessionStorage key ${key}:`, error);
        }
      }
    }
    
    // Check the data controller if available
    if (window.HiddenGemsData && window.HiddenGemsData.gemsData) {
      const gems = window.HiddenGemsData.gemsData.getAll();
      if (gems && gems.length > 0) {
        this.renderCards(gems);
        return;
      }
    }
  }
  
  /**
   * Update the variant-specific styles and elements
   */
  updateVariant() {
    // Update container height based on variant
    const cardsContainer = this.shadowRoot.querySelector('.cards-container');
    const cardActionsStyle = this.shadowRoot.querySelector('.card-actions');
    const tripDistanceStyle = this.shadowRoot.querySelector('.trip-distance-info');
    
    if (cardsContainer) {
      cardsContainer.style.height = this.cardVariant === 'detail' ? '200px' : '170px';
    }
    
    // Update visibility of variant-specific elements
    if (cardActionsStyle) {
      cardActionsStyle.style.display = this.cardVariant === 'detail' ? 'flex' : 'none';
    }
    
    if (tripDistanceStyle) {
      tripDistanceStyle.style.display = this.cardVariant === 'detail' ? 'block' : 'none';
    }
    
    // Rerender cards with the new variant
    if (this.gems.length > 0) {
      this.renderCards(this.gems);
    }
  }
  
  /**
   * Set up event listeners for card navigation
   */
  setupEventListeners() {
    // Touch events for mobile
    this.cardsContainer.addEventListener('touchstart', this.handleTouchStart);
    this.cardsContainer.addEventListener('touchmove', this.handleTouchMove);
    this.cardsContainer.addEventListener('touchend', this.handleTouchEnd);
    
    // Mouse events for desktop
    this.cardsContainer.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    
    // Listen for gem selection changes from map or other sources
    document.addEventListener('gemSelected', (event) => {
      if (event.detail && event.detail.index !== undefined) {
        this.showCard(event.detail.index);
      }
    });
    
    // Listen for map marker clicks if markerId provided
    if (this.markerId) {
      const markerElements = document.querySelectorAll(this.markerId);
      markerElements.forEach((marker, index) => {
        marker.addEventListener('click', () => {
          this.showCard(index);
        });
      });
    }
  }
  
  /**
   * Remove event listeners
   */
  removeEventListeners() {
    // Touch events
    this.cardsContainer.removeEventListener('touchstart', this.handleTouchStart);
    this.cardsContainer.removeEventListener('touchmove', this.handleTouchMove);
    this.cardsContainer.removeEventListener('touchend', this.handleTouchEnd);
    
    // Mouse events
    this.cardsContainer.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    
    // Remove keyboard listener
    document.removeEventListener('keydown', this.handleKeyDown);
  }
  
  /**
   * Set up keyboard navigation
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', this.handleKeyDown);
  }
  
  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyDown(e) {
    // Only handle arrow keys
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!this.gems || !this.gems.length) return;
      
      if (e.key === 'ArrowLeft') {
        // Previous gem
        const prevIndex = (this.activeIndex - 1 + this.gems.length) % this.gems.length;
        this.showCard(prevIndex);
      } else {
        // Next gem
        const nextIndex = (this.activeIndex + 1) % this.gems.length;
        this.showCard(nextIndex);
      }
      
      // Prevent page scrolling
      e.preventDefault();
    }
  }
  
  /**
   * Handle touch start
   * @param {TouchEvent} e - Touch event
   */
  handleTouchStart(e) {
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.isDragging = true;
    this.currentX = this.startX;
    this.offsetX = 0;
    
    // Get active card and disable transitions during dragging
    const activeCard = this.shadowRoot.querySelector('.gem-card.active');
    if (activeCard) {
      activeCard.style.transition = 'none';
    }
  }
  
  /**
   * Handle touch move
   * @param {TouchEvent} e - Touch event
   */
  handleTouchMove(e) {
    if (!this.isDragging) return;
    
    const touch = e.touches[0];
    this.currentX = touch.clientX;
    this.offsetX = this.currentX - this.startX;
    
    // Check if horizontal swipe is more significant than vertical
    const currentY = touch.clientY;
    const offsetY = currentY - this.startY;
    
    if (Math.abs(this.offsetX) > Math.abs(offsetY)) {
      e.preventDefault(); // Prevent page scrolling for horizontal swipes
      
      // Move active card
      const activeCard = this.shadowRoot.querySelector('.gem-card.active');
      if (activeCard) {
        activeCard.style.transform = `translateX(${this.offsetX}px)`;
      }
    }
  }
  
  /**
   * Handle touch end
   * @param {TouchEvent} e - Touch event
   */
  handleTouchEnd(e) {
    if (!this.isDragging) return;
    
    // Restore transition
    const activeCard = this.shadowRoot.querySelector('.gem-card.active');
    if (activeCard) {
      activeCard.style.transition = 'transform 0.3s ease';
    }
    
    // Check if swipe distance exceeds threshold
    if (Math.abs(this.offsetX) > this.swipeThreshold) {
      if (this.offsetX > 0) {
        // Swiped right - go to previous
        const prevIndex = (this.activeIndex - 1 + this.gems.length) % this.gems.length;
        this.showCard(prevIndex);
      } else {
        // Swiped left - go to next
        const nextIndex = (this.activeIndex + 1) % this.gems.length;
        this.showCard(nextIndex);
      }
    } else {
      // Not enough swipe distance, reset position
      if (activeCard) {
        activeCard.style.transform = 'translateX(0)';
      }
    }
    
    // Reset swipe variables
    this.isDragging = false;
    this.startX = null;
    this.startY = null;
  }
  
  /**
   * Handle mouse down
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseDown(e) {
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.isDragging = true;
    this.currentX = this.startX;
    this.offsetX = 0;
    
    // Get active card and disable transitions during dragging
    const activeCard = this.shadowRoot.querySelector('.gem-card.active');
    if (activeCard) {
      activeCard.style.transition = 'none';
    }
    
    e.preventDefault();
  }
  
  /**
   * Handle mouse move
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseMove(e) {
    if (!this.isDragging) return;
    
    this.currentX = e.clientX;
    this.offsetX = this.currentX - this.startX;
    
    // Only move if dragging horizontally
    if (Math.abs(this.offsetX) > 10) {
      // Move active card
      const activeCard = this.shadowRoot.querySelector('.gem-card.active');
      if (activeCard) {
        activeCard.style.transform = `translateX(${this.offsetX}px)`;
      }
    }
  }
  
  /**
   * Handle mouse up
   * @param {MouseEvent} e - Mouse event
   */
  handleMouseUp(e) {
    if (!this.isDragging) return;
    
    // Restore transition
    const activeCard = this.shadowRoot.querySelector('.gem-card.active');
    if (activeCard) {
      activeCard.style.transition = 'transform 0.3s ease';
    }
    
    // Check if swipe distance exceeds threshold
    if (Math.abs(this.offsetX) > this.swipeThreshold) {
      if (this.offsetX > 0) {
        // Swiped right - go to previous
        const prevIndex = (this.activeIndex - 1 + this.gems.length) % this.gems.length;
        this.showCard(prevIndex);
      } else {
        // Swiped left - go to next
        const nextIndex = (this.activeIndex + 1) % this.gems.length;
        this.showCard(nextIndex);
      }
    } else {
      // Not enough swipe distance, reset position
      if (activeCard) {
        activeCard.style.transform = 'translateX(0)';
      }
    }
    
    // Reset swipe variables
    this.isDragging = false;
  }
  
  /**
   * Render gem cards
   * @param {Array} gems - Array of gem objects
   */
  renderCards(gems) {
    if (!gems || !gems.length) {
      console.warn('No gems data available for creating cards');
      return;
    }
    
    // Store gems for later use
    this.gems = gems;
    
    // Also add to global HiddenGems namespace for compatibility
    if (window.HiddenGems) {
      window.HiddenGems.data = window.HiddenGems.data || {};
      window.HiddenGems.data.gems = gems;
    }
    
    // Clear existing content
    this.cardsContainer.innerHTML = '';
    this.swipeIndicator.innerHTML = '';
    
    // Create cards for each gem
    gems.forEach((gem, index) => {
      this.createCard(gem, index);
    });
    
    // Create swipe indicators
    this.createSwipeIndicators(gems.length);
    
    // Show the first card
    this.showCard(0);
    
    // Dispatch event for gems loaded into cards
    this.dispatchEvent(new CustomEvent('gems-rendered', {
      bubbles: true,
      composed: true,
      detail: { gems }
    }));
  }
  
  /**
   * Create a single gem card
   * @param {Object} gem - Gem object
   * @param {number} index - Index of the gem
   */
  createCard(gem, index) {
    // Create card element
    const card = document.createElement('div');
    card.className = 'gem-card';
    card.dataset.gemId = gem.id || `gem-${index}`;
    card.dataset.index = index;
    
    // Determine if this is the active card
    if (index === this.activeIndex) {
      card.classList.add('active');
    }
    
    // Set card visibility
    card.style.display = index === this.activeIndex ? 'flex' : 'none';
    
    // Determine gem color based on rarity or popularity
    const gemColor = this.getGemColor(gem);
    
    // Create category tags
    const categoryTags = this.createCategoryTags(gem.category_1, gem.category_2, gem.category);
    
    // Format price, time, and distance strings
    const priceDisplay = gem.dollar_sign || '';
    const timeDisplay = gem.time ? `${gem.time} min` : '';
    const distanceText = gem.distance ? `${gem.distance} miles away` : '';
    const address = gem.address || '';
    const openingHours = gem.opening_hours || '';
    
    // Create card HTML content
    card.innerHTML = `
      <div class="card-header">
        <div class="card-img-container">
          <div class="gem-icon ${gemColor}-gem"></div>
          <div class="gem-sparkle"></div>
        </div>
        <div class="card-title-section">
          <div class="card-title">${gem.name || 'Hidden Gem'}</div>
          <div class="card-subtitle">${categoryTags}</div>
          ${distanceText ? `<div class="card-distance">📍 ${distanceText}</div>` : ''}
        </div>
        ${this.activeIndex === index ? '<div class="active-marker-label">ACTIVE</div>' : ''}
      </div>
      
      <div class="card-meta">
        ${timeDisplay ? `<div class="meta-item time-meta">⏱️ ${timeDisplay}</div>` : ''}
        ${priceDisplay ? `<div class="meta-item price-meta">${priceDisplay}</div>` : ''}
        ${gem.rarity ? `<div class="meta-item rarity-meta">${this.formatRarity(gem.rarity)}</div>` : ''}
      </div>
      
      <div class="card-details">
        ${address ? `<div class="detail-item address-detail">📍 ${address}</div>` : ''}
        ${openingHours ? `<div class="detail-item hours-detail">🕒 ${openingHours}</div>` : ''}
      </div>
      
      <div class="card-description">
        ${gem.description || 'A hidden gem waiting to be explored.'}
      </div>
      
      ${this.cardVariant === 'detail' ? this.createTripDistanceInfo() : ''}
      
      ${this.cardVariant === 'detail' ? `
        <div class="card-actions">
          <button class="explore-now-btn">
            Explore Now!
          </button>
        </div>
      ` : ''}
    `;
    
    // Add to container
    this.cardsContainer.appendChild(card);
    
    // Add animation class after a short delay for transition effect
    setTimeout(() => {
      card.classList.add('visible');
    }, 50);
    
    // Add event listener to the explore button if in detail variant
    if (this.cardVariant === 'detail') {
      const exploreButton = card.querySelector('.explore-now-btn');
      if (exploreButton) {
        exploreButton.addEventListener('click', (e) => {
          e.stopPropagation(); // Don't trigger card click
          this.navigateToGemDetails(gem);
        });
      }
    }
    
    // Add click handler to the card
    card.addEventListener('click', () => {
      // Only apply marker highlighting, not card switch (since we're already on it)
      this.highlightMarker(index);
      
      // Dispatch card click event
      this.dispatchEvent(new CustomEvent('card-click', {
        bubbles: true,
        composed: true,
        detail: { gem, index }
      }));
    });
  }
  
  /**
   * Create swipe indicators
   * @param {number} count - Number of gems
   */
  createSwipeIndicators(count) {
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.dataset.index = i;
      
      if (i === this.activeIndex) {
        dot.classList.add('active');
      }
      
      // Add click handler
      dot.addEventListener('click', () => {
        this.showCard(i);
      });
      
      this.swipeIndicator.appendChild(dot);
    }
  }
  
  /**
   * Create formatted category tags
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
   * Format rarity text with icon
   * @param {string} rarity - Rarity level
   * @returns {string} Formatted rarity text
   */
  formatRarity(rarity) {
    if (!rarity) return '';
    
    // Apply icon based on rarity
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
   * @returns {string} Color string (red, purple, blue)
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
        return 'red';      // Most hidden (popularity 0-1)
      } else if (gem.popularity < 4) {
        return 'purple';   // Moderately hidden (popularity 2-3)
      }
    }
    
    return 'blue'; // Default color
  }
  
  /**
   * Create trip distance info HTML (for detail variant)
   * @returns {string} HTML for trip distance section
   */
  createTripDistanceInfo() {
    // If we don't have distance data yet
    if (!this.tripDistances.detourDistance) {
      return `
        <div class="trip-distance-info">
          <div class="distance-detail">
            <span class="distance-icon">🚗</span>
            <span class="distance-label">Trip details will load when route is set</span>
          </div>
        </div>
      `;
    }
    
    // Format distance values
    const formattedDetourDistance = this.formatDistance(this.tripDistances.detourDistance);
    const formattedExtraTime = this.formatTime(this.tripDistances.addedDistance / 50 * 60); // Rough estimate 50km/h
    
    return `
      <div class="trip-distance-info">
        <div class="distance-detail">
          <span class="distance-icon">🕒</span>
          <span class="distance-label">Visit time:</span>
          <span class="distance-value">${this.gems[this.activeIndex]?.time || '30'} min</span>
        </div>
        <div class="distance-detail">
          <span class="distance-icon">↔️</span>
          <span class="distance-label">Total detour:</span>
          <span class="distance-value">${formattedDetourDistance}</span>
        </div>
        <div class="distance-detail">
          <span class="distance-icon">+</span>
          <span class="distance-label">Adds to trip:</span>
          <span class="distance-value">${formattedExtraTime}</span>
        </div>
      </div>
    `;
  }
  
  /**
   * Format distance with appropriate units
   * @param {number} distance - Distance in kilometers
   * @returns {string} Formatted distance
   */
  formatDistance(distance) {
    if (!distance) return '0 km';
    
    if (distance < 1) {
      // Use meters for short distances
      return `${Math.round(distance * 1000)}m`;
    } else {
      // Use kilometers for longer distances
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
   * Navigate to gem details page
   * @param {Object} gem - Gem object
   */
  navigateToGemDetails(gem) {
    const gemId = gem.id || `gem-${this.activeIndex}`;
    
    // Store the selected gem ID in sessionStorage for the details page
    sessionStorage.setItem('viewGemId', gemId);
    
    // If we have coordinates, store them too
    if (gem.coordinates || gem.coords) {
      const coords = gem.coordinates || gem.coords;
      sessionStorage.setItem('viewGemCoords', JSON.stringify(coords));
    }
    
    // Dispatch navigation event before redirecting
    this.dispatchEvent(new CustomEvent('navigate-to-details', {
      bubbles: true,
      composed: true,
      detail: { gem, gemId }
    }));
    
    // Navigate to the gem details page
    window.location.href = `gem-details.html?id=${encodeURIComponent(gemId)}`;
  }
  
  /**
   * Show a specific card by index
   * @param {number} index - Index of card to show
   */
  showCard(index) {
    if (!this.gems || !this.gems.length) return;

    // Prevent recursive calls
  if (window._showingCard) {
    console.log('Already showing card, skipping to prevent recursion');
    return;
  }
  window._showingCard = true;
    
    // Keep index within bounds
    if (index < 0) index = 0;
    if (index >= this.gems.length) index = this.gems.length - 1;
    
    // Update active index
    this.activeIndex = index;
    
    // Update attribute to reflect current state
    this.setAttribute('active-index', index.toString());
    
    // Update global references for compatibility
    if (window.HiddenGems && window.HiddenGems.map) {
      window.HiddenGems.map.activeGemIndex = index;
    }
    window.activeGemIndex = index;
    
    // Hide all cards
    const cards = this.shadowRoot.querySelectorAll('.gem-card');
    cards.forEach(card => {
      card.style.display = 'none';
      card.classList.remove('active');
      
      // Remove active marker labels from all cards
      const activeLabel = card.querySelector('.active-marker-label');
      if (activeLabel) {
        activeLabel.remove();
      }
    });
    
    // Show the selected card
    const activeCard = this.shadowRoot.querySelector(`.gem-card[data-index="${index}"]`);
    if (activeCard) {
      activeCard.style.display = 'flex';
      activeCard.classList.add('active');
      activeCard.style.transform = 'translateX(0)';
      
      // Add active marker label
      if (!activeCard.querySelector('.active-marker-label')) {
        const label = document.createElement('div');
        label.className = 'active-marker-label';
        label.textContent = 'ACTIVE';
        activeCard.querySelector('.card-header').appendChild(label);
      }
    }
    
    // Update active indicator dot
    const dots = this.shadowRoot.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    
    // Highlight the corresponding marker
    this.highlightMarker(index);
    
    // Update trip distance info if in detail variant
    if (this.cardVariant === 'detail') {
      this.updateTripDistanceInfo(index);
    }
    
    // Dispatch event for card change
    this.dispatchEvent(new CustomEvent('card-change', {
      bubbles: true,
      composed: true,
      detail: { index, gem: this.gems[index] }
    }));
  }
  
  /**
   * Update trip distance info for detail variant
   * @param {number} index - Index of gem
   */
  updateTripDistanceInfo(index) {
    const gem = this.gems[index];
    if (!gem) return;
    
    // Try to calculate distances if we have route information
    const coords = gem.coordinates || gem.coords;
    if (coords) {
      this.calculateRouteDistances(coords);
    }
    
    // Update the trip distance section in the active card
    const activeCard = this.shadowRoot.querySelector('.gem-card.active');
    if (activeCard) {
      const tripInfoSection = activeCard.querySelector('.trip-distance-info');
      if (tripInfoSection) {
        tripInfoSection.innerHTML = this.createTripDistanceInfo().replace('<div class="trip-distance-info">', '').replace('</div>', '');
      }
    }
  }
  
  /**
   * Calculate route distances
   * @param {Array} gemCoords - Coordinates of the gem [lng, lat]
   */
  calculateRouteDistances(gemCoords) {
    // Get origin and destination coordinates
    let originCoords, destinationCoords;
    
    try {
      originCoords = JSON.parse(sessionStorage.getItem('originCoords'));
      destinationCoords = JSON.parse(sessionStorage.getItem('destinationCoords'));
    } catch (error) {
      console.warn('Error parsing origin/destination coordinates from sessionStorage:', error);
    }
    
    if (!originCoords || !destinationCoords || !gemCoords) {
      console.log('Missing coordinates for distance calculation');
      return;
    }
    
    // Calculate direct distance (origin to destination)
    const directDistance = this.calculateHaversineDistance(
      originCoords[1], originCoords[0], 
      destinationCoords[1], destinationCoords[0]
    );
    
    // Calculate detour distances (origin to gem, gem to destination)
    const originToGemDistance = this.calculateHaversineDistance(
      originCoords[1], originCoords[0],
      gemCoords[1], gemCoords[0]
    );
    
    const gemToDestinationDistance = this.calculateHaversineDistance(
      gemCoords[1], gemCoords[0],
      destinationCoords[1], destinationCoords[0]
    );
    
    // Calculate total detour distance
    const detourDistance = originToGemDistance + gemToDestinationDistance;
    
    // Calculate added distance (total detour - direct route)
    const addedDistance = detourDistance - directDistance;
    
    // Store the distances
    this.tripDistances = {
      directDistance,
      detourDistance,
      addedDistance,
      originToGemDistance,
      gemToDestinationDistance
    };
  }
  
  /**
   * Calculate Haversine distance between two points
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lon1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lon2 - Longitude of point 2
   * @returns {number} Distance in kilometers
   */
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  /**
   * Convert degrees to radians
   * @param {number} value - Value in degrees
   * @returns {number} Value in radians
   */
  toRad(value) {
    return value * Math.PI / 180;
  }
  
  /**
   * Highlight the active marker on the map
   * @param {number} index - Index of the marker to highlight
   */
  highlightMarker(index) {
  // First try using the global highlightGemMarker function
  if (typeof window.highlightGemMarker === 'function') {
    // Check if we're already in an update cycle to prevent recursion
    if (window._updatingCard) {
      console.log('Skipping marker highlight to prevent recursion');
      return;
    }
    window.highlightGemMarker(index, true); // Use true to skip card updates (avoid recursion)
    return;
  }
    
    // Next try direct marker update if markerId provided
    if (this.markerId) {
      const markers = document.querySelectorAll(this.markerId);
      
      markers.forEach((marker, i) => {
        if (i === index) {
          // Active marker
          marker.style.transform = 'scale(1.4)';
          marker.style.zIndex = '100';
          marker.style.filter = 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.3))';
          
          // Add pulsing effect if not already present
          if (!marker.querySelector('.pulse-effect')) {
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
            marker.appendChild(pulse);
            
            // Add pulse animation if not already in document
            if (!document.getElementById('gem-cards-pulse-style')) {
              const style = document.createElement('style');
              style.id = 'gem-cards-pulse-style';
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
          // Inactive marker
          marker.style.transform = 'scale(1.0)';
          marker.style.zIndex = '1';
          marker.style.filter = 'none';
          
          // Remove pulse effect if present
          const pulse = marker.querySelector('.pulse-effect');
          if (pulse) pulse.remove();
        }
      });
    }
    
    // Finally try map markers if available on window
    else if (window.markers && window.markers.length > 0) {
      window.markers.forEach((marker, i) => {
        if (!marker || !marker.getElement)
            return;
        
        const el = marker.getElement();
        if (!el) return;
        
        if (i === index) {
          // Active marker
          el.style.transform = 'scale(1.4)';
          el.style.zIndex = '100';
          el.style.filter = 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.3))';
          
          // Add pulse effect if not already present
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
                  0% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.6); }
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
          
          // Remove pulse effect if present
          const pulse = el.querySelector('.pulse-effect');
          if (pulse) pulse.remove();
        }
      });
    }
    
    // Dispatch event for marker highlight
    this.dispatchEvent(new CustomEvent('marker-highlight', {
      bubbles: true,
      composed: true,
      detail: { index }
    }));
  }
  
  /**
   * Show a notification popup
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} icon - Icon to show (emoji)
   */
  showNotification(title, message, icon = '💎') {
    // Check if notification already exists
    let notification = this.shadowRoot.querySelector('.gem-notification');
    
    // If not, create one
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'gem-notification';
      this.shadowRoot.appendChild(notification);
    }
    
    // Set content
    notification.innerHTML = `
      <div class="notification-icon">${icon}</div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
    `;
    
    // Show notification with animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3000);
  }
  
  /**
   * Public API: Set gems data
   * @param {Array} gems - Array of gem objects
   */
  setGems(gems) {
    if (Array.isArray(gems) && gems.length > 0) {
      this.renderCards(gems);
    }
  }
  
  /**
   * Public API: Get current gems data
   * @returns {Array} Current gems data
   */
  getGems() {
    return this.gems;
  }
  
  /**
   * Public API: Get active gem
   * @returns {Object} Active gem object
   */
  getActiveGem() {
    if (this.gems && this.activeIndex >= 0 && this.activeIndex < this.gems.length) {
      return this.gems[this.activeIndex];
    }
    return null;
  }
  
  /**
   * Public API: Set variant
   * @param {string} variant - Card variant ('index' or 'detail')
   */
  setVariant(variant) {
    if (variant === 'index' || variant === 'detail') {
      this.cardVariant = variant;
      this.setAttribute('variant', variant);
      this.updateVariant();
    }
  }
  
  /**
   * Public API: Set marker ID for highlighting
   * @param {string} markerId - CSS selector for map markers
   */
  setMarkerId(markerId) {
    this.markerId = markerId;
    this.setAttribute('marker-id', markerId);
  }
  
  /**
   * Public API: Set trip distances
   * @param {Object} distances - Distance calculation object
   */
  setTripDistances(distances) {
    this.tripDistances = distances;
    this.updateTripDistanceInfo(this.activeIndex);
  }
}

// Register the custom element
customElements.define('gem-cards', GemCards);

/**
 * Add a simple highlight gems function that works with the custom element
 * @param {number} index - Index of gem to highlight
 * @param {boolean} skipCardUpdate - Whether to skip updating the cards (to avoid recursion)
 */
window.highlightGemMarker = function(index, skipCardUpdate = false) {
  // Update map markers
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
              0% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.6); }
              70% { box-shadow: 0 0 0 10px rgba(66, 133, 244, 0); }
              100% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0); }
            }
          `;
          document.head.appendChild(style);
        }
      }
      
      // If map is available, fly to marker location
   //   if (window.map && marker.getLngLat) {
   //     window.map.flyTo({
   //       center: marker.getLngLat(),
   //       zoom: 11,
   //       duration: 500
   //     });
   //   }
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
  
  // Update global active gem index
  window.activeGemIndex = index;
  if (window.HiddenGems && window.HiddenGems.map) {
    window.HiddenGems.map.activeGemIndex = index;
  }
  
  // Update gem-cards element if not skipping card update
  if (!skipCardUpdate) {
  const gemCards = document.querySelector('gem-cards');
  if (gemCards) {
    // Set a flag to prevent recursion
    window._updatingCard = true;
    gemCards.showCard(index);
    window._updatingCard = false;
  }
}
  
  // Dispatch a global event for other components
  document.dispatchEvent(new CustomEvent('gemSelected', {
    detail: { index, id: window.HiddenGems?.data?.gems?.[index]?.id }
  }));
};

/**
 * Global function to go to a specific gem
 * @param {number} index - Index of the gem to display
 */
window.goToGem = function(index) {
  const gemCards = document.querySelector('gem-cards');
  if (gemCards) {
    gemCards.showCard(index);
  } else {
    // Fallback to highlighting just the marker
    window.highlightGemMarker(index);
  }
};