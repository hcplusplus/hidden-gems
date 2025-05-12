/**
 * Canvas Marker Overlay
 * This draws markers on canvas that will stay in sync with the route
 */
function createMarkerCanvas() {
  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.id = 'marker-canvas';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none'; // Let events pass through to map
  canvas.style.zIndex = '195'; // Below the regular markers but above the map
  
  // Add to map container
  const mapContainer = document.getElementById('map');
  mapContainer.appendChild(canvas);
  
  // Set initial dimensions
  canvas.width = mapContainer.offsetWidth;
  canvas.height = mapContainer.offsetHeight;
  
  // Store marker data
  let markers = [];
  let activeMarkerIndex = -1;
  
  // Draw all markers
  function drawMarkers() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update canvas size if needed
    if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    
    // Draw each marker
    markers.forEach((marker, index) => {
      // Skip if position is invalid
      if (!marker.pixelPos) return;
      
      const x = marker.pixelPos.x;
      const y = marker.pixelPos.y;
      
      // Draw marker
      ctx.beginPath();
      
      // Determine color based on gem type or active status
      let color = '#0088FF'; // Default blue
      if (index === activeMarkerIndex) {
        color = '#FF4400'; // Orange-red for active
      } else if (marker.type === 'hidden-beach' || marker.type === 'secret-trail') {
        color = '#FF0088'; // Pink
      }
      
      // Draw gem-like shape
      ctx.fillStyle = color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      
      // Diamond shape
      const size = (index === activeMarkerIndex) ? 14 : 10;
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      
      ctx.fill();
      ctx.stroke();
    });
  }
  
  return {
    canvas: canvas,
    
    // Set marker data
    setMarkers: function(gemData, map) {
      markers = gemData.map(gem => {
        const coords = gem.coordinates || gem.coords;
        let pixelPos = null;
        
        // Convert geo coordinates to pixel coordinates
        if (coords && coords.length === 2) {
          // This ensures we use the same coordinate system as the map
          pixelPos = map.project(coords);
        }
        
        return {
          gem: gem,
          type: gem.type,
          lngLat: coords,
          pixelPos: pixelPos
        };
      });
      
      drawMarkers();
    },
    
    // Set active marker
    setActiveMarker: function(index) {
      activeMarkerIndex = index;
      drawMarkers();
    },
    
    // Update marker positions on map move
    updatePositions: function(map) {
      markers.forEach(marker => {
        if (marker.lngLat) {
          marker.pixelPos = map.project(marker.lngLat);
        }
      });
      
      drawMarkers();
    },
    
    // Handle click events to detect marker clicks
    handleClick: function(event, map) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Find clicked marker
      for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        if (!marker.pixelPos) continue;
        
        // Simple distance check
        const distance = Math.sqrt(
          Math.pow(x - marker.pixelPos.x, 2) + 
          Math.pow(y - marker.pixelPos.y, 2)
        );
        
        // If within marker size, trigger click
        if (distance <= 15) {
          this.setActiveMarker(i);
          
          // Trigger event for gem selection
          document.dispatchEvent(new CustomEvent('gemSelected', {
            detail: { 
              index: i, 
              id: marker.gem.id || `gem-${i}`,
              gem: marker.gem
            }
          }));
          
          return true;
        }
      }
      
      return false;
    }
  };
}

// Initialize the canvas marker system
document.addEventListener('DOMContentLoaded', function() {
  // Wait for map to be initialized
  document.addEventListener('mapReady', function() {
    if (!window.map) return;
    
    // Create marker canvas
    const markerCanvas = createMarkerCanvas();
    window.markerCanvas = markerCanvas;
    
    // Add event listeners
    window.map.on('move', function() {
      markerCanvas.updatePositions(window.map);
    });
    
    window.map.on('resize', function() {
      markerCanvas.updatePositions(window.map);
    });
    
    // Add click handler (transparent to map clicks)
    document.getElementById('map').addEventListener('click', function(e) {
      markerCanvas.handleClick(e, window.map);
    });
    
    // Hook into the existing gemsLoaded event
    document.addEventListener('gemsLoaded', function(event) {
      const gems = event.detail.gems;
      markerCanvas.setMarkers(gems, window.map);
    });
    
    // Hook into the existing gemSelected event
    document.addEventListener('gemSelected', function(event) {
      markerCanvas.setActiveMarker(event.detail.index);
    });
    
    // If gems are already loaded, initialize with them
    if (window.HiddenGems && window.HiddenGems.data && window.HiddenGems.data.pageGems) {
      markerCanvas.setMarkers(window.HiddenGems.data.pageGems, window.map);
    }
    
    console.log('Canvas marker system initialized');
  });
});