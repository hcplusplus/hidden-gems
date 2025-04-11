// Simple JavaScript for the map page
// This would be expanded with actual data in a real implementation

// Sample restaurant data
const restaurants = [
  {
    id: 1,
    name: "The Hidden Valley",
    cuisine: "Farm-to-Table",
    cost: "$$",
    rating: 4,
    isHidden: true,
    region: "Sierra Foothills",
    city: "Nevada City",
    popularity: 15,
    coordinates: {
      x: 200,
      y: 150
    }
  },
  {
    id: 2,
    name: "Mountain View Bistro",
    cuisine: "American",
    cost: "$$$",
    rating: 4.5,
    isHidden: false,
    region: "Tahoe Area",
    city: "Truckee",
    popularity: 65,
    coordinates: {
      x: 300,
      y: 200
    }
  },
  {
    id: 3,
    name: "Coastal Seafood Grill",
    cuisine: "Seafood",
    cost: "$$",
    rating: 3.5,
    isHidden: true,
    region: "Mendocino Coast",
    city: "Fort Bragg",
    popularity: 22,
    coordinates: {
      x: 150,
      y: 250
    }
  }
];

// Function to show restaurant details
function showRestaurant(id) {
  const restaurant = restaurants.find(r => r.id === id);
  
  if (!restaurant) {
    alert("Restaurant information not found!");
    return;
  }
  
  // Update the restaurant info table
  document.getElementById("rest-name").innerText = restaurant.name;
  document.getElementById("rest-type").innerText = restaurant.cuisine;
  document.getElementById("rest-cost").innerText = restaurant.cost;
  
  // Create star rating
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += i <= restaurant.rating ? "★" : "☆";
  }
  document.getElementById("rest-rating").innerText = stars;
  
  // Set hidden gem status
  document.getElementById("rest-hidden").innerText = restaurant.isHidden 
    ? "YES! Off the beaten path!" 
    : "No, this is a popular destination";
  
  // Scroll to the info box
  document.getElementById("restaurantInfo").scrollIntoView();
  
  // Play a sound effect (very 90s!)
  // Old browsers had this feature
  if (typeof Audio !== "undefined") {
    const audio = new Audio("click.wav");
    audio.play().catch(e => console.log("Sound not played"));
  }
}

// Simple loading effect
window.onload = function() {
  // Show loading message for a few seconds to simulate dial-up loading
  setTimeout(function() {
    const loadingText = document.querySelector(".loading-text");
    if (loadingText) {
      loadingText.style.display = "none";
    }
    
    // Show an alert to welcome the user (very 90s!)
    // In the 90s, alerts popped up all the time on websites
    setTimeout(function() {
      alert("Welcome to the Northern California Hidden Gems Map! Click on a restaurant to see details.");
    }, 500);
    
  }, 2000);
};