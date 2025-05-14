/**
 * nav-wheel.js
 */

class NavWheel extends HTMLElement {
  constructor() {
    super();
    
    // Create a shadow DOM
    this.attachShadow({ mode: 'open' });
    
    // Define the HTML structure
    this.shadowRoot.innerHTML = `
      <style>
        /* Navigation wheel container */
        .nav-wheel-container {
          position: fixed;
          bottom: 120px;
          right: 20px;
          z-index: 1000;
        }
        
        /* Navigation wheel */
        .nav-wheel {
          position: absolute;
          bottom: 0;
          right: 0;
          display: none;
          z-index: 999;
          width: 240px;
          height: 240px;
          transform-origin: bottom right;
          gap: 4px;
        }
        
        .nav-wheel.active {
          display: block;
        }
        
        /* Toggle button */
        .nav-wheel-button {
            background-color: #94c9ba;
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
            transition: transform 0.3s;
            z-index: 1000;
          }
        
        .nav-wheel-button:hover {
          transform: scale(1.1);
          background-color: #7fb7a7;
        }
        
        .nav-wheel-button.active {
          transform: rotate(45deg);
        }
        
        /* Critical fix for slotted elements */
        ::slotted(nav-item) {
          display: block !important;
          opacity: 1 !important;
          visibility: visible !important;
          position: absolute !important;
          pointer-events: auto !important;
          z-index: 1000 !important;
        }
        
        /* Backdrop */
        .nav-wheel-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.2);
          z-index: 998;
          display: none;
          opacity: 0;
          transition: opacity 0.3s;
        }
        
        .nav-wheel-backdrop.active {
          display: block;
          opacity: 1;
        }
      </style>
      
      <div class="nav-wheel-backdrop" id="nav-wheel-backdrop"></div>
      <div class="nav-wheel-container">
        <div class="nav-wheel" id="nav-wheel">
          <slot></slot>
        </div>
        <div class="nav-wheel-button" id="nav-wheel-toggle">☰</div>
      </div>
    `;
    
    // Get references to elements
    this.navWheel = this.shadowRoot.getElementById('nav-wheel');
    this.toggleButton = this.shadowRoot.getElementById('nav-wheel-toggle');
    this.backdrop = this.shadowRoot.getElementById('nav-wheel-backdrop');
    
    // Add event listener for toggle button
    this.toggleButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._toggleWheel();
    });
    
    // Add event listener for backdrop click
    this.backdrop.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._closeWheel();
    });
    
    // Add event listener for escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.navWheel.classList.contains('active')) {
        this._closeWheel();
      }
    });
    
  }
  
  connectedCallback() {
    
    // Delay initialization to ensure DOM is fully loaded
    setTimeout(() => {
      this._initializeNavItems();
      this._positionNavItems();
    }, 500);
  }
  
  /**
   * Initialize nav items
   * @private
   */
  _initializeNavItems() {
    const navItems = Array.from(this.querySelectorAll('nav-item'));
    
    navItems.forEach(item => {
      // Set initial visibility
      item.style.display = 'block';
      item.style.pointerEvents = 'auto';
      item.style.visibility = 'visible';
      
      // Set a direct label text to ensure visibility
      const label = item.getAttribute('label');
      item.setAttribute('direct-label', label);
      
    });
  }
  
  /**
   * Toggle the wheel
   * @private
   */
  _toggleWheel() {
    const isActive = this.navWheel.classList.contains('active');
    
    if (isActive) {
      this._closeWheel();
    } else {
      this._openWheel();
    }
  }
  
  /**
   * Open the wheel
   * @private
   */
  _openWheel() {
    
    // Position items before showing
    this._positionNavItems();
    
    // Show the wheel
    this.navWheel.classList.add('active');
    this.toggleButton.classList.add('active');
    this.toggleButton.innerHTML = '×';
    this.backdrop.classList.add('active');
    
    // Show nav items with animation
    this._showNavItems();
    
    // Dispatch event
    this.dispatchEvent(new CustomEvent('wheelToggle', {
      bubbles: true,
      composed: true,
      detail: { isOpen: true }
    }));
  }
  
  /**
   * Close the wheel
   * @private
   */
  _closeWheel() {
    
    // Hide items first with animation
    this._hideNavItems();
    
    // Use a delay to allow animation to complete
    setTimeout(() => {
      // Hide the wheel
      this.navWheel.classList.remove('active');
      this.toggleButton.classList.remove('active');
      this.toggleButton.innerHTML = '☰';
      this.backdrop.classList.remove('active');
      
      // Dispatch event
      this.dispatchEvent(new CustomEvent('wheelToggle', {
        bubbles: true,
        composed: true,
        detail: { isOpen: false }
      }));
    }, 300);
  }
  
  /**
   * Position nav items in a radial pattern
   * @private
   */
  _positionNavItems() {
    // Get all nav-item elements
    const navItems = Array.from(this.querySelectorAll('nav-item'));
    const totalItems = navItems.length;
    
    if (totalItems === 0) {
      console.warn('No nav items found to position');
      return;
    }
    
    
    // Calculate positions in a circle
    const radius = 70; // Distance from center in pixels
    const offsetAngle = -90; // Start from top (in degrees)
    
    navItems.forEach((item, index) => {
      // Calculate angle based on index and total items
      const angle = [-45, 45][index];      
      // Convert angle to radians
      const radians = angle * (Math.PI / 180);
      
      // Calculate x and y positions
      const x = Math.cos(radians) * radius - 30;
      const y = Math.sin(radians) * radius;
      
      // Position the item
      item.style.position = 'absolute';
      item.style.left = `calc(50% + ${x}px - 38px)`;  // Centered with wider items
      item.style.top = `calc(50% + ${y}px - 38px)`;   // Centered with taller items
      
      // Ensure visibility
      item.style.opacity = '1';
      item.style.visibility = 'visible';
      item.style.display = 'block';
      item.style.pointerEvents = 'auto';
      item.style.zIndex = '1000';
      
      // Store the angle for animations
      item.dataset.angle = angle;
      
      // Force item to show icon and label
      if (typeof item.forceShow === 'function') {
        item.forceShow();
      }
      
    });
  }
  
  /**
   * Show nav items with animation
   * @private
   */
  _showNavItems() {
    const navItems = Array.from(this.querySelectorAll('nav-item'));
    
    navItems.forEach((item, index) => {
      // Show with staggered animation
      const delay = 50 * index;
      
      setTimeout(() => {
        item.style.opacity = '1';
        item.style.transform = 'scale(1)';
        item.style.transition = 'opacity 0.3s, transform 0.3s';
        
        // Tell the item to show itself
        if (typeof item.showItem === 'function') {
          item.showItem();
        }
      }, delay);
    });
  }
  
  /**
   * Hide nav items with animation
   * @private
   */
  _hideNavItems() {
    const navItems = Array.from(this.querySelectorAll('nav-item'));
    
    navItems.forEach(item => {
      item.style.opacity = '0';
      item.style.transform = 'scale(0.8)';
      
      // Tell the item to hide itself
      if (typeof item.hideItem === 'function') {
        item.hideItem();
      }
    });
  }
}

