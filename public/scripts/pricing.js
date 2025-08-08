// public/scripts/pricing.js
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('plansContainer');
  if (!container) return;

  const planBadges = (slug) => {
    if (slug === 'professional') {
      return `<span class="ml-2 text-xs font-semibold text-white bg-green-500 px-2 py-1 rounded">Most Popular</span>`;
    }
    if (slug === 'business') {
      return `<span class="ml-2 text-xs font-semibold text-white bg-purple-600 px-2 py-1 rounded">Best Value</span>`;
    }
    return '';
  };

  const planCTA = (slug) => `/register.html?plan=${encodeURIComponent(slug)}`;

  // Normalize features from API (JSON array string, CSV, or real array). Strips null/empty.
  const normalizeFeatures = (val) => {
    if (Array.isArray(val)) return val.filter(Boolean).map(String).map(s => s.trim()).filter(Boolean);

    if (typeof val === 'string') {
      const s = val.trim();
      if (!s) return [];
      // MySQL JSON_ARRAYAGG often comes as a JSON string
      if (s.startsWith('[')) {
        try {
          const arr = JSON.parse(s);
          return Array.isArray(arr)
            ? arr.filter(Boolean).map(String).map(x => x.trim()).filter(Boolean)
            : [];
        } catch {
          // fall through to CSV parsing
        }
      }
      // CSV fallback. Prefer custom '||' sep if present to avoid comma-in-text issues.
      const sep = s.includes('||') ? '||' : ',';
      return s.split(sep).map(x => x.replace(/^"|"$/g, '').trim()).filter(Boolean);
    }

    // Some backends might return an object like { features_csv: "...", features: null }
    if (val && typeof val === 'object') {
      if (Array.isArray(val.features)) return normalizeFeatures(val.features);
      if (typeof val.features === 'string') return normalizeFeatures(val.features);
      if (typeof val.features_csv === 'string') return normalizeFeatures(val.features_csv);
    }

    return [];
  };

  // Nice default copy if description is null
  const defaultDescription = (slug) => {
    if (slug === 'starter') return 'Everything you need to get started.';
    if (slug === 'professional') return 'Automation and growth tools for scaling teams.';
    if (slug === 'business') return 'Advanced AI, multi-location, and enterprise-ready features.';
    return '';
  };

  try {
    const res = await fetch('/plans', { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const rawPlans = await res.json();
    if (!Array.isArray(rawPlans) || rawPlans.length === 0) {
      container.innerHTML = `<p class="text-gray-600">Plans will be available soon.</p>`;
      return;
    }

    // Ensure consistent order (by price asc, fallback by name)
    const plans = [...rawPlans].sort((a, b) => {
      const pa = Number(a.price) || 0;
      const pb = Number(b.price) || 0;
      if (pa !== pb) return pa - pb;
      return String(a.name).localeCompare(String(b.name));
    });

    container.innerHTML = ''; // clear any server-side fallback

    plans.forEach(plan => {
      const featuresList = normalizeFeatures(plan.features);
      const featuresHTML = featuresList.length
        ? featuresList
            .slice() // avoid mutating
            .sort((a, b) => String(a).localeCompare(String(b)))
            .map(f => `<li class="flex items-start gap-2"><span>✅</span><span>${f}</span></li>`)
            .join('')
        : `<li class="text-gray-500">Feature list coming soon.</li>`;

      const highlight =
        plan.slug === 'professional' ? 'ring-2 ring-green-500' :
        plan.slug === 'business' ? 'ring-2 ring-purple-600' :
        'border';

      const price = (Number(plan.price) || 0).toFixed(2);
      const desc = plan.description || defaultDescription(plan.slug);

      const card = document.createElement('div');
      card.className = `bg-white rounded-lg shadow p-6 flex flex-col justify-between ${highlight}`;

      card.innerHTML = `
        <div>
          <div class="flex items-center">
            <h2 class="text-2xl font-semibold mb-2">${plan.name ?? ''}</h2>
            ${planBadges(plan.slug)}
          </div>
          <p class="text-gray-600 mb-4">${desc}</p>
          <div class="text-3xl font-bold text-blue-600 mb-6">
            €${price}<span class="text-base text-gray-500 font-normal">/mo</span>
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
