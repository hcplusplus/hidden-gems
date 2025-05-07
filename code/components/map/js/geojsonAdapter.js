/**
 * Berkeley Hidden Gems GeoJSON Adapter
 * Converts GeoJSON data from berkeley_hidden_gems.geojson to a format compatible with the application
 */

// Ensure namespace exists
var HiddenGems = window.HiddenGems || {};

// GeoJSON adapter sub-namespace
HiddenGems.geojsonAdapter = {
    /**
     * Load the berkeley_hidden_gems.geojson file
     * @returns {Promise<Object>} Promise that resolves with processed gems data
     */
    loadGemsData: async function() {
        try {
            // Load the GeoJSON file
            const response = await fetch('../../assets/data/berkeley_hidden_gems.geojson');
            
            if (!response.ok) {
                throw new Error(`Failed to load GeoJSON: ${response.status} ${response.statusText}`);
            }
            
            const geojson = await response.json();
            
            // Process the GeoJSON into our app's data format
            return this.processGeojson(geojson);
        } catch (error) {
            console.error('Error loading GeoJSON data:', error);
            throw error;
        }
    },
    
    /**
     * Process GeoJSON data into application format
     * @param {Object} geojson - GeoJSON data
     * @returns {Object} Processed data in app format
     */
    processGeojson: function(geojson) {
        // Check if this is a valid GeoJSON FeatureCollection
        if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
            console.error('Invalid GeoJSON data format');
            return { gems: [] };
        }
        
        // Category icons mapping for visual representation
        const categoryIcons = {
            'leisure': '🏞️',
            'amenity': '🍽️',
            'natural': '🌲',
            'historic': '🏛️'
        };
        
        // Process features into gems
        const gems = geojson.features
            .filter(feature => {
                // Filter valid features (must have geometry and properties)
                return feature.geometry && 
                       feature.geometry.type === 'Point' && 
                       feature.geometry.coordinates &&
                       feature.geometry.coordinates.length === 2 &&
                       feature.properties;
            })
            .map((feature, index) => {
                const props = feature.properties;
                
                // Determine primary category and subcategory
                let category = null;
                let subcategory = null;
                let icon = '📍'; // Default icon
                
                // Check for category types in order of preference
                if (props.leisure) {
                    category = 'leisure';
                    subcategory = props.leisure;
                    icon = categoryIcons.leisure;
                } else if (props.natural) {
                    category = 'natural';
                    subcategory = props.natural;
                    icon = categoryIcons.natural;
                } else if (props.historic) {
                    category = 'historic';
                    subcategory = props.historic;
                    icon = categoryIcons.historic;
                } else if (props.amenity) {
                    category = 'amenity';
                    subcategory = props.amenity;
                    icon = categoryIcons.amenity;
                }
                
                // Format subcategory for display
                const formattedSubcategory = subcategory ? 
                    subcategory.charAt(0).toUpperCase() + subcategory.slice(1).replace(/_/g, ' ') : 
                    'Unknown';
                
                // Determine gem tier based on popularity score
                // Tier 1 = Most hidden, Tier 3 = Least hidden
                let tier = 1;
                if (props.popularity_score === null || props.popularity_score === 0) {
                    tier = 1; // Most hidden/undiscovered
                } else if (props.popularity_score <= 30) {
                    tier = 2; // Moderately hidden
                } else {
                    tier = 3; // Least hidden
                }
                
                // Generate accessibility tags
                const accessibilityTags = [];
                if (props.wheelchair) {
                    accessibilityTags.push('wheelchair');
                    if (props.wheelchair === 'yes' || props.wheelchair === 'designated') {
                        accessibilityTags.push('easy-trails');
                    }
                }
                
                // Generate activity tags based on the category
                const activityTags = [];
                
                if (category === 'leisure') {
                    if (subcategory === 'park' || subcategory === 'garden') {
                        activityTags.push('nature', 'relaxing');
                    } else if (subcategory === 'swimming_pool' || subcategory === 'swimming_area') {
                        activityTags.push('swimming');
                    } else if (subcategory === 'picnic_site' || subcategory === 'picnic_table') {
                        activityTags.push('picnic');
                    } else if (subcategory === 'bird_hide') {
                        activityTags.push('wildlife', 'photography');
                    }
                } else if (category === 'natural') {
                    activityTags.push('nature');
                    if (subcategory === 'beach') {
                        activityTags.push('swimming');
                    } else if (subcategory === 'peak' || subcategory === 'viewpoint') {
                        activityTags.push('views', 'photography');
                    } else if (subcategory === 'water' || subcategory === 'waterfall') {
                        activityTags.push('photography');
                    }
                } else if (category === 'historic') {
                    activityTags.push('history');
                    if (subcategory === 'monument' || subcategory === 'memorial') {
                        activityTags.push('photography');
                    }
                } else if (category === 'amenity') {
                    if (subcategory === 'cafe') {
                        activityTags.push('coffee');
                    } else if (subcategory === 'restaurant') {
                        activityTags.push('food');
                    } else if (subcategory === 'viewpoint') {
                        activityTags.push('views', 'photography');
                    }
                }
                
                // Estimate visit duration based on the type of place
                let visitDuration = "30-60 min";
                if (category === 'natural' && (subcategory === 'peak' || subcategory === 'forest')) {
                    visitDuration = "1-2 hours";
                } else if (category === 'leisure' && (subcategory === 'park' || subcategory === 'garden')) {
                    visitDuration = "1-2 hours";
                } else if (category === 'amenity' && (subcategory === 'restaurant' || subcategory === 'cafe')) {
                    visitDuration = "30-60 min";
                } else if (category === 'historic') {
                    visitDuration = "30-60 min";
                }
                
                // Default opening hours if not available in the data
                let openingHours = props.opening_hours || "Unknown hours";
                if (category === 'natural') {
                    openingHours = "Dawn to Dusk | Free";
                }
                
                // Create the gem object in our application format
                return {
                    id: `gem-${index}`,
                    title: props.name || `Unnamed ${formattedSubcategory}`,
                    address: `Near ${this._getNearestLandmark(feature.geometry.coordinates)}`,
                    hours: openingHours,
                    category: category,
                    subcategory: subcategory,
                    formatted_subcategory: formattedSubcategory,
                    coordinates: feature.geometry.coordinates,
                    description: this._generateDescription(category, subcategory, props),
                    detourTime: `${Math.floor(Math.random() * 20) + 10} mins`,
                    popularity: props.popularity_score || 0,
                    tier: tier,
                    tags: [...new Set([...activityTags, ...accessibilityTags])], // Deduplicate
                    icon: icon,
                    is_unnamed: !props.name || props.name.trim() === '',
                    accessibility: {
                        wheelchair: props.wheelchair || 'unknown',
                        has_facilities: props.toilets === 'yes'
                    },
                    original_properties: props // Keep original properties for reference
                };
            });
        
        return {
            gems: gems,
            categories: this._extractCategories(gems)
        };
    },
    
    /**
     * Generate a description for a gem based on its attributes
     * @param {string} category - Primary category
     * @param {string} subcategory - Subcategory
     * @param {Object} props - Original properties
     * @returns {string} Generated description
     * @private
     */
    _generateDescription: function(category, subcategory, props) {
        // Default description parts
        let parts = [];
        
        // Determine if it's undiscovered
        const isUndiscovered = !props.name || props.popularity_score === 0 || props.popularity_score === null;
        
        // Add discovery status
        if (isUndiscovered) {
            parts.push("An undiscovered local secret");
        } else if (props.popularity_score && props.popularity_score < 30) {
            parts.push("A hidden gem known to few locals");
        }
        
        // Add category-specific descriptions
        if (category === 'leisure') {
            if (subcategory === 'park') {
                parts.push("A peaceful park space perfect for unwinding");
            } else if (subcategory === 'garden') {
                parts.push("A charming garden with various plant species");
            } else if (subcategory === 'swimming_pool' || subcategory === 'swimming_area') {
                parts.push("A refreshing spot for swimming away from the crowds");
            } else if (subcategory === 'picnic_site') {
                parts.push("An ideal location for a relaxing picnic");
            }
        } else if (category === 'natural') {
            if (subcategory === 'beach') {
                parts.push("A secluded beach area off the usual tourist path");
            } else if (subcategory === 'peak') {
                parts.push("Offers panoramic views of the surrounding landscape");
            } else if (subcategory === 'water' || subcategory === 'waterfall') {
                parts.push("A serene water feature in a natural setting");
            } else if (subcategory === 'tree') {
                parts.push("A remarkable tree with special characteristics");
            } else {
                parts.push("A natural feature worth exploring");
            }
        } else if (category === 'historic') {
            if (subcategory === 'monument' || subcategory === 'memorial') {
                parts.push("A historical monument with local significance");
            } else if (subcategory === 'archaeological_site') {
                parts.push("An archeological site with historical importance");
            } else if (subcategory === 'ruins') {
                parts.push("Interesting ruins from a bygone era");
            } else {
                parts.push("A piece of history waiting to be discovered");
            }
        } else if (category === 'amenity') {
            if (subcategory === 'cafe') {
                parts.push("A cozy cafe with character and charm");
            } else if (subcategory === 'restaurant') {
                parts.push("A local eatery off the beaten path");
            } else if (subcategory === 'viewpoint') {
                parts.push("Offers spectacular views worth the visit");
            } else {
                parts.push("A local amenity that tourists often miss");
            }
        }
        
        // Add accessibility information
        if (props.wheelchair === 'yes') {
            parts.push("Wheelchair accessible");
        } else if (props.wheelchair === 'limited') {
            parts.push("Limited wheelchair accessibility");
        }
        
        // Add typical visit information
        if (category === 'natural' || category === 'leisure') {
            if (props.toilets === 'yes') {
                parts.push("Restroom facilities available");
            }
        }
        
        return parts.join(". ") + ".";
    },
    
    /**
     * Get nearest landmark name for address display
     * @param {Array} coordinates - [longitude, latitude] coordinates
     * @returns {string} Nearest landmark name
     * @private
     */
    _getNearestLandmark: function(coordinates) {
        // This is a simplified placeholder function
        // In a real implementation, this would use actual geographic data
        
        // For Berkeley area, return a random landmark
        const landmarks = [
            "UC Berkeley Campus",
            "Downtown Berkeley",
            "Berkeley Hills",
            "Telegraph Avenue",
            "North Berkeley",
            "South Berkeley",
            "Berkeley Marina",
            "Tilden Regional Park",
            "Gourmet Ghetto",
            "Elmwood District"
        ];
        
        const randomIndex = Math.floor(Math.random() * landmarks.length);
        return landmarks[randomIndex];
    },
    
    /**
     * Extract unique categories and subcategories from gems
     * @param {Array} gems - Processed gems
     * @returns {Object} Categories and subcategories
     * @private
     */
    _extractCategories: function(gems) {
        const categories = {
            leisure: {},
            natural: {},
            historic: {},
            amenity: {}
        };
        
        // Extract categories and subcategories
        gems.forEach(gem => {
            if (gem.category && gem.subcategory) {
                if (!categories[gem.category][gem.subcategory]) {
                    categories[gem.category][gem.subcategory] = 0;
                }
                categories[gem.category][gem.subcategory]++;
            }
        });
        
        return categories;
    },

    // Add this to geojson-adapter.js
cacheGemsData: function(data) {
    localStorage.setItem('cachedGemsData', JSON.stringify(data));
    localStorage.setItem('gemsDataTimestamp', Date.now());
    console.log('Gems data cached to localStorage');
},

loadCachedData: function() {
    const cachedData = localStorage.getItem('cachedGemsData');
    const timestamp = localStorage.getItem('gemsDataTimestamp');
    
    // Use cache if it exists and is less than 24 hours old
    if (cachedData && timestamp) {
        const age = (Date.now() - timestamp) / (1000 * 60 * 60);
        if (age < 24) {
            return JSON.parse(cachedData);
        }
    }
    return null;
},
    
    /**
     * Update application data with processed GeoJSON data
     * @returns {Promise} Promise that resolves when data is updated
     */
    updateAppData: async function() {
        try {
            // Load GeoJSON data
            const data = await this.loadGemsData();
            
            // Update HiddenGems.data.gems
            HiddenGems.data.gems = data.gems;
            
            console.log(`Updated app data with ${data.gems.length} gems`);
            return data;
        } catch (error) {
            console.error('Failed to update app data:', error);
            throw error;
        }
    }

    
};



// Export the namespace
window.HiddenGems = HiddenGems;