/**
 * NavItem component - NAVIGATION FIXED VERSION
 */
class NavItem extends HTMLElement {
  constructor() {
    super();
    
    this.attachShadow({ mode: 'open' });
    
    // Get attributes
    const label = this.getAttribute('label') || '';
    const href = this.getAttribute('href') || '#';
    const icon = this.getAttribute('icon') || '';

    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 76px;
          height: 76px;
          z-index: 1000;
          transition: opacity 0.3s, transform 0.3s;
          opacity: 1;
        }
        
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          width: 100%;
          height: 100%;
        }
        
        .nav-icon {
          background-color: #94c9ba;
          color: white;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 24px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s, background-color 0.2s;
            font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;

        }
        
        .nav-icon:active {
          transform: scale(0.95);
          background-color: #7fb7a7;
        }
        
        .nav-label-container {
          background-color: #94c9ba;
          padding: 4px 8px;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 30px;
        }
        
        .nav-label-text {
          color: white;
          font-family: Arial, sans-serif;
          font-size: 11px;
          font-weight: bold;
          white-space: nowrap;
          display: inline-block;
        }
        
        /* Hidden link for forced navigation */
        .nav-direct-link {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }
      </style>
      
      <div class="nav-item" id="nav-item">
  <div class="nav-icon" id="icon-display" style="
      background-color: #94c9ba;
      color: white;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
font-size: 28px;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
  line-height: 1;      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);"></div>
  <div class="nav-label-container">
    <span class="nav-label-text">${label}</span>
  </div>
    <a href="${href}" class="nav-direct-link" id="direct-link"></a>
