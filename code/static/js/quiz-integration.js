/**
 * quiz-integration.js
 * Integrates the quiz with the data controller to save user preferences and filters gems along a route
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    const GEOCODE_API = 'https://api.opencagedata.com/geocode/v1/json';
    const GEOCODE_KEY = 'fa00c10bb490481abc0614f3d6c9af3b';
    
 /**
 * Geocode a location string to coordinates within Northern California bounds
 * @param {string} location - Location text to geocode
 * @returns {Promise<Array>} - Promise resolving to [longitude, latitude] coordinates
 */
async function geocode(location) {
    try {
        // Northern California bounds: West/South to East/North
        const NORCAL_BOUNDS = "-125,37,-118,42";
        
        // Check if the location already includes state information
        const hasStateOrZip = /\b(CA|California|[0-9]{5}(-[0-9]{4})?)\b/i.test(location);
        
        // Append ", California" if it doesn't already have state info
        const searchLocation = hasStateOrZip ? location : `${location}, California`;
        console.log(`Geocoding: ${searchLocation}`);
        
        // First attempt: With California and bounds
        const res = await fetch(`${GEOCODE_API}?q=${
            encodeURIComponent(searchLocation)
        }&key=${GEOCODE_KEY}&countrycode=us&bounds=${NORCAL_BOUNDS}`);
        
        const data = await res.json();
        
        // Check if we got valid results
        if (data.results && data.results.length > 0) {
            const coords = data.results[0]?.geometry;
            
            // Verify the coordinates are within Northern California bounds
            if (coords) {
                const { lng, lat } = coords;
                const inNorCal = lng >= -125 && lng <= -118 && lat >= 37 && lat <= 42;
                
                if (inNorCal) {
                    console.log(`Found location in Northern California: [${lng}, ${lat}]`);
                    return [lng, lat];
                } else {
                    console.log("Location found but outside Northern California bounds");
                }
            }
        }
        
        // Second attempt: Without bounds if the first attempt failed or was out of bounds
        console.log("Trying second geocoding attempt without bounds restriction");
        const fallbackRes = await fetch(`${GEOCODE_API}?q=${
            encodeURIComponent(searchLocation)
        }&key=${GEOCODE_KEY}&countrycode=us`);
        
        const fallbackData = await fallbackRes.json();
        
        // Check second attempt results
        if (fallbackData.results && fallbackData.results.length > 0) {
            const fallbackCoords = fallbackData.results[0]?.geometry;
            
            // Still verify the coordinates are within Northern California bounds
            if (fallbackCoords) {
                const { lng, lat } = fallbackCoords;
                const inNorCal = lng >= -125 && lng <= -118 && lat >= 37 && lat <= 42;
                
                if (inNorCal) {
                    console.log(`Found location in Northern California (second attempt): [${lng}, ${lat}]`);
                    return [lng, lat];
                } else {
                    console.log("Second attempt location also outside Northern California bounds");
                }
            }
        }
        
        // If we got here, no valid location was found within bounds
        console.log("No valid location found within Northern California bounds");
        return null;
        
    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
}

/**
 * Generate route gems quietly in the background
 * This function runs asynchronously without blocking the UI
 */
function generateRouteGemsQuietly() {
    console.log("Starting quiet background route gem generation");
    
    // Schedule the geocoding and processing to happen asynchronously
    setTimeout(async function() {
        try {
            // Clear any previous route cache
            if (typeof window.HiddenGems.data.clearRouteCache === 'function') {
                window.HiddenGems.data.clearRouteCache();
            }

            // Store the city names
            const originName = quizState.answers.origin;
            const destinationName = quizState.answers.destination;
            
            // Geocode the origin and destination
            const [originCoords, destinationCoords] = await Promise.all([
                geocode(quizState.answers.origin),
                geocode(quizState.answers.destination)
            ]);
            
            console.log("Geocoded coordinates:", { origin: originCoords, destination: destinationCoords });
            
            if (!originCoords || !destinationCoords) {
                console.error("Background geocoding failed for one or both locations");
                return;
            }
            
            // Store coordinates in quiz state
            quizState.answers.originCoords = originCoords;
            quizState.answers.destinationCoords = destinationCoords;
            
            // Save to storage
            window.HiddenGems.data.storage.set("originCoords", JSON.stringify(originCoords));
            window.HiddenGems.data.storage.set("destinationCoords", JSON.stringify(destinationCoords));
            window.HiddenGems.data.storage.set("originName", JSON.stringify(originName));
            window.HiddenGems.data.storage.set("destinationName", JSON.stringify(destinationName));
            
            
            // Find gems along the route
            if (typeof window.HiddenGems.data.findGemsAlongRoute === 'function') {
                // Use "backgroundQuiz" as page name to differentiate from final results
                const routeGems = await window.HiddenGems.data.findGemsAlongRoute(
                    "backgroundQuiz", 
                    originCoords, 
                    destinationCoords, 
                    30,  // Buffer distance in km
                    50,  // Get a larger initial sample to filter later
                    originName,
                    destinationName  // Pass city names to use in region naming
                );
                
                console.log(`Quietly found ${routeGems.length} gems along route`);
                
                // Store the gems in session storage
                sessionStorage.setItem("backgroundRouteGems", JSON.stringify(routeGems));
                quizState.sampledGems = routeGems;
            } else {
                console.error("findGemsAlongRoute function not available for background processing");
            }
        } catch (error) {
            console.error("Error in background route gem generation:", error);
            // Fail silently - we'll try again at finish if needed
        }
    }, 100); // Tiny delay to ensure the UI isn't blocked
}
    
    const quizState = {
        currentStep: 1,
        totalSteps: 4,
        answers: {
            origin: '',
            destination: '',
            activities: [],
            otherActivities: '',
            amenities: [],
            effortLevel: '',
            accessibility: [],
            otherAccessibility: '',
            time: ''
        }
    };
    
    // Get DOM elements
    const progressBar = document.getElementById('quiz-progress');
    const backButton = document.getElementById('back-button');
    const nextButton = document.getElementById('next-button');
    const closeButton = document.getElementById('close-quiz');
    const quizSteps = document.querySelectorAll('.quiz-step');
    
    const originInput = document.getElementById('origin');
    const destinationInput = document.getElementById('destination');
    const originError = document.getElementById('origin-error');
    const destinationError = document.getElementById('destination-error');
    
    // Other input fields
    const otherActivityButton = document.getElementById('other-activity-button');
    const otherActivityContainer = document.getElementById('other-activity-container');
    const otherActivityInput = document.getElementById('other-activity-input');
    
    const otherAccessibilityButton = document.getElementById('other-accessibility-button');
    const otherAccessibilityContainer = document.getElementById('other-accessibility-container');
    const otherAccessibilityInput = document.getElementById('other-accessibility-input');
    
    // Set up the "Other" option toggles
    if (otherActivityButton) {
        otherActivityButton.addEventListener('click', function() {
            this.classList.toggle('selected');
            otherActivityContainer.style.display = this.classList.contains('selected') ? 'block' : 'none';
        });
    }
    
    if (otherAccessibilityButton) {
        otherAccessibilityButton.addEventListener('click', function() {
            this.classList.toggle('selected');
            otherAccessibilityContainer.style.display = this.classList.contains('selected') ? 'block' : 'none';
            
            // If "None" is selected, deselect it when "Other" is selected
            if (this.classList.contains('selected')) {
                document.querySelectorAll('.option-button[data-value="none"]')
                    .forEach(btn => btn.classList.remove('selected'));
            }
        });
    }
    
    /**
     * Update the progress bar
     */
    function updateProgress() {
        const progress = (quizState.currentStep / quizState.totalSteps) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    /**
     * Navigate to a specific step in the quiz
     * @param {number} step - Step number to go to
     */
    function goToStep(step) {
        quizSteps.forEach(el => el.classList.remove('active'));
        document.getElementById(`step-${step}`).classList.add('active');
        quizState.currentStep = step;
        backButton.disabled = step === 1;
        nextButton.textContent = step === quizState.totalSteps ? 'Finish' : 'Next';
        updateProgress();
    }
    
    /**
     * Validate the current step
     * @returns {boolean} - Whether the step is valid
     */
    function validateCurrentStep() {
        switch (quizState.currentStep) {
        case 1:
            let isValid = true;
            if (!originInput.value.trim()) {
                originError.style.display = 'block';
                isValid = false;
            } else {
                originError.style.display = 'none';
                quizState.answers.origin = originInput.value.trim();
            }
            
            if (!destinationInput.value.trim()) {
                destinationError.style.display = 'block';
                isValid = false;
            } else {
                destinationError.style.display = 'none';
                quizState.answers.destination = destinationInput.value.trim();
            }
            
            // If valid locations are entered, proceed to next step immediately
            // but also start the geocoding/route gem generation in the background
            if (isValid) {
                // Start background process to generate route gems
                generateRouteGemsQuietly();
                
                // Return true to allow normal step navigation
                return true;
            }
            return isValid;
                
            case 2:
                // Activities step (now with separated activity and amenity collection)
                // Get activities (all except amenities)
                const activityButtons = document.querySelectorAll('#step-4 .option-button.selected:not([data-value="restrooms"]):not([data-value="parking"]):not([data-value="gas"]):not([data-value="other-activity"])');
                quizState.answers.activities = Array.from(activityButtons).map(btn => btn.getAttribute('data-value'));
                
                // Get amenities (only restrooms, parking, gas)
                const amenityButtons = document.querySelectorAll('#step-4 .option-button.selected[data-value="restrooms"], #step-4 .option-button.selected[data-value="parking"], #step-4 .option-button.selected[data-value="gas"]');
                quizState.answers.amenities = Array.from(amenityButtons).map(btn => btn.getAttribute('data-value'));
                
                // Check for "Other" activity
                if (otherActivityButton && otherActivityButton.classList.contains('selected') && otherActivityInput) {
                    quizState.answers.otherActivities = otherActivityInput.value.trim();
                    if (quizState.answers.otherActivities) {
                        quizState.answers.activities.push('other');
                    }
                }
                
                return true;
                
            case 3:
                // Effort level (single select)
                const effortButtons = document.querySelectorAll('#step-3 .option-button[data-value="easy"].selected, #step-3 .option-button[data-value="moderate"].selected, #step-3 .option-button[data-value="challenging"].selected');
                const selectedEffort = Array.from(effortButtons)[0];
                quizState.answers.effortLevel = selectedEffort ? selectedEffort.getAttribute('data-value') : '';
                
                // Accessibility options (multiple select)
                const accessibilityButtons = document.querySelectorAll('#step-3 .option-button.selected[data-value="wheelchair"], #step-3 .option-button.selected[data-value="stroller"], #step-3 .option-button.selected[data-value="elderly"], #step-3 .option-button.selected[data-value="none"]:not(#other-accessibility-button)');
                quizState.answers.accessibility = Array.from(accessibilityButtons).map(btn => btn.getAttribute('data-value'));
                
                // Check for "Other" accessibility
                if (otherAccessibilityButton && otherAccessibilityButton.classList.contains('selected') && otherAccessibilityInput) {
                    quizState.answers.otherAccessibility = otherAccessibilityInput.value.trim();
                    if (quizState.answers.otherAccessibility) {
                        quizState.answers.accessibility.push('other');
                    }
                }
                
                return true;
                
            case 4:
                // Time available
                const selectedTime = document.querySelector('input[name="time"]:checked');
                quizState.answers.time = selectedTime ? selectedTime.value : '';
                
                
                return true;
        }
        
        return true;
    }
    
    /**
     * Process the completed quiz and redirect
     */
    async function finishQuiz() {
        console.log("Running finishQuiz");
        
        const userData = quizState.answers;
    const overlay = document.getElementById("loading-overlay");
    
    // Show loading overlay immediately for user feedback
    if (overlay) {
        overlay.style.display = "flex";
        
        // Add a message element if it doesn't exist
        if (!document.getElementById("loading-message")) {
            const messageEl = document.createElement("div");
            messageEl.id = "loading-message";
            messageEl.style.color = "white";
            messageEl.style.marginTop = "15px";
            messageEl.style.textAlign = "center";
            messageEl.textContent = "Generating recommendations...";
            overlay.appendChild(messageEl);
        } else {
            document.getElementById("loading-message").textContent = "Generating recommendations...";
        }
    }
        
        try {
        // Get city names
        const originName = userData.origin;
        const destinationName = userData.destination;
        
        // First check if we have the pre-generated route gems
        let sampledGems = [];
        let originCoords = userData.originCoords;
        let destinationCoords = userData.destinationCoords;
        
         // Try to get gems from quizState
        if (quizState.sampledGems && quizState.sampledGems.length > 0) {
            console.log(`Using pre-generated gems for route from ${originName} to ${destinationName}`);
            sampledGems = quizState.sampledGems;
        } 
        // Then try from sessionStorage
        else {
            const storedGems = sessionStorage.getItem("backgroundRouteGems");
            if (storedGems) {
                console.log(`Using pre-generated gems from sessionStorage for route from ${originName} to ${destinationName}`);
                sampledGems = JSON.parse(storedGems);
            }
        }
        
        // If no gems found, or if coordinates are missing, we need to generate them now
        if (sampledGems.length === 0 || !originCoords || !destinationCoords) {
            // Update loading message
            if (document.getElementById("loading-message")) {
                document.getElementById("loading-message").textContent = "Finding your locations...";
            }
            
            console.log("No pre-generated gems found, generating now");
            
            // If coordinates are missing, geocode them now
            if (!originCoords || !destinationCoords) {
                [originCoords, destinationCoords] = await Promise.all([
                    geocode(originName),
                    geocode(destinationName)
                ]);
                
                if (!originCoords || !destinationCoords) {
                    throw new Error("Geocoding failed. Please check your location names.");
                }
                
                // Update user data
                userData.originCoords = originCoords;
                userData.destinationCoords = destinationCoords;
                
                // Save to storage
                window.HiddenGems.data.storage.set("originCoords", JSON.stringify(originCoords));
                window.HiddenGems.data.storage.set("destinationCoords", JSON.stringify(destinationCoords));
                window.HiddenGems.data.storage.set("originName", JSON.stringify(originName));
                window.HiddenGems.data.storage.set("destinationName", JSON.stringify(destinationName));
            }
            
            // Get buffer distance from user selection
            const bufferDistance = 30;
            
            // Generate gems
            if (typeof window.HiddenGems.data.findGemsAlongRoute === 'function') {
                sampledGems = await window.HiddenGems.data.findGemsAlongRoute(
                    "quiz", 
                    originCoords, 
                    destinationCoords,
                    bufferDistance,
                    10,  // Standard sample size
                    originName,
                    destinationName
                );
            } else {
                throw new Error("Route gem generation function not available");
            }
        }

        // Update loading message for API call
        if (document.getElementById("loading-message")) {
            document.getElementById("loading-message").textContent = "Generating personalized recommendations...";
        }
        
        console.log("Final sampledGems:", sampledGems);
        userData.candidates = sampledGems;
        
        // Also store route information in a more readable format
        userData.routeInfo = {
            origin: originName,
            destination: destinationName,
            originCoords: originCoords,
            destinationCoords: destinationCoords,
            detourTime: userData.selectedTime
        };
        
        sessionStorage.setItem("sampledGems", JSON.stringify(sampledGems));
        sessionStorage.setItem("routeInfo", JSON.stringify(userData.routeInfo));
        
        
        
            console.log("sampledGems:", sampledGems);
            userData.candidates = sampledGems;
            console.log("userData.candidates:", userData.candidates);


            try {
            const res = await fetch("http://127.0.0.1:5000/generate_recommendations", {
							method: "POST",
							headers: {
								"Content-Type": "application/json"
							},
							body: JSON.stringify(userData)
						});

						const gems = await res.json();
                        console.log("Recommended gems:", gems);
						sessionStorage.setItem("recommendedGems", JSON.stringify(gems));
				
						// Update message before navigation
                        if (document.getElementById("loading-message")) {
                            document.getElementById("loading-message").textContent = "Ready! Taking you to your recommendations...";
                        }

                        // Short delay before redirecting for better UX
                        setTimeout(() => {
                            window.location.href = "map-recs.html";
                        }, 500);

					} catch (err) {
						console.error("Error generating gems:", err);
						alert("Something went wrong. Please try again.");
						overlay.style.display = "none";
					}
            
            // Save preferences to our data controller if it exists
            if (window.HiddenGems.data) {
                const userPreferences = {
                activities: userData.activities || [],
                otherActivities: userData.otherActivities || '',
                amenities: userData.amenities || [],
                accessibility: userData.accessibility || [],
                otherAccessibility: userData.otherAccessibility || '',
                effortLevel: userData.effortLevel || 'moderate',
                detourTime: userData.time === 'quick' ? 30 : 
                            userData.time === 'short' ? 60 : 
                            userData.time === 'half-day' ? 180 : 240, // Full day in minutes
                maxDetour: parseInt(userData.maxDetour || 15),
                selectedGems: [],
                origin: {
                    name: originName,
                    coordinates: originCoords
                },
                destination: {
                    name: destinationName,
                    coordinates: destinationCoords
                }
            };
                
                // Save to data controller
                window.HiddenGems.data.storage.set(userPreferences);
                
      
            }
            
            window.location.href = "map-recs.html";
            
        } catch (err) {
            console.error("Error in quiz processing:", err);
            if (overlay) overlay.style.display = "none";
            alert(`Something went wrong: ${err.message}. Please try again.`);
        }
    }
    
    // Event listeners
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            if (validateCurrentStep()) {
                if (quizState.currentStep === quizState.totalSteps) {
                    finishQuiz();
                } else {
                    goToStep(quizState.currentStep + 1);
                }
            }
        });
    }
    
    if (backButton) {
        backButton.addEventListener('click', function() {
            if (quizState.currentStep > 1) {
                goToStep(quizState.currentStep - 1);
            }
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to exit the quiz? Your progress will be lost.')) {
                window.location.href = "index.html?skipWelcome=1";
            }
        });
    }
    
    // FIXED: Option button selection with proper group handling
    const optionButtons = document.querySelectorAll('.option-button');
    optionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            
            // Skip special handling for "other" buttons since we handle them separately
            if (value === 'other-activity' || value === 'other-accessibility') {
                return;
            }
            
            // Handle specific selection behaviors by group
            
            // 1. Effort level buttons (first group in step 3) - single select
            if (['easy', 'moderate', 'challenging'].includes(value)) {
                document.querySelectorAll('.option-button[data-value="easy"], .option-button[data-value="moderate"], .option-button[data-value="challenging"]')
                    .forEach(btn => btn.classList.remove('selected'));
            }
            
            // 2. Detour distance buttons (in step 2) - single select
            if (['5', '15', '30', '50+'].includes(value)) {
                document.querySelectorAll('.option-button[data-value="5"], .option-button[data-value="15"], .option-button[data-value="30"], .option-button[data-value="50+"]')
                    .forEach(btn => btn.classList.remove('selected'));
            }
            
            // 3. Special behavior for accessibility requirements
            if (['wheelchair', 'stroller', 'elderly', 'none'].includes(value)) {
                if (value === 'none') {
                    // If 'None' is selected, deselect all other accessibility options
                    document.querySelectorAll('.option-button[data-value="wheelchair"], .option-button[data-value="stroller"], .option-button[data-value="elderly"], .option-button[data-value="other-accessibility"]')
                        .forEach(btn => btn.classList.remove('selected'));
                    
                    // Also hide the "Other" input if it's visible
                    if (otherAccessibilityContainer) {
                        otherAccessibilityContainer.style.display = 'none';
                    }
                } else {
                    // If any other accessibility option is selected, deselect 'None'
                    document.querySelectorAll('.option-button[data-value="none"]')
                        .forEach(btn => btn.classList.remove('selected'));
                }
            }
            
            // Toggle selection of clicked button
            this.classList.toggle('selected');
        });
    });
    
    // Initialize the quiz
    updateProgress();
    
    // Check for existing preferences and fill in values
    const savedPreferences = window.HiddenGems.data.storage.get('userPreferences');
    if (savedPreferences) {
        try {
            const prefs = JSON.parse(savedPreferences);
            if (prefs.origin && originInput) originInput.value = prefs.origin;
            if (prefs.destination && destinationInput) destinationInput.value = prefs.destination;
            
            // Restore other free-text values if they exist
            if (prefs.otherActivities && otherActivityInput) {
                otherActivityInput.value = prefs.otherActivities;
                if (otherActivityButton) otherActivityButton.classList.add('selected');
                if (otherActivityContainer) otherActivityContainer.style.display = 'block';
            }
            
            if (prefs.otherAccessibility && otherAccessibilityInput) {
                otherAccessibilityInput.value = prefs.otherAccessibility;
                if (otherAccessibilityButton) otherAccessibilityButton.classList.add('selected');
                if (otherAccessibilityContainer) otherAccessibilityContainer.style.display = 'block';
            }
        } catch (e) {
            console.error("Error parsing saved preferences:", e);
        }
    }
});