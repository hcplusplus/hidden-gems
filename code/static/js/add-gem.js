/**
 * add-gem.js
 * Handles the functionality for adding new gems
 */

document.addEventListener('DOMContentLoaded', function() {
    // Handle nav wheel toggle
    const navToggle = document.getElementById('nav-wheel-toggle');
    const navWheel = document.getElementById('nav-wheel');
    if (navToggle && navWheel) {
        navToggle.addEventListener('click', function() {
            navWheel.classList.toggle('active');
        });
    }
    
    // Handle back button
    document.getElementById('back-button').addEventListener('click', function() {
        window.history.back();
    });

    // Handle photo upload
    const photoUpload = document.getElementById('photo-upload');
    const photoInput = document.getElementById('photo-input');
    const photoPreview = document.getElementById('photo-preview');

    photoUpload.addEventListener('click', function() {
        photoInput.click();
    });

    photoInput.addEventListener('change', function() {
        photoPreview.innerHTML = '';

        if (this.files) {
            Array.from(this.files).forEach(file => {
                const reader = new FileReader();

                reader.onload = function(e) {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'preview-item';
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <button type="button" class="remove-photo">×</button>
                    `;
                    photoPreview.appendChild(previewItem);

                    // Handle photo removal
                    previewItem.querySelector('.remove-photo').addEventListener('click', function() {
                        previewItem.remove();
                    });
                };

                reader.readAsDataURL(file);
            });
        }
    });

    // Handle tag selection
    const tagOptions = document.querySelectorAll('.tag-option');

    tagOptions.forEach(option => {
        option.addEventListener('click', function() {
            const parentGroup = this.closest('.form-group');

            // If it's a single select group (gem type)
            if (parentGroup.querySelector('label').textContent.includes('Gem Type')) {
                // Deselect other options in this group
                parentGroup.querySelectorAll('.tag-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.classList.add('selected');
            } else {
                // Toggle selection for multi-select groups
                this.classList.toggle('selected');
            }
        });
    });

    // Handle cost selection
    const costOptions = document.querySelectorAll('.cost-option');
    const selectedCostInput = document.getElementById('selected-cost');

    costOptions.forEach(option => {
        option.addEventListener('click', function() {
            costOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedCostInput.value = this.getAttribute('data-value');
        });
    });

    // Handle crowdedness slider
    const crowdednessSlider = document.getElementById('crowdedness-slider');
    const crowdednessValue = document.getElementById('crowdedness-value');

    crowdednessSlider.addEventListener('input', function() {
        crowdednessValue.value = this.value;
    });

    // Initialize hidden values
    crowdednessValue.value = crowdednessSlider.value;
    
    // Handle form submission
    document.getElementById('add-gem-form').addEventListener('submit', function(event) {
        event.preventDefault();

        // Validate gem type selection
        const gemTypeGroup = document.querySelector('.form-group:nth-of-type(4)');
        const selectedGemType = gemTypeGroup.querySelector('.tag-option.selected');

        if (!selectedGemType) {
            alert('Please select a gem type');
            return;
        }

        // Get all form values
        const formData = new FormData(this);

        // Add gem type
        formData.append('gemType', selectedGemType.getAttribute('data-value'));

        // Add activities
        const selectedActivities = Array.from(document.querySelectorAll('.form-group:nth-of-type(5) .tag-option.selected'))
            .map(el => el.getAttribute('data-value'));
        formData.append('activities', JSON.stringify(selectedActivities));

        // Add best times
        const selectedTimes = Array.from(document.querySelectorAll('.form-group:nth-of-type(9) .tag-option.selected'))
            .map(el => el.getAttribute('data-value'));
        formData.append('bestTimes', JSON.stringify(selectedTimes));

        // Try to get user's location for coordinates
        let userCoordinates = [-122.2730, 37.8715]; // Default to Berkeley
        
        // Attempt to geocode the location from the form
        const locationValue = formData.get('location');
        
        // Create a new gem object
        const newGem = {
            id: 'user-' + Date.now(),
            name: formData.get('title'),
            location: formData.get('location'),
            gemType: formData.get('gemType'),
            category: formData.get('gemType'), // Add category for consistency
            activities: JSON.parse(formData.get('activities')),
            accessibility: formData.get('accessibility'),
            cost: formData.get('cost'),
            duration: formData.get('duration'),
            crowdedness: formData.get('crowdedness'),
            bestTimes: JSON.parse(formData.get('bestTimes')),
            amenities: Array.from(formData.getAll('amenities')),
            description: formData.get('description'),
            isHidden: formData.get('is_hidden') === 'yes',
            // Add a default color based on how hidden it is
            color: formData.get('is_hidden') === 'yes' ? 'red' : 'blue',
            // Add coordinates - in a real app, would use geocoding
            coordinates: userCoordinates,
            // Add a timestamp
            createdAt: new Date().toISOString()
        };

        // Get existing gems or initialize empty array
        let userGems = JSON.parse(localStorage.getItem('userGems') || '[]');
        
        // Add new gem
        userGems.push(newGem);
        
        // Save back to localStorage
        localStorage.setItem('userGems', JSON.stringify(userGems));

        // Show success message
        alert('Thank you for submitting a hidden gem! It has been added to your collection.');

        // Reset form
        this.reset();

        // Reset UI state
        document.querySelectorAll('.tag-option.selected').forEach(el => {
            el.classList.remove('selected');
        });

        document.querySelectorAll('.cost-option.selected').forEach(el => {
            el.classList.remove('selected');
        });

        photoPreview.innerHTML = '';
        selectedCostInput.value = '';
        crowdednessSlider.value = 2;
        crowdednessValue.value = 2;
        
        // Redirect to index page after a delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    });
    
    // Handle back button confirmation
    document.getElementById("back-button").addEventListener("click", function(e) {
        e.preventDefault();
        const confirmExit = confirm("Are you sure you want to exit? Your changes will not be saved.");
        if (confirmExit) {
            window.location.href = "index.html";
        }
    });
    
    // Handle "Use My Location" button
    const useMyLocationBtn = document.getElementById('use-my-location');
    if (useMyLocationBtn) {
        useMyLocationBtn.addEventListener('click', function() {
            const locationInput = document.getElementById('gem-location');
            
            if (navigator.geolocation) {
                useMyLocationBtn.textContent = '⏳';
                navigator.geolocation.getCurrentPosition(
                    // Success
                    (position) => {
                        locationInput.value = `${position.coords.latitude}, ${position.coords.longitude}`;
                        useMyLocationBtn.textContent = '✓';
                        
                        // Reset the button after a delay
                        setTimeout(() => {
                            useMyLocationBtn.innerHTML = '<span class="location-icon">📍</span>';
                        }, 2000);
                    },
                    // Error
                    (error) => {
                        console.error('Geolocation error:', error);
                        useMyLocationBtn.innerHTML = '<span class="location-icon">📍</span>';
                        alert('Could not access your location. Please enter it manually.');
                    }
                );
            } else {
                alert('Geolocation is not supported by your browser. Please enter your location manually.');
            }
        });
    }
});