/**
 * nav-wheel.js
 * Custom web component for the navigation wheel with radial expansion
 * Complete fresh implementation with all enhancements
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
          bottom: 120px; /* Positioned higher to allow space for cards below */
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
        }
        
        .nav-wheel.active {
          display: block;
        }
        
        /* Toggle button */
        .nav-wheel-button {
          background-color: #222;
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
          position: relative;
          z-index: 1000;
        }
        
        .nav-wheel-button:hover {
          transform: scale(1.1);
        }
        
        .nav-wheel-button.active {
          transform: rotate(45deg);
        }
        
        /* Force menu items to be visible */
        ::slotted(nav-item) {
          opacity: 1 !important;
          pointer-events: auto !important;
          visibility: visible !important;
        }
      </style>
      
      <div class="nav-wheel-container">
        <div class="nav-wheel" id="nav-wheel">
          <slot></slot>
        </div>
        <div class="nav-wheel-button" id="nav-wheel-toggle">☰</div>
      </div>
    `;
    
    // Add event listener for toggle button
    this.shadowRoot.getElementById('nav-wheel-toggle').addEventListener('click', () => {
      const navWheel = this.shadowRoot.getElementById('nav-wheel');
      const toggleButton = this.shadowRoot.getElementById('nav-wheel-toggle');
      
      navWheel.classList.toggle('active');
      toggleButton.classList.toggle('active');
      
      // When wheel becomes active, position the nav items in a radial pattern
      this._positionNavItems();
      
      // Trigger an event that can be caught by the page to update visibility
      this.dispatchEvent(new CustomEvent('wheelToggle', {
        bubbles: true,
        composed: true,
        detail: { isOpen: navWheel.classList.contains('active') }
      }));
    });
  }
  
  connectedCallback() {
    // Once the component is added to the DOM, we can access its children
    // Wait for a moment to ensure all slots are populated
    setTimeout(() => {
      this._positionNavItems();
    }, 100);
  }
  
  /**
   * Position nav items in a radial/star pattern
   * @private
   */
  _positionNavItems() {
    // Get all nav-item elements
    const navItems = Array.from(this.querySelectorAll('nav-item'));
    const totalItems = navItems.length;
    
    if (totalItems === 0) return;
    
    // Calculate positions in a circle around the center
    const radius = 90; // Distance from center
    const offsetAngle = -90; // Start from top (in degrees)
    
    navItems.forEach((item, index) => {
      // Calculate angle based on index and total items
      const angle = offsetAngle + (360 / totalItems) * index;
      
      // Convert angle to radians
      const radians = angle * (Math.PI / 180);
      
      // Calculate x and y positions
      const x = Math.cos(radians) * radius;
      const y = Math.sin(radians) * radius;
      
      // Apply position directly to the nav-item element
      item.style.position = 'absolute';
      item.style.transform = `translate(${x}px, ${y}px)`;
      item.style.left = '50%';
      item.style.top = '50%';
      item.style.marginLeft = '-24px'; // Half of nav-item width
      item.style.marginTop = '-24px'; // Half of nav-item height
      item.style.opacity = '1';
      item.style.visibility = 'visible';
      
      // Store the angle for animations if needed
      item.dataset.angle = angle;
      
      // Ensure the wheel is initially closed
      const navWheel = this.shadowRoot.getElementById('nav-wheel');
      if (!navWheel.classList.contains('active')) {
        item.style.display = 'none';
      } else {
        item.style.display = 'block';
      }
    });
  }
}

// Define the nav-item component
class NavItem extends HTMLElement {
  constructor() {
    super();
    
    this.attachShadow({ mode: 'open' });
    
    // Get attributes
    const label = this.getAttribute('label') || '';
    const icon = this.getAttribute('icon') || '';
    const href = this.getAttribute('href') || '#';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          opacity: 1;
          visibility: visible;
        }
        
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          cursor: pointer;
          opacity: 1;
          visibility: visible;
          /* Override any transforms from parent */
          position: relative;
        }
        
        .nav-icon {
          background-color: #222;
          color: white;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 24px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          margin-bottom: 8px;
          transition: transform 0.2s;
          z-index: 1;
        }
        
        .nav-icon:hover {
          transform: scale(1.1);
        }
        
        .nav-label {
          background-color: #222;
          color: white;
          padding: 5px 10px;
          border-radius: 12px;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          white-space: nowrap;
          position: absolute;
          bottom: -30px;
          opacity: 0;
          transition: opacity 0.2s, transform 0.2s;
          transform: translateY(5px);
          pointer-events: none;
        }
        
        .nav-item:hover .nav-label {
          opacity: 1;
          transform: translateY(0);
        }
        
        /* Animation for appearing */
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        
        :host(.visible) .nav-icon {
          animation: fadeIn 0.3s ease-out forwards;
        }
      </style>
      
      <div class="nav-item" id="nav-item">
        <div class="nav-icon">${icon}</div>
        <div class="nav-label">${label}</div>
      </div>
    `;
    
    // Add click event to navigate
    this.shadowRoot.getElementById('nav-item').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (href.startsWith('#')) {
        // For function calls like #shuffleGems
        const functionName = href.substring(1);
        if (window[functionName] && typeof window[functionName] === 'function') {
          window[functionName]();
        }
      } else {
        // For regular navigation
        window.location.href = href;
      }
    });
  }
  
  // Show the nav item with a staggered animation
  showWithDelay(delay) {
    setTimeout(() => {
      this.classList.add('visible');
    }, delay);
  }
}

