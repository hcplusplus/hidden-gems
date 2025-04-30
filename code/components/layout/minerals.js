document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('mica-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    function setCanvasSize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    
    // Mica layer configuration
    const layers = [
        {
            color: 'rgba(200, 230, 240, 0.1)',
            count: 15,
            speed: 0.2,
            rotationSpeed: 0.0001,
            size: () => Math.min(canvas.width, canvas.height) * 0.8
        },
        {
            color: 'rgba(210, 240, 250, 0.1)',
            count: 12,
            speed: 0.1,
            rotationSpeed: -0.0002,
            size: () => Math.min(canvas.width, canvas.height) * 0.6
        },
        {
            color: 'rgba(190, 220, 230, 0.08)',
            count: 20,
            speed: 0.3,
            rotationSpeed: 0.0003,
            size: () => Math.min(canvas.width, canvas.height) * 0.4
        }
    ];
    
    // Create mica polygons for each layer
    const polygons = [];
    
    layers.forEach(layer => {
        for (let i = 0; i < layer.count; i++) {
            const points = generateMicaPolygon(4 + Math.floor(Math.random() * 3));
            polygons.push({
                points: points,
                size: layer.size(),
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: layer.rotationSpeed * (0.5 + Math.random()),
                color: layer.color,
                speed: {
                    x: (Math.random() - 0.5) * layer.speed,
                    y: (Math.random() - 0.5) * layer.speed
                }
            });
        }
    });
    
    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    let mouseInfluence = false;
    
    window.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        mouseInfluence = true;
        
        // Stop influence after 2 seconds of inactivity
        clearTimeout(window.mouseTimeout);
        window.mouseTimeout = setTimeout(() => {
            mouseInfluence = false;
        }, 2000);
    });
    
    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw subtle gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#f0f8ff');
        gradient.addColorStop(1, '#f5f5f5');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid lines
        drawMicaGrid();
        
        // Update and draw polygons
        polygons.forEach(polygon => {
            // Move polygon
            polygon.x += polygon.speed.x;
            polygon.y += polygon.speed.y;
            
            // Wrap around screen
            if (polygon.x < -polygon.size) polygon.x = canvas.width + polygon.size;
            if (polygon.x > canvas.width + polygon.size) polygon.x = -polygon.size;
            if (polygon.y < -polygon.size) polygon.y = canvas.height + polygon.size;
            if (polygon.y > canvas.height + polygon.size) polygon.y = -polygon.size;
            
            // Mouse interaction
            if (mouseInfluence) {
                const dx = mouseX - polygon.x;
                const dy = mouseY - polygon.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 300) {
                    const angle = Math.atan2(dy, dx);
                    const force = (1 - distance / 300) * 0.2;
                    polygon.x -= Math.cos(angle) * force;
                    polygon.y -= Math.sin(angle) * force;
                }
            }
            
            // Rotate polygon
            polygon.rotation += polygon.rotationSpeed;
            
            // Draw polygon
            drawPolygon(polygon);
        });
        
        requestAnimationFrame(animate);
    }
    
    // Generate random mica polygon points
    function generateMicaPolygon(sides) {
        const points = [];
        
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 * i / sides) + (Math.random() * 0.2 - 0.1);
            const radius = 0.8 + Math.random() * 0.4; // Slightly irregular
            
            points.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        
        return points;
    }
    
    // Draw a mica polygon
    function drawPolygon(polygon) {
        ctx.save();
        ctx.translate(polygon.x, polygon.y);
        ctx.rotate(polygon.rotation);
        ctx.scale(polygon.size, polygon.size);
        
        ctx.beginPath();
        ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
        
        for (let i = 1; i < polygon.points.length; i++) {
            ctx.lineTo(polygon.points[i].x, polygon.points[i].y);
        }
        
        ctx.closePath();
        ctx.fillStyle = polygon.color;
        ctx.fill();
        
        // Add line highlights to simulate mica's layered structure
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.02;
        for (let i = 0; i < 3; i++) {
            const start = polygon.points[i];
            const end = polygon.points[(i + 2) % polygon.points.length];
            
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    // Draw background grid pattern
    function drawMicaGrid() {
        const gridSize = 50;
        
        ctx.strokeStyle = 'rgba(200, 220, 230, 0.2)';
        ctx.lineWidth = 0.5;
        
        // Horizontal lines
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Vertical lines
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // Diagonal lines
        ctx.strokeStyle = 'rgba(200, 220, 230, 0.1)';
        for (let i = 0; i < canvas.width + canvas.height; i += gridSize * 2) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(0, i);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(canvas.width, i);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
    }
    
    // Start animation
    animate();
});