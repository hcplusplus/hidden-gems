/**
 * Swipe handling for the Berkeley Hidden Gems application
 */

// Ensure namespace exists
var HiddenGems = window.HiddenGems || {};

// Swipe sub-namespace
HiddenGems.swipe = {
    // Touch tracking variables
    startX: 0,
    currentX: 0,
    isDragging: false,
    threshold: 80, // Minimum distance to trigger swipe
    
    /**
     * Initialize swipe handling for gem cards
     */
    init: function() {
        const cardsContainer = document.querySelector('.cards-container');
        
        if (!cardsContainer) {
            console.warn('Cards container not found, skipping swipe init');
            return;
        }
        
        console.log('Initializing swipe handling');
        
        // Touch event handlers
        cardsContainer.addEventListener('touchstart', this._handleTouchStart.bind(this), false);
        cardsContainer.addEventListener('touchmove', this._handleTouchMove.bind(this), false);
        cardsContainer.addEventListener('touchend', this._handleTouchEnd.bind(this), false);
        
        // For desktop testing
        cardsContainer.addEventListener('mousedown', this._handleMouseDown.bind(this), false);
        cardsContainer.addEventListener('mousemove', this._handleMouseMove.bind(this), false);
        cardsContainer.addEventListener('mouseup', this._handleMouseUp.bind(this), false);
        cardsContainer.addEventListener('mouseleave', this._handleMouseUp.bind(this), false);
    },
    
    /**
     * Handle touch start event
     * @param {TouchEvent} e - Touch event
     * @private
     */
    _handleTouchStart: function(e) {
        this.startX = e.touches[0].clientX;
        this.currentX = this.startX;
        this.isDragging = true;
        
        // Get current active card and adjacent cards
        const activeCard = document.querySelector('.gem-card.active');
        const prevCard = document.querySelector('.gem-card.prev');
        const nextCard = document.querySelector('.gem-card.next');
        
        // Reset transitions during drag
        if (activeCard) activeCard.style.transition = 'none';
        if (prevCard) prevCard.style.transition = 'none';
        if (nextCard) nextCard.style.transition = 'none';
    },
    
    /**
     * Handle touch move event
     * @param {TouchEvent} e - Touch event
     * @private
     */
    _handleTouchMove: function(e) {
        if (!this.isDragging) return;
        
        this.currentX = e.touches[0].clientX;
        const diffX = this.currentX - this.startX;
        
        // Get current active card and adjacent cards
        const activeCard = document.querySelector('.gem-card.active');
        const prevCard = document.querySelector('.gem-card.prev');
        const nextCard = document.querySelector('.gem-card.next');
        
        if (activeCard) activeCard.style.transform = `translateX(${diffX}px)`;
        
        // Move adjacent cards proportionally
        if (diffX > 0 && prevCard) {
            // Swiping right, show prev card
            prevCard.style.transform = `translateX(calc(-100% + ${diffX}px))`;
        } else if (diffX < 0 && nextCard) {
            // Swiping left, show next card
            nextCard.style.transform = `translateX(calc(100% + ${diffX}px))`;
        }
        
        // Prevent default scrolling when swiping
        e.preventDefault();
    },
    
    /**
     * Handle touch end event
     * @param {TouchEvent} e - Touch event
     * @private
     */
    _handleTouchEnd: function(e) {
        if (!this.isDragging) return;
        
        // Get cards and restore transitions
        const activeCard = document.querySelector('.gem-card.active');
        const prevCard = document.querySelector('.gem-card.prev');
        const nextCard = document.querySelector('.gem-card.next');
        
        if (activeCard) activeCard.style.transition = 'transform 0.3s ease-out';
        if (prevCard) prevCard.style.transition = 'transform 0.3s ease-out';
        if (nextCard) nextCard.style.transition = 'transform 0.3s ease-out';
        
        // Calculate swipe distance
        const diffX = this.currentX - this.startX;
        const activeIndex = HiddenGems.map.activeGemIndex;
        const gemsLength = HiddenGems.data.gems.length;
        
        if (diffX > this.threshold) {
            // Swiped right - go to previous
            const prevIndex = HiddenGems.utils.getPrevIndex(activeIndex, gemsLength);
            this._changeActiveGem(prevIndex);
        } else if (diffX < -this.threshold) {
            // Swiped left - go to next
            const nextIndex = HiddenGems.utils.getNextIndex(activeIndex, gemsLength);
            this._changeActiveGem(nextIndex);
        } else {
            // Not enough movement, reset positions
            if (activeCard) activeCard.style.transform = 'translateX(0)';
            if (prevCard) prevCard.style.transform = 'translateX(-100%)';
            if (nextCard) nextCard.style.transform = 'translateX(100%)';
        }
        
        this.isDragging = false;
    },
    
    /**
     * Handle mouse down event (for desktop testing)
     * @param {MouseEvent} e - Mouse event
     * @private
     */
    _handleMouseDown: function(e) {
        this.startX = e.clientX;
        this.currentX = this.startX;
        this.isDragging = true;
        
        // Get cards
        const activeCard = document.querySelector('.gem-card.active');
        const prevCard = document.querySelector('.gem-card.prev');
        const nextCard = document.querySelector('.gem-card.next');
        
        // Reset transitions
        if (activeCard) activeCard.style.transition = 'none';
        if (prevCard) prevCard.style.transition = 'none';
        if (nextCard) nextCard.style.transition = 'none';
        
        e.preventDefault();
    },
    
    /**
     * Handle mouse move event (for desktop testing)
     * @param {MouseEvent} e - Mouse event
     * @private
     */
    _handleMouseMove: function(e) {
        if (!this.isDragging) return;
        
        this.currentX = e.clientX;
        const diffX = this.currentX - this.startX;
        
        // Get cards
        const activeCard = document.querySelector('.gem-card.active');
        const prevCard = document.querySelector('.gem-card.prev');
        const nextCard = document.querySelector('.gem-card.next');
        
        if (activeCard) activeCard.style.transform = `translateX(${diffX}px)`;
        
        // Move adjacent cards proportionally
        if (diffX > 0 && prevCard) {
            // Swiping right, show prev card
            prevCard.style.transform = `translateX(calc(-100% + ${diffX}px))`;
        } else if (diffX < 0 && nextCard) {
            // Swiping left, show next card
            nextCard.style.transform = `translateX(calc(100% + ${diffX}px))`;
        }
    },
    
    /**
     * Handle mouse up event (for desktop testing)
     * @param {MouseEvent} e - Mouse event
     * @private
     */
    _handleMouseUp: function(e) {
        if (!this.isDragging) return;
        
        // Get cards and restore transitions
        const activeCard = document.querySelector('.gem-card.active');
        const prevCard = document.querySelector('.gem-card.prev');
        const nextCard = document.querySelector('.gem-card.next');
        
        if (activeCard) activeCard.style.transition = 'transform 0.3s ease-out';
        if (prevCard) prevCard.style.transition = 'transform 0.3s ease-out';
        if (nextCard) nextCard.style.transition = 'transform 0.3s ease-out';
        
        // Calculate swipe distance
        const diffX = this.currentX - this.startX;
        
        // Only proceed if there's a valid map and data
        if (!HiddenGems.map || !HiddenGems.data || !HiddenGems.data.gems) {
            // Reset card positions
            if (activeCard) activeCard.style.transform = 'translateX(0)';
            if (prevCard) prevCard.style.transform = 'translateX(-100%)';
            if (nextCard) nextCard.style.transform = 'translateX(100%)';
            
            this.isDragging = false;
            return;
        }
        
        const activeIndex = HiddenGems.map.activeGemIndex;
        const gemsLength = HiddenGems.data.gems.length;
        
        if (diffX > this.threshold) {
            // Swiped right - go to previous
            const prevIndex = HiddenGems.utils.getPrevIndex(activeIndex, gemsLength);
            this._changeActiveGem(prevIndex);
        } else if (diffX < -this.threshold) {
            // Swiped left - go to next
            const nextIndex = HiddenGems.utils.getNextIndex(activeIndex, gemsLength);
            this._changeActiveGem(nextIndex);
        } else {
            // Not enough movement, reset positions
            if (activeCard) activeCard.style.transform = 'translateX(0)';
            if (prevCard) prevCard.style.transform = 'translateX(-100%)';
            if (nextCard) nextCard.style.transform = 'translateX(100%)';
        }
        
        this.isDragging = false;
    },
    
    /**
     * Change the active gem and update UI
     * @param {number} newIndex - New active gem index
     * @private
     */
    _changeActiveGem: function(newIndex) {
        // Update the map markers and routes
        if (HiddenGems.map && typeof HiddenGems.map.showGemPopup === 'function') {
            HiddenGems.map.showGemPopup(newIndex);
        }
        
        // Update the card positions
        if (HiddenGems.cards && typeof HiddenGems.cards.updateCardPositions === 'function') {
            HiddenGems.cards.updateCardPositions(newIndex);
        }
        
        // Trigger vibration if supported (for better mobile feedback)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
};

// Export the namespace
window.HiddenGems = HiddenGems;