/**
 * quiz-integration.js
 * Integrates the quiz with the data controller to save user preferences
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
            amenities: [],
            effortLevel: '',
            accessibility: [],
            time: '',
            maxDetour: ''
        }
    };
    
    const progressBar = document.getElementById('quiz-progress');
    const backButton = document.getElementById('back-button');
    const nextButton = document.getElementById('next-button');
    const closeButton = document.getElementById('close-quiz');
    const quizSteps = document.querySelectorAll('.quiz-step');
    
    const originInput = document.getElementById('origin');
    const destinationInput = document.getElementById('destination');
    const originError = document.getElementById('origin-error');
    const destinationError = document.getElementById('destination-error');
    
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
                const activityButtons = document.querySelectorAll('#step-4 .option-button.selected');
                quizState.answers.activities = Array.from(activityButtons)
                    .filter(btn => !['restrooms', 'parking', 'gas'].includes(btn.getAttribute('data-value')))
                    .map(btn => btn.getAttribute('data-value'));
                
                quizState.answers.amenities = Array.from(activityButtons)
                    .filter(btn => ['restrooms', 'parking', 'gas'].includes(btn.getAttribute('data-value')))
                    .map(btn => btn.getAttribute('data-value'));
                
                return true;
                
            case 3:
                const effortButtons = document.querySelectorAll('#step-3 .option-button[data-value="easy"], #step-3 .option-button[data-value="moderate"], #step-3 .option-button[data-value="challenging"]');
                const selectedEffort = Array.from(effortButtons).find(btn => btn.classList.contains('selected'));
                quizState.answers.effortLevel = selectedEffort ? selectedEffort.getAttribute('data-value') : '';
                
                const accessibilityButtons = document.querySelectorAll('#step-3 .option-button.selected');
                quizState.answers.accessibility = Array.from(accessibilityButtons)
                    .filter(btn => ['wheelchair', 'stroller', 'elderly', 'none'].includes(btn.getAttribute('data-value')))
                    .map(btn => btn.getAttribute('data-value'));
                
                return true;
                
            case 4:
                const selectedTime = document.querySelector('input[name="time"]:checked');
                quizState.answers.time = selectedTime ? selectedTime.value : '';
                
                const detourButtons = document.querySelectorAll('#step-2 .option-button.selected');
                const selectedDetour = Array.from(detourButtons).find(btn => 
                    ['5', '15', '30', '50+'].includes(btn.getAttribute('data-value')));
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
        overlay.style.display = "flex";
        
        try {
            const [originCoords, destinationCoords] = await Promise.all([
                geocode(userData.origin),
                geocode(userData.destination)
            ]);
            
            console.log("originCoords:", originCoords);
            console.log("destinationCoords:", destinationCoords);
            
            if (!originCoords || !destinationCoords) {
                throw new Error("Geocoding failed");
            }
            
            // Save preferences to our data controller
            const userPreferences = {
                activities: userData.activities || [],
                amenities: userData.amenities || [],
                accessibility: userData.accessibility || [],
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
            HiddenGemsData.preferences.save(userPreferences);
            
            // In a real app, we would request gems from the server here
            // For now, we'll simulate it by pulling from a JSON file
            
            try {
                // Fetch gems from static assets
                const response = await fetch("static/assets/data/hidden_gems.json");
                const gems = await response.json();
                
                // Filter gems based on preferences (simplified)
                const filteredGems = gems
                    // Filter by user activities if selected
                    .filter(gem => {
                        if (userPreferences.activities.length === 0) return true; // If no activities selected, show all
                        
                        // Check if the gem has matching activities
                        const gemActivities = Array.isArray(gem.activities) 
                            ? gem.activities
                            : [gem.category, gem.gemType, gem.type].filter(a => a); // Use category/type as fallback
                            
                        return userPreferences.activities.some(activity => 
                            gemActivities.some(gemActivity => 
                                gemActivity && gemActivity.toLowerCase().includes(activity.toLowerCase())));
                    })
                    // Limit to 10 gems maximum
                    .slice(0, 10);
                
                // Save gems to data controller
                HiddenGemsData.gemsData.save(filteredGems);
                
                // Redirect to results page with data
                const data = {
                    preferences: userPreferences,
                    selectedGems: filteredGems
                };
                
                window.location.href = HiddenGemsData.utils.generateDataUrl('map-recommendations.html', data);
                
            } catch (error) {
                console.error("Error loading gems:", error);
                throw new Error("Failed to load gem recommendations");
            }
            
        } catch (err) {
            console.error("Error in quiz processing:", err);
            overlay.style.display = "none";
            alert(`Something went wrong: ${err.message}. Please try again.`);
        }
    }
    
    // Event listeners
    nextButton.addEventListener('click', function() {
        if (validateCurrentStep()) {
            if (quizState.currentStep === quizState.totalSteps) {
                finishQuiz();
            } else {
                goToStep(quizState.currentStep + 1);
            }
        }
    });
    
    backButton.addEventListener('click', function() {
        if (quizState.currentStep > 1) {
            goToStep(quizState.currentStep - 1);
        }
    });
    
    closeButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to exit the quiz? Your progress will be lost.')) {
            window.location.href = "landing-page.html?skipWelcome=1";
        }
    });
    
    // Option button selection
    const optionButtons = document.querySelectorAll('.option-button');
    optionButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Check if this is a single-select group
            if (['easy', 'moderate', 'challenging'].includes(this.getAttribute('data-value'))) {
                document.querySelectorAll('.option-button[data-value="easy"], .option-button[data-value="moderate"], .option-button[data-value="challenging"]')
                    .forEach(btn => btn.classList.remove('selected'));
            }
            
            if (['5', '15', '30', '50+'].includes(this.getAttribute('data-value'))) {
                document.querySelectorAll('.option-button[data-value="5"], .option-button[data-value="15"], .option-button[data-value="30"], .option-button[data-value="50+"]')
                    .forEach(btn => btn.classList.remove('selected'));
            }
            
            this.classList.toggle('selected');
        });
    });
    
    // Initialize the quiz
    updateProgress();
    
    // Check for existing preferences and fill in values
    const savedPreferences = HiddenGemsData.preferences.get();
    
    if (savedPreferences.origin && savedPreferences.origin.name) {
        originInput.value = savedPreferences.origin.name;
    }
    
    if (savedPreferences.destination && savedPreferences.destination.name) {
        destinationInput.value = savedPreferences.destination.name;
    }
});