import React, { useState, useEffect } from 'react';
import _ from 'lodash';

const VintageMap = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [hoveredRestaurant, setHoveredRestaurant] = useState(null);
  
  // Map dimensions and positioning
  const mapWidth = 800;
  const mapHeight = 600;
  const padding = 40;
  
  // Bounding box for Northern California
  const bounds = {
    minLat: 37.336962631031504, // San Jose (bottom left)
    maxLat: 41.74746217345373,  // Crescent City (top left)
    minLng: -124.1095344585807, // Crescent City (top left)
    maxLng: -118.28222302824624 // Bishop (bottom right)
  };
  
  // Function to convert lat/lng to x/y coordinates on our map
  const projectToXY = (lat, lng) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (mapWidth - 2 * padding) + padding;
    const y = mapHeight - (((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (mapHeight - 2 * padding) + padding);
    return { x, y };
  };
  
  // Generate synthetic restaurant data
  useEffect(() => {
    // This would normally come from an API or file
    const generateSyntheticData = () => {
      const cuisineTypes = ["Italian", "Mexican", "Japanese", "Farm-to-Table", "Seafood", "Brewpub"];
      const nameElements = ["Table", "Bistro", "Kitchen", "Grill", "House", "Café"];
      const nameAdjectives = ["Golden", "Rustic", "Coastal", "Mountain", "Wine Country", "Redwood"];
      const regions = ["Napa Valley", "Sonoma County", "Mendocino Coast", "Sierra Foothills", "Tahoe Area"];
      const cities = ["Healdsburg", "Calistoga", "Nevada City", "Truckee", "Mendocino"];
      const ambianceTypes = ["Casual", "Upscale", "Romantic", "Farm-to-Table", "Rustic"];
      const costLevels = ["$", "$$", "$$$", "$$$$"];
      const highways = ["1", "5", "20", "29", "49", "80", "101"];
      
      const data = [];
      
      for (let i = 0; i < 15; i++) {
        const latitude = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
        const longitude = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);
        
        data.push({
          id: i + 1,
          name: `The ${_.sample(nameAdjectives)} ${_.sample(nameElements)}`,
          coordinates: {
            latitude: Math.round(latitude * 1000000) / 1000000,
            longitude: Math.round(longitude * 1000000) / 1000000
          },
          region: _.sample(regions),
          city: _.sample(cities),
          ambiance: [_.sample(ambianceTypes)],
          cost: _.sample(costLevels),
          cuisine: _.sample(cuisineTypes),
          rating: Math.round((3 + Math.random() * 2) * 10) / 10,
          highway: _.sample(highways),
          popularity_score: Math.floor(Math.random() * 100) + 1
        });
      }
      
      return data;
    };
    
    setRestaurants(generateSyntheticData());
  }, []);
  
  // Main highways in Northern California
  const highways = [
    { name: "1", points: [
      { lat: 37.8, lng: -122.5 }, { lat: 38.3, lng: -123.0 }, { lat: 39.3, lng: -123.8 }, { lat: 40.0, lng: -124.1 }
    ]},
    { name: "5", points: [
      { lat: 37.5, lng: -121.3 }, { lat: 38.5, lng: -121.5 }, { lat: 39.5, lng: -122.2 }, { lat: 40.5, lng: -122.3 }, { lat: 41.5, lng: -122.4 }
    ]},
    { name: "80", points: [
      { lat: 37.8, lng: -122.3 }, { lat: 38.5, lng: -121.5 }, { lat: 39.3, lng: -120.2 }
    ]},
    { name: "101", points: [
      { lat: 37.4, lng: -122.1 }, { lat: 38.3, lng: -122.6 }, { lat: 39.0, lng: -123.3 }, { lat: 40.0, lng: -123.8 }, { lat: 41.0, lng: -124.0 }
    ]}
  ];
  
  // Major cities
  const cities = [
    { name: "San Francisco", lat: 37.7749, lng: -122.4194, size: 8 },
    { name: "Sacramento", lat: 38.5816, lng: -121.4944, size: 7 },
    { name: "Eureka", lat: 40.8021, lng: -124.1637, size: 5 },
    { name: "Redding", lat: 40.5865, lng: -122.3917, size: 5 },
    { name: "Santa Rosa", lat: 38.4404, lng: -122.7141, size: 5 },
    { name: "Ukiah", lat: 39.1502, lng: -123.2078, size: 4 },
    { name: "South Lake Tahoe", lat: 38.9399, lng: -119.9772, size: 4 }
  ];
  
  // Function to create a smooth path for highways
  const createHighwayPath = (points) => {
    if (points.length < 2) return "";
    
    const projectedPoints = points.map(p => projectToXY(p.lat, p.lng));
    let path = `M ${projectedPoints[0].x} ${projectedPoints[0].y}`;
    
    for (let i = 1; i < projectedPoints.length; i++) {
      path += ` L ${projectedPoints[i].x} ${projectedPoints[i].y}`;
    }
    
    return path;
  };
  
  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-2xl font-bold mb-4">Northern California Food Destinations</h2>
      <div className="relative" style={{ width: mapWidth, height: mapHeight, overflow: 'hidden' }}>
        {/* Vintage paper background */}
        <div className="absolute inset-0 bg-amber-50" style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23d6cfc7' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }}></div>
        
        {/* Coastal outline */}
        <svg className="absolute inset-0 w-full h-full">
          <path 
            d="M 40 600 L 60 580 L 80 540 L 100 520 L 110 480 L 120 440 L 140 400 L 150 350 L 140 300 L 120 250 L 100 200 L 80 150 L 70 100 L 60 50 L 40 30 L 20 10" 
            fill="none" 
            stroke="#94a3b8" 
            strokeWidth="2"
            strokeDasharray="4,2"
          />
          
          {/* Draw highways */}
          {highways.map((highway, index) => (
            <g key={index}>
              <path
                d={createHighwayPath(highway.points)}
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
              />
              
              {/* Highway labels */}
              {highway.points.length > 0 && (
                <text
                  x={projectToXY(highway.points[Math.floor(highway.points.length / 2)].lat, 
                                highway.points[Math.floor(highway.points.length / 2)].lng).x}
                  y={projectToXY(highway.points[Math.floor(highway.points.length / 2)].lat, 
                                highway.points[Math.floor(highway.points.length / 2)].lng).y - 10}
                  fill="#b91c1c"
                  fontWeight="bold"
                  fontSize="12"
                  textAnchor="middle"
                >
                  {highway.name}
                </text>
              )}
            </g>
          ))}
          
          {/* Draw cities */}
          {cities.map((city, index) => {
            const { x, y } = projectToXY(city.lat, city.lng);
            return (
              <g key={`city-${index}`}>
                <circle cx={x} cy={y} r={city.size} fill="#1e40af" />
                <text
                  x={x}
                  y={y - 10}
                  fill="#1e3a8a"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {city.name}
                </text>
              </g>
            );
          })}
          
          {/* Draw restaurant locations */}
          {restaurants.map((restaurant, index) => {
            const { x, y } = projectToXY(
              restaurant.coordinates.latitude,
              restaurant.coordinates.longitude
            );
            
            const isLowPopularity = restaurant.popularity_score < 30;
            
            return (
              <g 
                key={`restaurant-${index}`}
                onMouseEnter={() => setHoveredRestaurant(restaurant)}
                onMouseLeave={() => setHoveredRestaurant(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={6}
                  fill={isLowPopularity ? "#65a30d" : "#eab308"}
                  stroke="#000000"
                  strokeWidth="1"
                />
                {isLowPopularity && (
                  <text
                    x={x + 8}
                    y={y}
                    fill="#166534"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    ★
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Compass rose */}
          <g transform={`translate(${mapWidth - 80}, ${mapHeight - 80})`}>
            <circle cx="0" cy="0" r="25" fill="none" stroke="#334155" strokeWidth="1" />
            <path d="M 0 -20 L 5 0 L 0 20 L -5 0 Z" fill="#334155" />
            <path d="M 20 0 L 0 5 L -20 0 L 0 -5 Z" fill="#94a3b8" />
            <text x="0" y="-28" fill="#334155" fontSize="12" textAnchor="middle">N</text>
            <text x="28" y="0" fill="#334155" fontSize="12" textAnchor="middle" dominantBaseline="middle">E</text>
            <text x="0" y="28" fill="#334155" fontSize="12" textAnchor="middle">S</text>
            <text x="-28" y="0" fill="#334155" fontSize="12" textAnchor="middle" dominantBaseline="middle">W</text>
          </g>
          
          {/* Map title decoration */}
          <path
            d="M 200 30 L 600 30"
            stroke="#8b5cf6"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M 200 34 L 600 34"
            stroke="#8b5cf6"
            strokeWidth="1"
            fill="none"
          />
        </svg>
        
        {/* Map legend */}
        <div className="absolute left-4 bottom-4 bg-amber-50 bg-opacity-80 p-2 border border-amber-900 rounded">
          <h3 className="text-sm font-bold border-b border-amber-900 mb-1">Legend</h3>
          <div className="flex items-center text-xs mb-1">
            <div className="w-4 h-4 bg-blue-800 rounded-full mr-2"></div>
            <span>Major Cities</span>
          </div>
          <div className="flex items-center text-xs mb-1">
            <div className="w-4 h-0.5 bg-red-600 mr-2"></div>
            <span>Highways</span>
          </div>
          <div className="flex items-center text-xs mb-1">
            <div className="w-4 h-4 bg-yellow-500 rounded-full border border-black mr-2"></div>
            <span>Popular Restaurants</span>
          </div>
          <div className="flex items-center text-xs">
            <div className="w-4 h-4 bg-lime-600 rounded-full border border-black mr-2"></div>
            <span>Hidden Gems ★</span>
          </div>
        </div>
        
        {/* Restaurant info box */}
        {hoveredRestaurant && (
          <div 
            className="absolute bg-amber-50 border border-amber-900 p-3 rounded shadow-lg z-10"
            style={{ 
              top: projectToXY(hoveredRestaurant.coordinates.latitude, hoveredRestaurant.coordinates.longitude).y - 120,
              left: projectToXY(hoveredRestaurant.coordinates.latitude, hoveredRestaurant.coordinates.longitude).x + 10,
              maxWidth: '200px'
            }}
          >
            <h3 className="font-bold text-amber-900">{hoveredRestaurant.name}</h3>
            <p className="text-xs text-gray-700">{hoveredRestaurant.city}, {hoveredRestaurant.region}</p>
            <p className="text-xs">{hoveredRestaurant.cuisine} • {hoveredRestaurant.cost}</p>
            <p className="text-xs">Rating: {hoveredRestaurant.rating}/5.0</p>
            <p className="text-xs">Near Highway {hoveredRestaurant.highway}</p>
            <p className="text-xs italic">
              {hoveredRestaurant.popularity_score < 30 
                ? "A hidden gem off the beaten path!" 
                : "A well-known destination"}
            </p>
          </div>
        )}
        
        {/* Map title */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-center">
          <h1 className="font-serif text-2xl font-bold text-amber-900">Northern California</h1>
          <h2 className="font-serif text-lg text-amber-800">Culinary Discoveries</h2>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-700">
        <p><span className="font-bold">★</span> Green markers indicate less-visited "hidden gem" restaurants</p>
      </div>
    </div>
  );
};

export default VintageMap;