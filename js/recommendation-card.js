(function() {
  const listContainer = document.querySelector('#home-screen') ||
                        document.querySelector('.cards-container');

  if (!listContainer) return;

  const gems = JSON.parse(sessionStorage.getItem("gems")) || [];

  gems.forEach(gem => {
    const card = document.createElement('div');
    card.classList.add('recommendation-card');

    card.innerHTML = `
      <div class="recommendation-header">
        <div class="recommendation-title">${gem.name}</div>
        <button class="recommendation-close">×</button>
      </div>
      <div class="recommendation-image" style="background-color:#eee;height:200px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;color:#999;">📍</span>
      </div>
      <div class="recommendation-details">
        <div class="recommendation-detail">
          <span class="recommendation-detail-icon">📍</span>
          <span>Lat: ${gem.coordinates[1].toFixed(4)}, Lng: ${gem.coordinates[0].toFixed(4)}</span>
        </div>
        <div class="recommendation-detail">
          <span class="recommendation-detail-icon">🏷️</span>
          <span>${gem.category}</span>
        </div>
        <div class="recommendation-detail">
          <span class="recommendation-detail-icon">💬</span>
          <span>${gem.description}</span>
        </div>
        <div class="recommendation-detail">
          <span class="recommendation-detail-icon">🔘</span>
          <span>Visibility: <strong style="color:${gem.color}">${gem.color}</strong></span>
        </div>
      </div>
      <div class="recommendation-actions">
        <div class="recommendation-action">Add to Itinerary</div>
      </div>
    `;

    card.querySelector('.recommendation-close')
         .addEventListener('click', () => card.remove());

    listContainer.appendChild(card);
  });
})();
