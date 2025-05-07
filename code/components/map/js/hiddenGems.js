// HiddenGemsService class
class HiddenGemsService {
  constructor() {
      this.data = null;
      this.subcategories = {
          leisure: [],
          amenity: [],
          natural: [],
          historic: []
      };
  }

  async loadData(filePath) {
      try {
          const response = await fetch(filePath);
          if (!response.ok) {
              throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
          }
          
          // For GeoJSON format
          const rawData = await response.json();
          
          // Transform GeoJSON to our data model if needed
          if (rawData.type === 'FeatureCollection') {
              this.data = {
                  gems: rawData.features.map(feature => {
                      // Extract properties
                      const props = feature.properties;
                      
                      // Create gem object
                      return {
                          id: props.id,
                          name: props.name || 'Unnamed Location',
                          type: props.type,
                          coordinates: {
                              latitude: feature.geometry.coordinates[1],
                              longitude: feature.geometry.coordinates[0]
                          },
                          amenity: props.amenity,
                          leisure: props.leisure,
                          natural: props.natural,
                          historic: props.historic,
                          popularity_score: props.popularity_score,
                          // Add any other properties
                          ...props
                      };
                  })
              };
          } else {
              // Assume it's already in our format
              this.data = rawData;
          }
          
          // Extract subcategories
          this.extractSubcategories();
          
          console.log(`Loaded ${this.data.gems.length} hidden gems`);
          return this.data;
      } catch (error) {
          console.error('Error loading hidden gems data:', error);
          throw error;
      }
  }
  
  extractSubcategories() {
      // Clear existing subcategories
      for (let category in this.subcategories) {
          this.subcategories[category] = [];
      }
      
      // Extract unique subcategories
      this.data.gems.forEach(gem => {
          for (let category in this.subcategories) {
              if (gem[category] && !this.subcategories[category].includes(gem[category])) {
                  this.subcategories[category].push(gem[category]);
              }
          }
      });
      
      // Sort subcategories
      for (let category in this.subcategories) {
          this.subcategories[category].sort();
      }
  }

  filterValidGems(gems) {
      // Define required properties
      const requiredProperties = ['coordinates']; 
      
      return gems.filter(gem => {
          // Check that all required properties exist and are not empty
          return requiredProperties.every(prop => {
              if (prop === 'coordinates') {
                  return gem.coordinates && 
                         gem.coordinates.latitude !== undefined && 
                         gem.coordinates.longitude !== undefined;
              }
              return gem[prop] !== undefined && 
                     gem[prop] !== null && 
                     gem[prop] !== '';
          });
      });
  }

  getAllGems() {
      // Filter out gems missing essential properties
      return this.filterValidGems(this.data?.gems || []);
  }

  getGemsByCategory(category, subcategory = null, limit = 20, randomize = false) {
    let validGems = [];
    
    if (!this.data?.gems) {
        return [];
    }
    
    // Filter all valid gems first
    const allValidGems = this.filterValidGems(this.data.gems);
    
    if (category === 'all') {
        // If category is 'all', we need to get gems from each category
        if (randomize) {
            return this.getRandomGemsPerCategory(allValidGems, limit);
        } else {
            return this.limitGemsPerCategory(allValidGems, limit);
        }
    }
    
    // Filter by specific category
    validGems = allValidGems.filter(gem => {
        // Check if the gem has this category
        const hasCategory = gem[category] !== undefined;
        
        // If subcategory is specified and not "all", check if it matches
        if (subcategory && subcategory !== 'all' && hasCategory) {
            return gem[category] === subcategory;
        }
        
        return hasCategory;
    });
    
    // Randomize if requested
    if (randomize && validGems.length > limit) {
        return this.getRandomSample(validGems, limit);
    }
    
    // Otherwise just limit the results
    return validGems.slice(0, limit);
}

// New method to get random gems from each category
getRandomGemsPerCategory(gems, totalLimit) {
    // Group gems by their primary category
    const categorized = {
        leisure: [],
        amenity: [],
        natural: [],
        historic: []
    };
    
    // Put each gem in its primary category
    gems.forEach(gem => {
        if (gem.leisure) categorized.leisure.push(gem);
        else if (gem.amenity) categorized.amenity.push(gem);
        else if (gem.natural) categorized.natural.push(gem);
        else if (gem.historic) categorized.historic.push(gem);
    });
    
    // Calculate limit per category based on available gems in each category
    const totalGems = Object.values(categorized).reduce(
        (sum, catGems) => sum + catGems.length, 0
    );
    
    // Random sample from each category and combine
    const randomSamples = [];
    
    for (const category in categorized) {
        if (categorized[category].length > 0) {
            // Calculate proportional limit for this category
            const categoryRatio = categorized[category].length / totalGems;
            const categoryLimit = Math.ceil(totalLimit * categoryRatio);
            
            // Get random sample from this category
            const sample = this.getRandomSample(
                categorized[category], 
                Math.min(categoryLimit, categorized[category].length)
            );
            
            randomSamples.push(...sample);
        }
    }
    
    // If we have too many samples, do a final random selection
    if (randomSamples.length > totalLimit) {
        return this.getRandomSample(randomSamples, totalLimit);
    }
    
    return randomSamples;
}

// Helper method to get a random sample from an array
getRandomSample(array, sampleSize) {
    if (array.length <= sampleSize) {
        return [...array]; // Return a copy of the entire array
    }
    
    // Fisher-Yates shuffle algorithm for efficient random sampling
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled.slice(0, sampleSize);
}


