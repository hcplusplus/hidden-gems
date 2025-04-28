/**
 * Achievements system for the Hidden Gems application
 */

// Ensure namespace exists
var HiddenGems = window.HiddenGems || {};

// Achievements sub-namespace
HiddenGems.achievements = {
    /**
     * Initialize achievements system
     */
    init: function() {
        this._setupAchievementsUI();
    },
    
    /**
     * Check for and award any new achievements
     */
    checkAndAwardAchievements: function() {
        const userPreferences = HiddenGems.preferences.getUserPreferences();
        const achievements = HiddenGems.data.achievements;
        
        // Check each achievement
        achievements.forEach(achievement => {
            // Skip if already awarded
            if (userPreferences.achievements.includes(achievement.id)) {
                return;
            }
            
            // Check if condition is met
            if (achievement.condition(userPreferences)) {
                // Award achievement
                userPreferences.achievements.push(achievement.id);
                
                // Save preferences
                HiddenGems.preferences.saveUserPreferences(userPreferences);
                
                // Show achievement notification
                this.showAchievementNotification(achievement);
            }
        });
    },
    
    /**
     * Show achievement notification
     * @param {Object} achievement - Achievement object
     */
    showAchievementNotification: function(achievement) {
        const notification = document.querySelector('.achievement-notification');
        const icon = notification.querySelector('.achievement-icon');
        const title = notification.querySelector('.achievement-title');
        const description = notification.querySelector('.achievement-description');
        
        // Set content
        icon.textContent = achievement.icon;
        title.textContent = 'Achievement Unlocked!';
        description.textContent = `${achievement.title}: ${achievement.description}`;
        
        // Show notification
        notification.classList.add('show');
        
        // Hide after delay
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    },
    
    /**
     * Setup achievements UI
     * @private
     */
    _setupAchievementsUI: function() {
        const achievementsButton = document.querySelector('.achievements-button');
        const achievementsOverlay = document.getElementById('achievements-overlay');
        const achievementsPanel = document.querySelector('.achievements-panel');
        const closeButton = document.querySelector('.close-achievements');
        
        // Show achievements when button is clicked
        achievementsButton.addEventListener('click', () => {
            // Update achievement list before showing
            this._updateAchievementsList();
            
            achievementsOverlay.style.display = 'block';
            achievementsPanel.style.display = 'block';
        });
        
        // Close achievements when close button is clicked
        closeButton.addEventListener('click', () => {
            achievementsOverlay.style.display = 'none';
            achievementsPanel.style.display = 'none';
        });
    },
    
    /**
     * Update achievements list
     * @private
     */
    _updateAchievementsList: function() {
        const achievementList = document.querySelector('.achievement-list');
        achievementList.innerHTML = '';
        
        const userPreferences = HiddenGems.preferences.getUserPreferences();
        const achievements = HiddenGems.data.achievements;
        
        achievements.forEach(achievement => {
            const isUnlocked = userPreferences.achievements.includes(achievement.id);
            
            const achievementItem = document.createElement('div');
            achievementItem.className = `achievement-item ${isUnlocked ? '' : 'locked'}`;
            
            achievementItem.innerHTML = `
                <div class="achievement-item-icon">${achievement.icon}</div>
                <div class="achievement-item-details">
                    <div class="achievement-item-title">${achievement.title}</div>
                    <div class="achievement-item-description">${achievement.description}</div>
                </div>
                ${isUnlocked ? '' : '<div class="achievement-locked-icon">🔒</div>'}
            `;
            
            achievementList.appendChild(achievementItem);
        });
    }
};

// Export the namespace
window.HiddenGems = HiddenGems;