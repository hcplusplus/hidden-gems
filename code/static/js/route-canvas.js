/**
 * Canvas overlay for route drawing using pixel coordinates
 */
function createRouteCanvas() {
  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.id = 'route-canvas';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
  canvas.style.zIndex = '190'; // Below markers but above map tiles
  
  // Add canvas to map container
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    mapContainer.appendChild(canvas);
    
    // Set initial dimensions
    canvas.width = mapContainer.offsetWidth;
    canvas.height = mapContainer.offsetHeight;
  }
  
  // Route data
  let baseRoute = null;
  let detourRoute = null;
  
  // Draw function
  function drawRoutes() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Resize canvas if needed
    if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    
    // Draw base route (if exists)
    if (baseRoute && baseRoute.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(baseRoute[0].x, baseRoute[0].y);
      
      for (let i = 1; i < baseRoute.length; i++) {
        ctx.lineTo(baseRoute[i].x, baseRoute[i].y);
      }
      
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    
    // Draw detour route (if exists)
    if (detourRoute && detourRoute.length >= 2) {
      ctx.beginPath();
      ctx.setLineDash([5, 5]); // Dashed line
      ctx.moveTo(detourRoute[0].x, detourRoute[0].y);
      
      for (let i = 1; i < detourRoute.length; i++) {
        ctx.lineTo(detourRoute[i].x, detourRoute[i].y);
      }
      
      ctx.strokeStyle = '#4285F4';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash pattern
    }
  }
  
  return {
    canvas: canvas,
    
    // Update route paths using map projection
    updateRoutes: function(map, origin, destination, waypoint) {
      // Clear existing routes
      baseRoute = null;
      detourRoute = null;
      
      if (!map || !origin || !destination) return;
      
      // Convert geographic coordinates to pixel coordinates
      baseRoute = [
        map.project(origin),
        map.project(destination)
      ];
      
      // If waypoint exists, create detour route
      if (waypoint) {
        detourRoute = [
          map.project(origin),
          map.project(waypoint),
          map.project(destination)
        ];
      }
      
      // Draw the updated routes
      drawRoutes();
    },
    
    // Clear all routes
    clearRoutes: function() {
      baseRoute = null;
      detourRoute = null;
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    
    // Redraw on map movement
    onMapMove: function() {
      drawRoutes();
    }
  };
}

// Initialize route canvas when document is ready
document.addEventListener('DOMContentLoaded', function() {
  // Wait for map to be initialized
  document.addEventListener('mapReady', function() {
    if (!window.map) return;
    
    // Create route canvas
    const routeCanvas = createRouteCanvas();
    
    // Store for access
    window.routeCanvas = routeCanvas;
    
    // Add map event listeners
    window.map.on('move', function() {
      if (routeCanvas) routeCanvas.onMapMove();
    });
    
    window.map.on('resize', function() {
      if (routeCanvas) routeCanvas.onMapMove();
    });
    
    // Override route rendering functions
    window.renderRoutes = function(gemCoords) {
      if (!window.map) return;
      
      const originCoords = JSON.parse(sessionStorage.getItem("originCoords"));
      const destinationCoords = JSON.parse(sessionStorage.getItem("destinationCoords"));
      
      if (!originCoords || !destinationCoords || !gemCoords) return;
      
      if (routeCanvas) {
        routeCanvas.updateRoutes(
          window.map,
          originCoords,
          destinationCoords,
          gemCoords
        );
      }
    };
    
    // Override the existing functions in landing-page.js
    window.addBaseRoute = function(origin, destination) {
      if (routeCanvas) {
        routeCanvas.updateRoutes(window.map, origin, destination, null);
      }
    };
    
    window.clearDetourRoute = function() {
      if (routeCanvas) {
        // Only clear detour route, keep base route
        routeCanvas.updateRoutes(window.map, 
          JSON.parse(sessionStorage.getItem("originCoords")),
          JSON.parse(sessionStorage.getItem("destinationCoords")),
          null
        );
      }
    };
    
    console.log('Route canvas initialized');
  });
});