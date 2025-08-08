// public/scripts/pricing.js
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('plansContainer');

  try {
    const res = await fetch('/plans');
    const plans = await res.json();

    plans.forEach(plan => {
      const featuresList = Array.isArray(plan.features)
        ? plan.features.map(f => `<li>✅ ${f}</li>`).join('')
        : (plan.features || '').split(',').map(f => `<li>✅ ${f.trim()}</li>`).join('');

      const card = document.createElement('div');
      card.className = 'bg-white rounded-lg shadow p-6 flex flex-col justify-between';

      card.innerHTML = `
        <div>
          <h2 class="text-2xl font-semibold mb-2">${plan.name}</h2>
          <p class="text-gray-600 mb-4">${plan.description || ''}</p>
          <div class="text-3xl font-bold text-blue-600 mb-6">
            €${plan.price}/mo
          </div>
          <ul class="text-sm text-gray-700 mb-6 space-y-1">
            ${featuresList}
          </ul>
        </div>
        <a href="/register.html?plan=${plan.slug}"
          class="mt-auto inline-block bg-blue-600 text-white text-center px-4 py-2 rounded hover:bg-blue-700 transition">
          Start Free Trial
        </a>
      `;

      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<p class="text-red-500">Failed to load pricing plans. Please try again later.</p>`;
    console.error('Failed to fetch plans:', err);
  }
});
