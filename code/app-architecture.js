// App Architecture Overview - Frontend Focus

/**
 * DATA MODEL
 * 
 * Key entities in the application (stored in localStorage/sessionStorage):
 */

// User Preferences (collected during quiz)
const userPreferences = {
  startLocation: 'string', // Starting point for trip
  endLocation: 'string',   // Destination for trip
  activities: ['hiking', 'wine-tasting', 'photography', 'food', 'nature'],
  effortLevel: 'easy|moderate|challenging', // Activity intensity preference
  accessibility: ['wheelchair', 'stroller', 'elderly-friendly', 'none'],
  visitTime: 'quick|short|half-day|full-day', // Time available for activities
  maxDetour: 'number', // Maximum detour distance in miles
  amenities: ['restrooms', 'parking', 'gas'] // Required amenities
};

// Hidden Gem Location
const locationModel = {
  id: 'string',
  name: 'string',
  coordinates: {
    latitude: 'number',
    longitude: 'number'
  },
  type: 'viewpoint|hidden-beach|historic-site|local-eatery|natural-wonder|secret-trail',
  region: 'napa|sonoma|mendocino|coastal|sierra|tahoe',
  isHiddenGem: 'boolean', // True if this is a rarely visited location
  attributes: {
    activities: ['array of activities'],
    effortLevel: 'easy|moderate|challenging',
    visitDuration: 'string', // e.g., "1-2 hours"
    highway: 'string', // Nearest highway (e.g., "101", "1")
    distanceFromHighway: 'number',
    bestTimeToVisit: 'morning|afternoon|evening|weekday|weekend|season',
    accessibility: 'string',
  },
  description: 'string',
  cost: 'free|$|$$|$$$',
  rating: 'number', // 1-5 rating scale
  reviewCount: 'number',
  amenities: ['array of amenities'],
  tags: ['array of tags'],
  popularityScore: 'number', // Lower means more "hidden"
  image: 'string' // Placeholder emoji for the demo
};

// Trip Plan
const tripModel = {
  id: 'string',
  name: 'string',
  startLocation: {
    name: 'string',
    coordinates: { latitude: 'number', longitude: 'number' }
  },
  endLocation: {
    name: 'string',
    coordinates: { latitude: 'number', longitude: 'number' }
  },
  selectedGems: [
    // Array of location IDs with visit order
    { locationId: 'string', order: 'number' }
  ],
  directRoute: {
    distance: 'number', // miles
    duration: 'number', // minutes
    path: [
      // Array of coordinates representing the direct path
      { latitude: 'number', longitude: 'number' }
    ]
  },
  optimizedRoute: {
    distance: 'number', // miles
    duration: 'number', // minutes
    path: [
      // Array of coordinates with gems included
      { latitude: 'number', longitude: 'number' }
    ]
  },
  createdAt: 'date',
  lastModified: 'date'
};

/**
 * FRONTEND COMPONENT ARCHITECTURE
 * 
 * Key reusable UI components:
 */

// 1. Navigation Wheel
const navigationWheel = {
  container: 'nav-wheel-container',
  items: [
    { label: 'Add a Gem', icon: '💎', action: 'addGem' },
    { label: 'Profile', icon: '👤', action: 'viewProfile' },
    { label: 'Start a Trip', icon: '🗺️', action: 'startTrip' },
    { label: 'Toolbox', icon: '🧰', action: 'openToolbox' }
  ],
  // Functions for show/hide behavior and action handling
  methods: {
    toggle: 'function', // Toggle wheel visibility
    handleAction: 'function' // Process selected action
  }
};

// 2. Recommendation Card
const recommendationCard = {
  properties: {
    title: 'string',
    isHiddenGem: 'boolean',
    location: 'string',
    image: 'string',
    rating: 'number',
    reviewCount: 'number',
    hours: 'string',
    cost: 'string',
    visitDuration: 'string',
    tags: ['array of tags'],
    id: 'string'
  },
  interactions: {
    viewDetails: 'function',
    addToItinerary: 'function',
    toggleFavorite: 'function'
  },
  variants: ['standard', 'compact', 'map-popup']
};

