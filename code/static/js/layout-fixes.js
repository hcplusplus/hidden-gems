/**
 * layout-fixes.js
 * Comprehensive fixes for map display, card swiping, navigation wheel, and legends
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Layout fixes initialized');
  
  // Fix 1: Correct map bounds and gem positioning
  fixMapBounds();
  
  // Fix 2: Enhance card swiping
  enhanceCardSwipe();
  
  // Fix 3: Reposition navigation wheel
  repositionNavWheel();
  
  // Fix 4: Reposition legend
  repositionLegend();
  
  // Fix 5: Ensure proper map container size
  fixMapContainer();
});

/**
 * Fix map bounds to ensure gems appear on the visible map
 */
function fixMapBounds() {
  // Wait for map to be available
  const waitForMap = setInterval(() => {
    if (window.HiddenGems.map) {
      clearInterval(waitForMap);
      
      // Add event listener for when map is fully loaded
      window.HiddenGems.map.on('load', function() {
        console.log('Map loaded, fixing bounds');
        
        // After gems are loaded, adjust the map to show all markers
        document.addEventListener('gemsLoaded', function(event) {
          if (event.detail && event.detail.gems && event.detail.gems.length > 0) {
            console.log('Gems loaded, adjusting map bounds');
            
            // Create bounds from all gem coordinates
            const bounds = new maplibregl.LngLatBounds();
            
            // Add each gem's coordinates to the bounds
            event.detail.gems.forEach(gem => {
              const coords = gem.coords || gem.coordinates;
              if (coords && coords.length === 2) {
                // Ensure coordinates are in the right format [lng, lat]
                const [a, b] = coords;
                const lngLat = (Math.abs(a) > 90 && Math.abs(b) <= 90) ? [a, b] : [b, a];
                
                // Only add valid coordinates to bounds
                if (window.HiddenGems.utils.isValidCoordinate(lngLat[0], lngLat[1])) {
                  bounds.extend(lngLat);
                }
              }
            });
            
            // Only fit bounds if we have valid coordinates
            if (!bounds.isEmpty()) {
              // Fit map to show all markers with generous padding
              window.HiddenGems.map.fitBounds(bounds, {
                padding: {
                  top: 100,
                  bottom: 220, // More padding at bottom for cards
                  left: 50,
                  right: 50
                },
                maxZoom: 12, // Prevent zooming in too far
                animate: true,
                duration: 1000
              });
            }
          }
        });
      });
    }
  }, 100);
}

/**
 * Enhance card swipe functionality
 */
function enhanceCardSwipe() {
  // Wait for swipe module to be available
  const waitForSwipe = setInterval(() => {
    if (window.HiddenGems && window.HiddenGems.swipe) {
      clearInterval(waitForSwipe);
      
      // Extend the swipe functionality
      const originalInit = window.HiddenGems.swipe.init;
      
      // Override the init function with improved version
      window.HiddenGems.swipe.init = function() {
        console.log('Enhanced swipe initialized');
        
        // Call the original init
        if (typeof originalInit === 'function') {
          originalInit.call(window.HiddenGems.swipe);
        }
        
        // Add enhanced functionality
        const cardsContainer = document.querySelector('.cards-container');
        if (!cardsContainer) return;
        
        // Add visual cue for swiping
        const swipeHint = document.createElement('div');
        swipeHint.className = 'swipe-hint';
        swipeHint.innerHTML = '<div class="swipe-arrow left">←</div><div class="swipe-text">Swipe to explore gems</div><div class="swipe-arrow right">→</div>';
        cardsContainer.appendChild(swipeHint);
        
        // Make it fade out after a few seconds
        setTimeout(() => {
          swipeHint.classList.add('fade-out');
          setTimeout(() => {
            swipeHint.remove();
          }, 1000);
        }, 3000);
        
        // Add swipe indicator dots if they don't exist
        ensureSwipeIndicator();
      };
      
      // Improve the change active gem function for smoother transitions
      const originalChangeGem = window.HiddenGems.swipe._changeActiveGem;
      
      window.HiddenGems.swipe._changeActiveGem = function(newIndex) {
        console.log('Enhanced gem change to index:', newIndex);
        
        // Call the original function
        if (typeof originalChangeGem === 'function') {
          originalChangeGem.call(window.HiddenGems.swipe, newIndex);
        }
        
        // Add additional enhancements
        updateSwipeIndicator(newIndex);
      };
      
      // Initialize the enhanced swipe
      window.HiddenGems.swipe.init();
    }
  }, 100);
}

/**
 * Ensure swipe indicator exists and is properly styled
 */
