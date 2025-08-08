// public/scripts/pricing.js
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('plansContainer');

  const planBadges = (slug) => {
    if (slug === 'professional') {
      return `<span class="ml-2 text-xs font-semibold text-white bg-green-500 px-2 py-1 rounded">Most Popular</span>`;
    }
    if (slug === 'business') {
      return `<span class="ml-2 text-xs font-semibold text-white bg-purple-600 px-2 py-1 rounded">Best Value</span>`;
    }
    return '';
  };

  const planCTA = (slug) => {
    return `/register.html?plan=${encodeURIComponent(slug)}`;
  };

  try {
    const res = await fetch('/plans', { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const plans = await res.json();

    if (!Array.isArray(plans) || plans.length === 0) {
      container.innerHTML = `<p class="text-gray-600">Plans will be available soon.</p>`;
      return;
    }

    plans.forEach(plan => {
      const featuresList = Array.isArray(plan.features)
        ? plan.features
        : typeof plan.features === 'string'
          ? plan.features.split(',').map(s => s.trim()).filter(Boolean)
          : [];

      const featuresHTML = featuresList.length
        ? featuresList.map(f => `<li class="flex items-start gap-2"><span>✅</span><span>${f}</span></li>`).join('')
        : `<li class="text-gray-500">Feature list coming soon.</li>`;

      const highlight = plan.slug === 'professional' ? 'ring-2 ring-green-500' :
                        plan.slug === 'business' ? 'ring-2 ring-purple-600' : 'border';

      const card = document.createElement('div');
      card.className = `bg-white rounded-lg shadow p-6 flex flex-col justify-between ${highlight}`;

      card.innerHTML = `
        <div>
          <div class="flex items-center">
            <h2 class="text-2xl font-semibold mb-2">${plan.name}</h2>
            ${planBadges(plan.slug)}
          </div>
          <p class="text-gray-600 mb-4">${plan.description || ''}</p>
          <div class="text-3xl font-bold text-blue-600 mb-6">
            €${Number(plan.price).toFixed(2)}<span class="text-base text-gray-500 font-normal">/mo</span>
          </div>

          <ul class="text-sm text-gray-700 mb-6 space-y-2">
            ${featuresHTML}
          </ul>
        </div>

        <a href="${planCTA(plan.slug)}"
          class="mt-auto inline-block bg-blue-600 text-white text-center px-4 py-2 rounded hover:bg-blue-700 transition">
          Start Free Trial
        </a>
      `;

      container.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to fetch plans:', err);
    container.innerHTML = `<p class="text-red-500">Failed to load pricing plans. Please try again later.</p>`;
  }
});
