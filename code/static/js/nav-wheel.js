// nav-wheel.js - Simplified navigation wheel

/**
 * Initialize the navigation wheel
 */
function initNavWheel() {
  // Get elements
  const toggle = document.getElementById('nav-toggle');
  const items = document.getElementById('nav-items');
  
  if (!toggle || !items) {
    console.error('Navigation wheel elements not found');
    return;
  }
  
  // Toggle function
  function toggleNav() {
    toggle.classList.toggle('active');
    items.classList.toggle('active');
    
    if (toggle.classList.contains('active')) {
      toggle.innerHTML = '×';
    } else {
      toggle.innerHTML = '☰';
    }
  }
  
  // Toggle on button click
  toggle.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleNav();
  });
  
  // Close when clicking outside
  document.addEventListener('click', function(e) {
    if (items.classList.contains('active') && 
        !e.target.closest('.nav-wheel-container')) {
      toggle.classList.remove('active');
      items.classList.remove('active');
      toggle.innerHTML = '☰';
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && items.classList.contains('active')) {
      toggle.classList.remove('active');
      items.classList.remove('active');
      toggle.innerHTML = '☰';
    }
  });
}

/**
 * Add a nav item programmatically
 * @param {Object} options - Item options
 * @param {string} options.label - Item label
 * @param {string} options.icon - Item emoji icon
 * @param {string} options.href - Item link URL
 * @param {Function} options.onClick - Click handler (optional)
 */
function addNavItem(options) {
  const navItems = document.getElementById('nav-items');
  if (!navItems) return;
  
  // Create the nav item
  const item = document.createElement('a');
  item.className = 'nav-item';
  item.href = options.href || '#';
  
  // Create the icon
  const icon = document.createElement('div');
  icon.className = 'nav-icon';
  icon.textContent = options.icon || '🔍';
  
  // Create the label
  const label = document.createElement('div');
  label.className = 'nav-label';
  label.textContent = options.label || 'Navigation';
  
  // Assemble the item
  item.appendChild(icon);
  item.appendChild(label);
  
  // Add click handler if provided
  if (typeof options.onClick === 'function') {
    item.addEventListener('click', function(e) {
      // Prevent default only if href is '#' or similar
      if (options.href === '#' || !options.href) {
        e.preventDefault();
      }
      options.onClick(e);
    });
  }
  
  // Add to navigation items
  navItems.appendChild(item);
  
  // Update positioning
  updateNavItemPositions();
}

/**
 * Update the positions of all nav items
 */
function updateNavItemPositions() {
  const navItems = document.getElementById('nav-items');
  if (!navItems) return;
  
  const items = navItems.querySelectorAll('.nav-item');
  const count = items.length;
  
  if (count <= 0) return;
  
  // Positioning based on number of items
  if (count === 2) {
    // Two items, position at angles
    items[0].style.transform = 'translate(-60px, -5px) scale(0.8)';
    items[1].style.transform = 'translate(-90px, -10px) scale(0.8)';
    
    if (navItems.classList.contains('active')) {
      items[0].style.transform = 'translate(-60px, -5px) scale(1)';
      items[1].style.transform = 'translate(-90px, -10px) scale(1)';
    }
  }
  
  // Update active styles
  const activeStyles = document.styleSheet || document.createElement('style');
  if (!document.styleSheet) {
    document.head.appendChild(activeStyles);
    document.styleSheet = activeStyles;
  }
  
  // Generate CSS for active states
  let css = '';
  items.forEach((item, index) => {
    const transform = item.style.transform.replace('scale(0.8)', 'scale(1)');
    css += `.nav-items.active .nav-item:nth-child(${index + 1}) { transform: ${transform}; }\n`;
  });
  
  activeStyles.textContent = css;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initNavWheel);

// Export functions for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initNavWheel,
    addNavItem,
    updateNavItemPositions
  };
}