  getGemsByPopularity(maxScore) {
      // First filter by validity
      const validGems = this.filterValidGems(this.data?.gems || []);
      
      if (maxScore === 0) {
          // Only return undiscovered places (null or 0 popularity)
          return validGems.filter(gem => gem.popularity_score === null || gem.popularity_score === 0);
      }
      
      return validGems.filter(gem => 
          gem.popularity_score === null || 
          gem.popularity_score === 0 || 
          gem.popularity_score <= maxScore
      );
  }

  combineFilters(gems, filters) {
      return gems.filter(gem => 
          filters.every(filterFn => filterFn(gem))
      );
  }
}

// Main application code
document.addEventListener('DOMContentLoaded', () => {
  window.filtersApplied = false;
  const gemsService = new HiddenGemsService();
  const categoryFilter = document.getElementById('category-filter');
  const subcategoryFilter = document.getElementById('subcategory-filter');
  const filterButton = document.getElementById('filter-button');
  const resultsContainer = document.getElementById('results');
  
  // Load the data
  gemsService.loadData('./assets/data/berkeley_hidden_gems.geojson')
      .then(() => {
          // Update UI
          updateSubcategoryOptions();
          applyFilters();
      })
      .catch(error => {
          resultsContainer.innerHTML = `
              <div class="error">
                  <p>Error loading data: ${error.message}</p>
                  <p>Make sure the file path is correct: ./assets/data/berkeley_hidden_gems.geojson</p>
              </div>
          `;
      });
  
  // Event listeners
  categoryFilter.addEventListener('change', updateSubcategoryOptions);
  filterButton.addEventListener('click', applyFilters);
  
  // Update subcategory options based on category selection
  function updateSubcategoryOptions() {
      const category = categoryFilter.value;
      subcategoryFilter.innerHTML = '<option value="all">All Subcategories</option>';
      
      if (category !== 'all' && gemsService.subcategories[category]) {
          gemsService.subcategories[category].forEach(subcategory => {
              const option = document.createElement('option');
              option.value = subcategory;
              option.textContent = subcategory.charAt(0).toUpperCase() + subcategory.slice(1);
              subcategoryFilter.appendChild(option);
          });
      }
  }
  
  // Apply filters and update results
  function applyFilters() {
    const category = categoryFilter.value;
    const subcategory = subcategoryFilter.value;
    const gemsLimit = 20; // Limit to 20 gems total
    
    // Whether to randomize results (true for initial load, false for filters)
    const randomize = !window.filtersApplied;
    window.filtersApplied = true; // Set flag after first load
    
    // Get filtered gems with limit and randomization
    let filteredGems = gemsService.getGemsByCategory(category, subcategory, gemsLimit, randomize);
    
    
    // Display results
    displayResults(filteredGems);
}
  
  // Display results in the UI
  function displayResults(gems) {
      if (!gems || gems.length === 0) {
          resultsContainer.innerHTML = '<p>No hidden gems found matching your criteria.</p>';
          return;
      }
      
      // Display counter
      const counterHtml = `<div class="counter">Found ${gems.length} hidden gems</div>`;
      
      // Generate HTML for each gem
      const gemsHtml = gems.map(gem => {
          // If no name, ensure it's considered undiscovered
          const isUnnamed = !gem.name || gem.name.trim() === '';
          if (isUnnamed && gem.popularity_score !== 0) {
              gem.popularity_score = 0; // Ensure unnamed places are marked as undiscovered
          }
          
          // Determine primary category
          let primaryCategory = '';
          let subcategory = '';
          
          if (gem.leisure) {
              primaryCategory = 'Leisure';
              subcategory = gem.leisure;
          } else if (gem.amenity) {
              primaryCategory = 'Amenity';
              subcategory = gem.amenity;
          } else if (gem.natural) {
              primaryCategory = 'Natural';
              subcategory = gem.natural;
          } else if (gem.historic) {
              primaryCategory = 'Historic';
              subcategory = gem.historic;
          }
          
          // Format subcategory
          subcategory = subcategory.charAt(0).toUpperCase() + subcategory.slice(1).replace('_', ' ');
          
          // Generate details HTML
          const details = [];
          if (gem.wheelchair) details.push(`<span class="gem-detail">♿ Wheelchair: ${gem.wheelchair}</span>`);
          if (gem.access) details.push(`<span class="gem-detail">🚪 Access: ${gem.access}</span>`);
          if (gem.opening_hours) details.push(`<span class="gem-detail">🕒 Hours: ${gem.opening_hours}</span>`);
          
          // Generate popularity badge
          let popularityHtml = '';
          if (gem.popularity_score === null || gem.popularity_score === 0) {
              popularityHtml = '<span class="popularity undiscovered">Undiscovered</span>';
          } else {
              popularityHtml = `<span class="popularity low-popularity">Recent Visitors: ${gem.popularity_score}</span>`;
          }
          
          // Use a special class for unnamed places
          const nameClass = isUnnamed ? 'gem-name unnamed' : 'gem-name';
          
          return `
              <div class="gem-card">
                  <div class="${nameClass}">${isUnnamed ? 'Unnamed Location' : gem.name}</div>
                  <div class="gem-category">${primaryCategory}: ${subcategory}</div>
                  <div class="gem-details">
                      ${details.join('')}
                      ${popularityHtml}
                  </div>
                  <div>
                      <small>Coordinates: ${gem.coordinates.latitude.toFixed(6)}, ${gem.coordinates.longitude.toFixed(6)}</small>
                  </div>
              </div>
          `;
      }).join('');
      
      // Update the results container
      resultsContainer.innerHTML = counterHtml + gemsHtml;
  }
});