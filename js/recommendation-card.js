(function() {
    // Choose where to inject cards:
    // on the home screen: a container with class "recommendations-list"
    const listContainer = document.querySelector('#home-screen') ||
                          document.querySelector('.cards-container');
  
    if (!listContainer || !window.HiddenGems?.data?.gems) return;
  
    HiddenGems.data.gems.forEach(gem => {
      const card = document.createElement('div');
      card.classList.add('recommendation-card', gem.tier);
  
      card.innerHTML = `
        <div class="recommendation-header">
          <div class="recommendation-title">${gem.name}</div>
          <button class="recommendation-close">×</button>
        </div>
        <div class="recommendation-image"></div>
        <div class="recommendation-details">
          <div class="recommendation-detail">
            <span class="recommendation-detail-icon">📍</span>
            <span>${gem.address}</span>
          </div>
          <div class="recommendation-detail">
            <span class="recommendation-detail-icon">🕒</span>
            <span>${gem.hours} | ${gem.cost}</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            ${gem.tags.map(t => `<div class="quiz-option" style="font-size:12px;padding:6px 12px;margin:0">${t}</div>`).join('')}
          </div>
        </div>
        <div class="recommendation-actions">
          <div class="recommendation-action">Add to Itinerary</div>
        </div>
      `;
  
      // close button handler
      card.querySelector('.recommendation-close').addEventListener('click', () => card.remove());
  
      listContainer.appendChild(card);
    });
  })();
  