// 3. Filters Component
const filtersComponent = {
  filterTypes: [
    {
      id: 'distance',
      label: 'Distance',
      options: [
        { value: '5', label: 'Less than 5 miles' },
        { value: '15', label: '5-15 miles' },
        { value: '30', label: '15-30 miles' },
        { value: '60', label: '30-60 miles' },
        { value: '100', label: '60-100 miles' },
        { value: 'any', label: 'Any distance' }
      ],
      selectionType: 'single',
      additionalControls: [{
        type: 'slider',
        id: 'highway-distance',
        label: 'Distance from highway',
        min: 0,
        max: 20,
        step: 1,
        unit: 'miles'
      }]
    },
    {
      id: 'cost',
      label: 'Cost',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'low', label: '$ (Under $10)' },
        { value: 'medium', label: '$$ ($10-25)' },
        { value: 'high', label: '$$$ ($25+)' }
      ],
      selectionType: 'single'
    },
    {
      id: 'accessibility',
      label: 'Accessibility',
      options: [
        { value: 'easy', label: 'Easy (no hiking)' },
        { value: 'moderate', label: 'Moderate (short walks)' },
        { value: 'difficult', label: 'Challenging (hiking required)' }
      ],
      selectionType: 'multiple',
      additionalControls: [{
        type: 'checkboxes',
        id: 'features',
        options: [
          { value: 'wheelchair', label: 'Wheelchair accessible' },
          { value: 'parking', label: 'Parking available' },
          { value: 'restrooms', label: 'Restrooms on-site' },
          { value: 'children', label: 'Kid-friendly' }
        ]
      }]
    },
    {
      id: 'activities',
      label: 'Activities',
      options: [
        { value: 'hiking', label: 'Hiking' },
        { value: 'photography', label: 'Photography' },
        { value: 'wine', label: 'Wine Tasting' },
        { value: 'history', label: 'Historical' },
        { value: 'wildlife', label: 'Wildlife' },
        { value: 'swimming', label: 'Swimming' },
        { value: 'picnic', label: 'Picnicking' },
        { value: 'relaxation', label: 'Relaxation' }
      ],
      selectionType: 'multiple'
    },
    {
      id: 'time',
      label: 'Visit Time',
      options: [
        { value: 'quick', label: 'Quick stop (under 1 hour)' },
        { value: 'short', label: 'Short visit (1-2 hours)' },
        { value: 'half-day', label: 'Half day (2-4 hours)' },
        { value: 'full-day', label: 'Full day (4+ hours)' }
      ],
      selectionType: 'single'
    }
  ],
  methods: {
    applyFilters: 'function', // Apply selected filters
    resetFilters: 'function', // Clear all filters
    toggleFilter: 'function', // Open/close a filter dropdown
    getActiveFilters: 'function' // Return currently applied filters
  }
};

// 4. Quiz Component
const quizComponent = {
  steps: [
    {
      id: 'locations',
      title: 'Where are you going?',
      fields: [
        { id: 'origin', type: 'text', label: 'From', required: true },
        { id: 'destination', type: 'text', label: 'To', required: true }
      ]
    },
    {
      id: 'activities',
      title: 'What do you want to explore?',
      fields: [
        { 
          id: 'activities', 
          type: 'multi-select', 
          options: [
            'Wine Tasting', 'Nature', 'Hiking', 'Food', 'Photography',
            'Historical', 'Coffee Shops', 'Scenic Views', 'Swimming',
            'Picnicking'
          ]
        },
        {
          id: 'amenities',
          type: 'multi-select',
          label: 'Essential amenities?',
          options: ['Restrooms', 'Parking', 'Gas Station']
        }
      ]
    },
    {
      id: 'accessibility',
      title: 'What\'s your adventure style?',
      fields: [
        {
          id: 'effortLevel',
          type: 'single-select',
          label: 'Preferred effort level',
          options: [
            { value: 'easy', label: 'Easy & Relaxed' },
            { value: 'moderate', label: 'Moderate Activity' },
            { value: 'challenging', label: 'Challenging & Active' }
          ]
        },
        {
          id: 'accessibilityNeeds',
          type: 'multi-select',
          label: 'Accessibility requirements',
          options: [
            'Wheelchair Accessible', 'Stroller Friendly',
            'Elderly Friendly', 'No Special Requirements'
          ]
        }
      ]
    },
    {
      id: 'time',
      title: 'How much time do you have?',
      fields: [
        {
          id: 'visitTime',
          type: 'radio',
          options: [
            { value: 'quick', label: 'Quick grab (<1 hour)' },
            { value: 'short', label: 'A little detour (1-2 hours)' },
            { value: 'half-day', label: 'Mini Adventure (2-4 hours)' },
            { value: 'full-day', label: 'Full Day Quest (4+ hours)' }
          ]
        },
        {
          id: 'maxDetour',
          type: 'single-select',
          label: 'Maximum detour distance',
          options: [
            { value: '5', label: 'Minimal (5 miles)' },
            { value: '15', label: 'Small (15 miles)' },
            { value: '30', label: 'Medium (30 miles)' },
            { value: '50+', label: 'Any Distance' }
          ]
        }
      ]
    }
  ],
  methods: {
    goToStep: 'function', // Navigate to specific step
    validateStep: 'function', // Check if current step is valid
    saveResponses: 'function', // Save quiz answers
    submitQuiz: 'function' // Complete quiz and process results
  }
};

/**
 * MOCK DATA STRATEGY 
 * 
 * How we'll simulate a backend for the demo:
 */

// 1. Predefined JSON data for hidden gems
const mockDataStructure = {
  gems: [
    // Array of 50-100 location objects with varying attributes
    // Covering different regions, types, and characteristics
  ],
  regions: [
    // Geographic boundaries for major areas
  ],
  highways: [
    // Major road networks with coordinate paths
  ]
};

