/**
 * Data definitions for the Hidden Gems application
 */

// Ensure namespace exists
var HiddenGems = window.HiddenGems || {};

   // TODO: generate route data
   const test_origin = JSON.parse(sessionStorage.getItem("originCoords"));
   const test_destination = JSON.parse(sessionStorage.getItem("destinationCoords"));

   console.log('Test Origin:', test_origin);
    console.log('Test Destination:', test_destination); 
// Data sub-namespace
HiddenGems.data = {
    // Hidden gems data
    gems: [
        {
            id: 'nature1',
            title: 'Secret Sunol Waterfall',
            address: '1895 Geary Rd, Sunol, CA',
            hours: '8:00 AM - Sunset | Free',
            category: 'nature',
            coordinates: [-121.8250, 37.5013],
            description: 'A small hidden waterfall with a natural pool, perfect for a quick dip on hot days',
            detourTime: '25 mins',
            popularity: 2,
            tags: ['hiking', 'waterfall', 'swimming']
        },
        {
            id: 'food1',
            title: 'Mission Peak Vineyard',
            address: '43682 Mission Blvd, Fremont, CA',
            hours: '10:00 AM - 6:00 PM | $$',
            category: 'food',
            coordinates: [-121.9196, 37.5185],
            description: 'Small family-owned vineyard with rare local varieties and panoramic bay views',
            detourTime: '35 mins',
            popularity: 3,
            tags: ['wine-tasting', 'views', 'food']
        },
        {
            id: 'cultural1',
            title: 'Historic Alviso Adobe',
            address: '3465 Old Foothill Rd, Pleasanton, CA',
            hours: '10:00 AM - 4:00 PM | Free',
            category: 'cultural',
            coordinates: [-121.8761, 37.6607],
            description: 'Restored 1854 adobe home showcasing Californio rancho life',
            detourTime: '20 mins',
            popularity: 2,
            tags: ['history', 'architecture', 'easy-trails']
        },
        {
            id: 'nature2',
            title: 'Sunol Regional Wilderness',
            address: 'Sunol Regional Wilderness, Sunol, CA',
            hours: 'Sunrise - Sunset | $6',
            category: 'nature',
            coordinates: [-121.7823, 37.5204],
            description: 'Hidden swimming holes and unusual geological formations called "Little Yosemite"',
            detourTime: '40 mins',
            popularity: 3,
            tags: ['hiking', 'swimming', 'photography']
        },
        {
            id: 'food2',
            title: 'Olivina Olive Press',
            address: '4555 Arroyo Rd, Livermore, CA',
            hours: 'By appointment | $$',
            category: 'food',
            coordinates: [-121.7566, 37.6629],
            description: 'Historic olive oil producer dating back to 1881 with old-growth olive trees',
            detourTime: '30 mins',
            popularity: 1,
            tags: ['food', 'history', 'wheelchair']
        }
    ],

 

    routes: {
        current: {
            origin: {
                name: 'Pleasanton',
                coordinates: [-121.8746, 37.6624]
            },
            destination: {
                name: 'Mission San José',
                coordinates: [-121.9201, 37.5319]
            },
            mainRoute: [
                [-121.8746, 37.6624], // Pleasanton
                [-121.8691, 37.6545],
                [-121.8647, 37.6451],
                [-121.8602, 37.6351],
                [-121.8568, 37.6248],
                [-121.8546, 37.6149],
                [-121.8565, 37.6052],
                [-121.8625, 37.5950],
                [-121.8694, 37.5858],
                [-121.8782, 37.5756],
                [-121.8854, 37.5659],
                [-121.8935, 37.5569],
                [-121.9019, 37.5481],
                [-121.9112, 37.5398],
                [-121.9201, 37.5319]  // Mission San José
            ]
        }
    },

    // Default user preferences
    defaultPreferences: {
        activities: [],
        accessibility: [],
        detourTime: 60,
        popularity: 3
    }
};

// Export the namespace
window.HiddenGems = HiddenGems;