</div>

    `;
    
    // Store href for navigation
    this._href = href;
    
    // Get direct link element
    this.directLink = this.shadowRoot.getElementById('direct-link');
    
    // Add click event with direct navigation
    this.shadowRoot.getElementById('nav-item').addEventListener('click', this._handleClick.bind(this));
    
  }
  
  /**
   * Handle click event with multiple navigation methods
   * @private
   */
  _handleClick(e) {
    // Don't prevent default - let the event bubble to the link if it exists
    e.stopPropagation();
    
    const label = this.getAttribute('label');
    const href = this.getAttribute('href');
    
    // Method 1: Use the direct link (most reliable)
    if (this.directLink) {
      // Programmatically click the link
      this.directLink.click();
    } else {
      // Method 2: Use window.location directly
      setTimeout(() => {
        if (this._href.startsWith('#')) {
          // For function calls
          const functionName = this._href.substring(1);
          if (window[functionName] && typeof window[functionName] === 'function') {
            window[functionName]();
          }
        } else {
          // For regular navigation
          window.location.href = this._href;
        }
      }, 150);
    }
    
    // Close the wheel regardless of navigation method
    this._closeParentWheel();
  }
  
  connectedCallback() {
    
    // Initialize visibility
    this.style.opacity = '1';
    this.style.transform = 'scale(1)';
    this.style.display = 'block';
    this.style.pointerEvents = 'auto';
    this.style.visibility = 'visible';
  }
  
  /**
   * Force show this item
   */
  forceShow() {
    this.style.display = 'block';
    this.style.opacity = '1';
    this.style.visibility = 'visible';
    this.style.pointerEvents = 'auto';
    
    // Make sure components are visible
    const iconEl = this.shadowRoot.querySelector('.nav-icon');
    const labelContainer = this.shadowRoot.querySelector('.nav-label-container');
    const labelText = this.shadowRoot.querySelector('.nav-label-text');
    
    if (iconEl) {
      iconEl.style.opacity = '1';
      iconEl.style.visibility = 'visible';
    }
    
    if (labelContainer) {
      labelContainer.style.opacity = '1';
      labelContainer.style.visibility = 'visible';
    }
    
    if (labelText) {
      labelText.style.opacity = '1';
      labelText.style.visibility = 'visible';
      labelText.style.display = 'inline-block';
    }
    
  }
  
  /**
   * Show this item
   */
  showItem() {
    this.style.opacity = '1';
    this.style.transform = 'scale(1)';
    this.style.display = 'block';
    
    // Ensure label is visible
    const labelText = this.shadowRoot.querySelector('.nav-label-text');
    if (labelText) {
      labelText.style.opacity = '1';
      labelText.style.visibility = 'visible';
      labelText.style.display = 'inline-block';
    }
  }
  
  /**
   * Hide this item
   */
  hideItem() {
    this.style.opacity = '0';
    this.style.transform = 'scale(0.8)';
  }
  
  /**
   * Close the parent wheel
   * @private
   */
  _closeParentWheel() {
    const navWheel = this.closest('nav-wheel');
    if (navWheel) {
      if (typeof navWheel._closeWheel === 'function') {
        navWheel._closeWheel();
      }
    }
  }
  
  /**
   * When attributes change
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'label' && this.shadowRoot) {
      const labelText = this.shadowRoot.querySelector('.nav-label-text');
      if (labelText) {
        labelText.textContent = newValue;
      }
    } else if (name === 'href' && this.shadowRoot) {
      // Update the direct link href
      const directLink = this.shadowRoot.querySelector('.nav-direct-link');
      if (directLink) {
        directLink.setAttribute('href', newValue);
        this._href = newValue;
      }
    }
    else if (name === 'icon' && this.shadowRoot) {
      const iconEl = this.shadowRoot.querySelector('.nav-icon');
      if (iconEl) {
        iconEl.textContent = newValue;
      }
    }
  }
  
  static get observedAttributes() {
    return ['label', 'href', 'icon'];
  }
}

// Register custom elements
customElements.define('nav-wheel', NavWheel);
customElements.define('nav-item', NavItem);

// Add global event listener for wheel toggle events
document.addEventListener('wheelToggle', function(e) {
});

// Add initialization on document ready
document.addEventListener('DOMContentLoaded', () => {
  
  // Force the initialization after a delay
  setTimeout(() => {
    const navWheels = document.querySelectorAll('nav-wheel');
    navWheels.forEach(wheel => {
      if (typeof wheel._initializeNavItems === 'function') {
        wheel._initializeNavItems();
        wheel._positionNavItems();
      }
      
    });
  }, 1000);
});

// Add a global helper to force navigation
window.navigateTo = function(url) {
  if (!url) return;
  window.location.href = url;
};

// Expose utility function globally
window.toggleNavWheel = function() {
  const navWheel = document.querySelector('nav-wheel');
  if (navWheel && navWheel.shadowRoot) {
    const toggleButton = navWheel.shadowRoot.querySelector('#nav-wheel-toggle');
    if (toggleButton) {
      toggleButton.click();
    }
  }
};

// Debug script to help trace navigation issues
(function() {
  
  // Monitor navigation attempts
  const originalAssign = window.location.assign;
  const originalReplace = window.location.replace;
  const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href');
  
  // Override location.assign
  window.location.assign = function(url) {
    return originalAssign.apply(this, arguments);
  };
  
  // Override location.replace
  window.location.replace = function(url) {
    return originalReplace.apply(this, arguments);
  };
  
  // Monitor click events on links
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link && link.href) {
    }
  }, true);
})();