// 2. Local Storage strategy
const localStorageSchema = {
  'user_preferences': userPreferences,
  'saved_trips': [tripModel],
  'favorite_gems': ['array of location IDs'],
  'viewed_gems': ['array of location IDs'],
  'quiz_responses': 'object with quiz answers'
};

// 3. Mock API service for simulating backend calls
const mockApiService = {
  getRecommendations: 'function', // Filter and sort gems based on preferences
  planRoute: 'function', // Generate route with selected gems
  saveTrip: 'function', // Store trip in localStorage
  getFavorites: 'function', // Get saved favorite locations
  toggleFavorite: 'function', // Add/remove from favorites
  searchLocations: 'function' // Search for locations by name/region
};

/**
 * PAGE STRUCTURE
 * 
 * The pages in the application:
 */

const appPages = [
  {
    name: 'Home',
    filename: 'index.html',
    components: ['navigation-wheel', 'recommendation-card', 'filters'],
    description: 'Landing page with featured hidden gems and quick filters'
  },
  {
    name: 'Quiz',
    filename: 'quiz.html',
    components: ['navigation-wheel'],
    description: 'Multi-step questionnaire to gather user preferences'
  },
  {
    name: 'Results',
    filename: 'results.html',
    components: ['navigation-wheel', 'recommendation-card', 'filters'],
    description: 'Recommendations based on quiz responses'
  },
  {
    name: 'Trip',
    filename: 'trip.html',
    components: ['navigation-wheel', 'recommendation-card'],
    description: 'Map view with route and selected gems'
  },
  {
    name: 'Add Gem',
    filename: 'add-gem.html',
    components: ['navigation-wheel'],
    description: 'Form to submit a new hidden gem'
  }
];

/**
 * COMPONENT LOADING SYSTEM
 * 
 * How reusable components will be integrated into pages:
 */

const componentLoader = {
  // Load a component into a container element
  async load(containerId, componentName) {
    // 1. Find the container element
    // 2. Fetch the component HTML from /components/ directory
    // 3. Insert into container
    // 4. Load component JavaScript if needed
    // 5. Initialize the component
  }
};

/**
 * INTERACTION FLOWS
 * 
 * Key user journeys through the application:
 */

// 1. New user flow
const newUserFlow = [
  'Land on home page',
  'See explanation of hidden gems concept',
  'Click "Start a Trip" from navigation wheel',
  'Complete preference quiz',
  'View personalized recommendations',
  'Select gems for itinerary',
  'View optimized route with selected gems',
  'Save trip (optional)'
];

// 2. Returning user flow
const returningUserFlow = [
  'Land on home page',
  'See previous trips or recently viewed gems',
  'Use filters to find specific types of gems',
  'View gem details',
  'Add new gems to saved trips',
  'Explore new regions'
];

// 3. Adding a gem flow
const addGemFlow = [
  'Click "Add a Gem" from navigation wheel',
  'Fill out gem details form',
  'Set location on map',
  'Add photos (placeholder in demo)',
  'Add tags and attributes',
  'Submit gem',
  'See confirmation'
];

/**
 * GAME-LIKE ELEMENTS
 * 
 * Features that make the app feel more interactive:
 */

const gameElements = {
  // 1. Discovery progress
  discoveryTracking: {
    regionProgress: {
      // Percentage of hidden gems found in each region
      // Visualized as progress bars or completion circles
    },
    totalDiscovered: 'number',
    totalAvailable: 'number'
  },
  
  // 2. Visual distinction for truly hidden gems
  gemClassification: {
    // Special markers or labels for extremely rare locations
    // Visualization of "hidden-ness" through UI elements
  },
  
  // 3. Interactive map exploration
  mapInteraction: {
    // Progressive reveal of areas
    // Visual feedback when discovering new gems
    // Path tracking between discovered locations
  }
};

/**
 * IMPLEMENTATION CONSIDERATIONS
 * 
 * Technical notes for the frontend-focused implementation:
 */

// 1. Load static data
function loadMockData() {
  // Check if data is already in sessionStorage
  // If not, load from JSON files and store
  // Return the data for use in the application
}

// 2. Component initialization
function initializeComponents() {
  // For each component on the page
  // Load the component HTML and JS
  // Initialize with appropriate data
}

// 3. Filter and recommendation logic
function filterRecommendations(allGems, filters) {
  // Apply various filters
  // Score remaining gems based on user preferences
  // Sort and return top matches
}

// 4. State persistence between pages
function saveStateBeforeNavigation() {
  // Save current filters, view state, etc. to sessionStorage
  // Allows for maintaining state across page navigation
}

// 5. Simulated API calls
function simulateApiCall(endpoint, data) {
  // Create a promise
  // Simulate network delay
  // Process request using local data
  // Return response
}