/**
 * Update visibility of nav items and manage animations
 * @param {boolean} isVisible - Whether items should be visible
 */
function showNavItems(isVisible) {
  const navWheel = document.querySelector('nav-wheel');
  if (!navWheel) return;
  
  const navItems = Array.from(navWheel.querySelectorAll('nav-item'));
  
  navItems.forEach((item, index) => {
    // Reset all items
    item.classList.remove('visible');
    
    if (isVisible) {
      // Show with staggered animation
      const delay = 50 * index;
      item.style.display = 'block';
      item.showWithDelay(delay);
    } else {
      // Hide immediately
      setTimeout(() => {
        if (!navWheel.shadowRoot.querySelector('.nav-wheel').classList.contains('active')) {
          item.style.display = 'none';
        }
      }, 300); // Wait for fade out animation
    }
  });
}

/**
 * Helper function to toggle the wheel
 */
function toggleNavWheel() {
  const navWheel = document.querySelector('nav-wheel');
  if (!navWheel) return;
  
  const toggleButton = navWheel.shadowRoot.querySelector('#nav-wheel-toggle');
  if (toggleButton) {
    toggleButton.click();
  }
}

/**
 * Shuffle the currently displayed gems
 */
function shuffleGems() {
  // Use data controller function directly
  if (window.HiddenGemsData && typeof window.HiddenGemsData.shuffleGems === 'function') {
    window.HiddenGemsData.shuffleGems();
  } else {
    // Fallback to original implementation
    window.loadGems({
      limit: 10,
      random: true
    });
  }
}

/**
 * Find gems near the user's location
 */
function findNearbyGems() {
  // Show loading animation
  window.HiddenGems.utils.showLoading('Finding nearby gems...');
  
  // Try to get the user's location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        const userLocation = [position.coords.longitude, position.coords.latitude];
        window.loadGems({
          center: userLocation,
          radius: window.HiddenGems.constants.DEFAULT_RADIUS,
          limit: window.HiddenGems.constants.DEFAULT_LIMIT
        });
      },
      // Error callback
      (error) => {
        console.error('Geolocation error:', error);
        // Fall back to default location (Berkeley)
        window.loadGems({
          center: window.HiddenGems.constants.DEFAULT_CENTER,
          radius: window.HiddenGems.constants.DEFAULT_RADIUS,
          limit: window.HiddenGems.constants.DEFAULT_LIMIT
        });
      },
      // Options
      {
        timeout: 10000,
        maximumAge: 60000
      }
    );
  } else {
    // Geolocation not supported, fallback to default
    window.loadGems({
      center: window.HiddenGems.constants.DEFAULT_CENTER,
      radius: window.HiddenGems.constants.DEFAULT_RADIUS,
      limit: window.HiddenGems.constants.DEFAULT_LIMIT
    });
  }
}

// Register the custom elements
customElements.define('nav-wheel', NavWheel);
customElements.define('nav-item', NavItem);

// Add event listener to document to catch wheel toggle events
document.addEventListener('wheelToggle', (e) => {
  showNavItems(e.detail.isOpen);
});

// Add event listener to document ready
document.addEventListener('DOMContentLoaded', () => {
  // Initial setup to ensure nav items are correctly displayed/hidden
  const navWheel = document.querySelector('nav-wheel');
  if (navWheel) {
    const wheelEl = navWheel.shadowRoot.querySelector('.nav-wheel');
    const isOpen = wheelEl && wheelEl.classList.contains('active');
    showNavItems(isOpen);
    
    // Additional forced initialization
    setTimeout(() => {
      const navItems = navWheel.querySelectorAll('nav-item');
      navItems.forEach(item => {
        // Ensure icons are visible
        const iconEl = item.shadowRoot && item.shadowRoot.querySelector('.nav-icon');
        if (iconEl) {
          iconEl.style.opacity = '1';
          iconEl.style.visibility = 'visible';
        }
      });
    }, 500);
  }
});

// Make utility functions available globally
window.toggleNavWheel = toggleNavWheel;
window.showNavItems = showNavItems;
window.shuffleGems = shuffleGems;
window.findNearbyGems = findNearbyGems;