function ensureSwipeIndicator() {
  let swipeIndicator = document.querySelector('.swipe-indicator');
  
  // Create if it doesn't exist
  if (!swipeIndicator) {
    swipeIndicator = document.createElement('div');
    swipeIndicator.className = 'swipe-indicator';
    document.body.appendChild(swipeIndicator);
  }
  
  // Make sure it's visible
  swipeIndicator.style.position = 'fixed';
  swipeIndicator.style.bottom = '190px'; // Position above cards
  swipeIndicator.style.left = '0';
  swipeIndicator.style.right = '0';
  swipeIndicator.style.display = 'flex';
  swipeIndicator.style.justifyContent = 'center';
  swipeIndicator.style.gap = '8px';
  swipeIndicator.style.zIndex = '200';
  swipeIndicator.style.padding = '8px';
  
  // Update dots based on number of gems
  updateSwipeIndicator(0);
}

/**
 * Update swipe indicator to show the active gem
 * @param {number} activeIndex - Index of the active gem
 */
function updateSwipeIndicator(activeIndex) {
  const swipeIndicator = document.querySelector('.swipe-indicator');
  if (!swipeIndicator) return;
  
  // Get number of gems
  const gemsCount = window.HiddenGems.data?.gems?.length || 0;
  if (gemsCount === 0) return;
  
  // Clear existing dots
  swipeIndicator.innerHTML = '';
  
  // Create dot for each gem
  for (let i = 0; i < gemsCount; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot';
    if (i === activeIndex) {
      dot.classList.add('active');
    }
    
    // Add click handler
    dot.addEventListener('click', () => {
      // Go to this gem
      if (window.goToGem && typeof window.goToGem === 'function') {
        window.goToGem(i);
      } else if (window.HiddenGems.indexCards && typeof window.HiddenGems.indexCards.goToGem === 'function') {
        window.HiddenGems.indexCards.goToGem(i);
      }
    });
    
    swipeIndicator.appendChild(dot);
  }
}

/**
 * Reposition navigation wheel for better accessibility
 */
function repositionNavWheel() {
  const waitForNavWheel = setInterval(() => {
    const navWheelContainer = document.querySelector('.nav-wheel-container');
    if (navWheelContainer) {
      clearInterval(waitForNavWheel);
      
      // Repositioned to upper right corner, above the cards
      navWheelContainer.style.position = 'fixed';
      navWheelContainer.style.bottom = 'auto';
      navWheelContainer.style.top = '70px';
      navWheelContainer.style.right = '20px';
      navWheelContainer.style.zIndex = '200';
      navWheelContainer.style.transform = 'none';
    }
  }, 100);
}

/**
 * Reposition legend for better visibility
 */
function repositionLegend() {
  const waitForLegend = setInterval(() => {
    const legend = document.querySelector('.legend');
    if (legend) {
      clearInterval(waitForLegend);
      
      // Reposition to top left
      legend.style.position = 'fixed';
      legend.style.top = '70px';
      legend.style.left = '10px';
      legend.style.bottom = 'auto';
      legend.style.zIndex = '200';
      legend.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      legend.style.padding = '8px 12px';
      legend.style.borderRadius = '8px';
      legend.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      
      // Improve layout of items
      const legendItems = legend.querySelectorAll('div');
      legendItems.forEach(item => {
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.marginBottom = '6px';
      });
    }
  }, 100);
}

/**
 * Fix map container to ensure proper sizing
 */
function fixMapContainer() {
  const mapElement = document.getElementById('map');
  if (mapElement) {
    // Make sure map takes full width and correct height
    mapElement.style.width = '100%';
    mapElement.style.height = 'calc(100vh - 170px)';
    mapElement.style.position = 'fixed';
    mapElement.style.top = '0';
    mapElement.style.left = '0';
    mapElement.style.zIndex = '1';
    
    // Make sure container doesn't add extra space
    const container = document.querySelector('.container');
    if (container) {
      container.style.padding = '0';
      container.style.margin = '0';
      container.style.maxWidth = 'none';
      container.style.width = '100%';
      container.style.height = '100vh';
      container.style.position = 'relative';
      container.style.overflow = 'hidden';
    }
  }
}

// Add styling for swipe hint
const style = document.createElement('style');
style.textContent = `
  .swipe-hint {
    position: absolute;
    top: -40px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    margin: 0 auto;
    width: fit-content;
    z-index: 300;
    transition: opacity 0.5s;
    animation: bounce 2s infinite;
  }
  
  .swipe-hint.fade-out {
    opacity: 0;
  }
  
  .swipe-arrow {
    font-size: 18px;
    margin: 0 10px;
    animation: pulse 1.5s infinite;
  }
  
  .swipe-arrow.left {
    animation-delay: 0.5s;
  }
  
  .swipe-text {
    font-size: 14px;
    font-weight: 500;
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  
  /* Fix for dot indicators */
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .dot.active {
    background-color: #4285F4;
    transform: scale(1.2);
    box-shadow: 0 1px 5px rgba(66, 133, 244, 0.4);
  }
  
  /* Make sure cards position properly */
  .cards-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 170px;
    z-index: 100;
    pointer-events: auto;
  }
  
  .gem-card {
    position: absolute;
    bottom: 0;
    left: 10px;
    right: 10px;
    height: 170px;
    background-color: white;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
    padding: 16px;
    display: flex;
    flex-direction: column;
    transition: transform 0.3s ease-out;
  }
`;

document.head.appendChild(style);