/**
 * quiz-integration.js
 * Integrates the quiz with the data controller to save user preferences
 * Combined and fixed version with proper option selection behavior and free response fields
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    const GEOCODE_API = 'https://api.opencagedata.com/geocode/v1/json';
    const GEOCODE_KEY = 'fa00c10bb490481abc0614f3d6c9af3b';
    
    /**
     * Geocode a location string to coordinates
     * @param {string} location - Location text to geocode
     * @returns {Promise<Array>} - Promise resolving to [longitude, latitude] coordinates
     */
    async function geocode(location) {
        try {
            const res = await fetch(`${GEOCODE_API}?q=${
                encodeURIComponent(location)
            }&key=${GEOCODE_KEY}`);
            const data = await res.json();
            const coords = data.results[0]?.geometry;
            return coords ? [coords.lng, coords.lat] : null;
        } catch (error) {
            console.error("Geocoding error:", error);
            return null;
        }
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
            time: '',
            maxDetour: ''
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
                
                // Maximum detour (single select)
                const detourButtons = document.querySelectorAll('#step-2 .option-button.selected[data-value="5"], #step-2 .option-button.selected[data-value="15"], #step-2 .option-button.selected[data-value="30"], #step-2 .option-button.selected[data-value="50+"]');
                const selectedDetour = Array.from(detourButtons)[0];
                quizState.answers.maxDetour = selectedDetour ? selectedDetour.getAttribute('data-value') : '';
                
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
        if (overlay) overlay.style.display = "flex";
        
        try {
            const [originCoords, destinationCoords] = await Promise.all([
                geocode(userData.origin),
                geocode(userData.destination)
            ]);
            
            console.log("originCoords:", originCoords);
            console.log("destinationCoords:", destinationCoords);

               // Define unique region name based on origin/destination
            const routeName = `route_${originCoords.join('_')}_${destinationCoords.join('_')}`;
    
            
            if (!originCoords || !destinationCoords) {
                throw new Error("Geocoding failed");
            }
            
            userData.originCoords = originCoords;
            userData.destinationCoords = destinationCoords;

            // Save to sessionStorage
            window.HiddenGems.data.storage.set("originCoords", JSON.stringify(originCoords));
            window.HiddenGems.data.storage.set("destinationCoords", JSON.stringify(destinationCoords));
            sessionStorage.setItem("userPreferences", JSON.stringify(userData));

            // Try to load gems if the function exists
            if (typeof window.HiddenGems.data.findGemsAlongRoute === 'function') {
                try {
                    // First filter by route
                    sampledGems = await window.HiddenGems.data.findGemsAlongRoute("quiz", originCoords, destinationCoords);
                } catch (error) {
                    console.error("Error filtering gems:", error);
                }
            }
            
        
            console.log("sampledGems:", sampledGems);
            userData.candidates = sampledGems;
            console.log("userData.candidates:", userData.candidates);
            sessionStorage.setItem("sampledGems", JSON.stringify(sampledGems));

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
				
						window.location.href = "map-recs.html";
					} catch (err) {
						console.error("Error generating gems:", err);
						alert("Something went wrong. Please try again.");
						overlay.style.display = "none";
					}
            
            // Save preferences to our data controller if it exists
            if (window.HiddenGemsData) {
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
                        name: userData.origin,
                        coordinates: originCoords
                    },
                    destination: {
                        name: userData.destination,
                        coordinates: destinationCoords
                    }
                };
                
                // Save to data controller
                window.HiddenGemsData.preferences.save(userPreferences);
                
      
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
    } else if (window.HiddenGemsData) {
        // Fallback to data controller if available
        const savedUserPrefs = window.HiddenGemsData.preferences.get();
        
        if (savedUserPrefs.origin && savedUserPrefs.origin.name && originInput) {
            originInput.value = savedUserPrefs.origin.name;
        }
        
        if (savedUserPrefs.destination && savedUserPrefs.destination.name && destinationInput) {
            destinationInput.value = savedUserPrefs.destination.name;
        }
    }
});