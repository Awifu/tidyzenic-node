// public/scripts/pricing.js
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('plansContainer');
  if (!container) return;

  // ---------- helpers ----------
  const planBadges = (slug) => {
    if (slug === 'professional') return `<span class="ml-2 text-xs font-semibold text-white bg-green-500 px-2 py-1 rounded">Most Popular</span>`;
    if (slug === 'business')     return `<span class="ml-2 text-xs font-semibold text-white bg-purple-600 px-2 py-1 rounded">Best Value</span>`;
    return '';
  };

  const planCTA = (slug) => `/register.html?plan=${encodeURIComponent(slug)}`;

  const normalizeFeatures = (val) => {
    const isBad = (x) => {
      if (x == null) return true;
      const s = String(x).trim().toLowerCase();
      return !s || s === 'null' || s === 'undefined';
    };

    if (Array.isArray(val)) {
      return val.filter(v => !isBad(v)).map(v => String(v).trim());
    }

    if (typeof val === 'string') {
      const s = val.trim();
      if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return [];
      if (s.startsWith('[')) {
        try {
          const arr = JSON.parse(s);
          return Array.isArray(arr) ? normalizeFeatures(arr) : [];
        } catch { /* fall through to CSV */ }
      }
      const sep = s.includes('||') ? '||' : ',';
      return s.split(sep)
        .map(x => x.replace(/^"|"$/g, '').trim())
        .filter(x => !isBad(x));
    }

    if (val && typeof val === 'object') {
      if (Array.isArray(val.features)) return normalizeFeatures(val.features);
      if (typeof val.features === 'string') return normalizeFeatures(val.features);
      if (typeof val.features_csv === 'string') return normalizeFeatures(val.features_csv);
    }

    return [];
  };

  const defaultDescription = (slug) => {
    if (slug === 'starter') return 'Everything you need to get started.';
    if (slug === 'professional') return 'Automation and growth tools for scaling teams.';
    if (slug === 'business') return 'Advanced AI, multi-location, and enterprise-ready features.';
    return '';
  };

  const renderFeatures = (slug, rawFeatures, firstCount = 12) => {
    const features = normalizeFeatures(rawFeatures)
      .map(x => String(x).trim())
      .filter(x => x && x.toLowerCase() !== 'null' && x.toLowerCase() !== 'undefined');

    if (!features.length) {
      return `<ul class="text-sm text-gray-700 mb-6 space-y-2"><li class="text-gray-500">Feature list coming soon.</li></ul>`;
    }

    const idBase = `plan-${slug}-features`;
    const visible = features.slice(0, firstCount);
    const hidden  = features.slice(firstCount);

    const li = (text) => {
      const t = String(text ?? '').trim();
      if (!t || t.toLowerCase() === 'null' || t.toLowerCase() === 'undefined') return '';
      return `<li class="flex items-start gap-2"><span aria-hidden="true">✅</span><span>${t}</span></li>`;
    };

    const listTop    = visible.map(li).join('');
    const listHidden = hidden.length ? `<div id="${idBase}-more" class="hidden">${hidden.map(li).join('')}</div>` : '';
    const toggle     = hidden.length ? `<button data-toggle="${idBase}" data-hidden-count="${hidden.length}" type="button" class="text-xs text-blue-600 hover:underline mt-2">Show ${hidden.length} more</button>` : '';

    return `
      <ul class="text-sm text-gray-700 mb-4 space-y-2" id="${idBase}">
        ${listTop}
        ${listHidden}
      </ul>
      ${toggle}
    `;
  };

  const renderSkeleton = () => {
    const cards = Array.from({ length: 3 }).map(() => `
      <div class="bg-white rounded-lg shadow p-6 border animate-pulse">
        <div class="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div class="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
        <div class="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div class="space-y-2 mb-6">
          <div class="h-4 bg-gray-200 rounded"></div>
          <div class="h-4 bg-gray-200 rounded w-5/6"></div>
          <div class="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
        <div class="h-10 bg-gray-200 rounded"></div>
      </div>
    `).join('');
    container.innerHTML = cards;
  };

  // ---------- flow ----------
  try {
    renderSkeleton();

    // NOTE: use the unambiguous API path to avoid static-shadow issues
    const res = await fetch('/api/plans', { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const rawPlans = await res.json();
    if (!Array.isArray(rawPlans) || rawPlans.length === 0) {
      container.innerHTML = `<p class="text-gray-600">Plans will be available soon.</p>`;
      return;
    }

    const plans = [...rawPlans].sort((a, b) => {
      const pa = Number(a.price) || 0;
      const pb = Number(b.price) || 0;
      if (pa !== pb) return pa - pb;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    container.innerHTML = '';

    plans.forEach(plan => {
      const featuresHTML = renderFeatures(plan.slug, plan.features);

      const highlight =
        plan.slug === 'professional' ? 'ring-2 ring-green-500' :
        plan.slug === 'business'     ? 'ring-2 ring-purple-600' :
                                       'border';

      const price    = (Number(plan.price) || 0).toFixed(2);
      const desc     = plan.description || defaultDescription(plan.slug) || '';
      const safeName = String(plan.name || '');
      const safeSlug = String(plan.slug || '');

      const card = document.createElement('div');
      card.className = `bg-white rounded-lg shadow p-6 flex flex-col justify-between ${highlight}`;

      card.innerHTML = `
        <div>
          <div class="flex items-center">
            <h2 class="text-2xl font-semibold mb-2">${safeName}</h2>
            ${planBadges(safeSlug)}
          </div>
          <p class="text-gray-600 mb-4">${desc}</p>
          <div class="text-3xl font-bold text-blue-600 mb-6" aria-label="Price">
            €${price}<span class="text-base text-gray-500 font-normal">/mo</span>
          </div>

          ${featuresHTML}
        </div>

        <a href="${planCTA(safeSlug)}"
           class="mt-auto inline-block bg-blue-600 text-white text-center px-4 py-2 rounded hover:bg-blue-700 transition"
           aria-label="Start free trial for ${safeName}">
          Start Free Trial
        </a>
      `;

      container.appendChild(card);
    });

    // Toggle Show more/less
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-toggle]');
      if (!btn) return;
      const base = btn.getAttribute('data-toggle');
      const moreEl = document.getElementById(`${base}-more`);
      if (!moreEl) return;
      const expanded = !moreEl.classList.contains('hidden');
      moreEl.classList.toggle('hidden', expanded);
      const hiddenCount = btn.getAttribute('data-hidden-count');
      btn.textContent = expanded ? `Show ${hiddenCount} more` : 'Show less';
    });
  } catch (err) {
    console.error('Failed to fetch plans:', err);
    container.innerHTML = `<p class="text-red-500">Failed to load pricing plans. Please try again later.</p>`;
  }
});
// public/scripts/pricing.js
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('plansContainer');
  if (!container) return;

  // ---------- helpers ----------
  const planBadges = (slug) => {
    if (slug === 'professional') return `<span class="ml-2 text-xs font-semibold text-white bg-green-500 px-2 py-1 rounded">Most Popular</span>`;
    if (slug === 'business')     return `<span class="ml-2 text-xs font-semibold text-white bg-purple-600 px-2 py-1 rounded">Best Value</span>`;
    return '';
  };

  const planCTA = (slug) => `/register.html?plan=${encodeURIComponent(slug)}`;

  const normalizeFeatures = (val) => {
    const isBad = (x) => {
      if (x == null) return true;
      const s = String(x).trim().toLowerCase();
      return !s || s === 'null' || s === 'undefined';
    };

    if (Array.isArray(val)) {
      return val.filter(v => !isBad(v)).map(v => String(v).trim());
    }

    if (typeof val === 'string') {
      const s = val.trim();
      if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return [];
      if (s.startsWith('[')) {
        try {
          const arr = JSON.parse(s);
          return Array.isArray(arr) ? normalizeFeatures(arr) : [];
        } catch { /* fall through to CSV */ }
      }
      const sep = s.includes('||') ? '||' : ',';
      return s.split(sep)
        .map(x => x.replace(/^"|"$/g, '').trim())
        .filter(x => !isBad(x));
    }

    if (val && typeof val === 'object') {
      if (Array.isArray(val.features)) return normalizeFeatures(val.features);
      if (typeof val.features === 'string') return normalizeFeatures(val.features);
      if (typeof val.features_csv === 'string') return normalizeFeatures(val.features_csv);
    }

    return [];
  };

  const defaultDescription = (slug) => {
    if (slug === 'starter') return 'Everything you need to get started.';
    if (slug === 'professional') return 'Automation and growth tools for scaling teams.';
    if (slug === 'business') return 'Advanced AI, multi-location, and enterprise-ready features.';
    return '';
  };

  const renderFeatures = (slug, rawFeatures, firstCount = 12) => {
    const features = normalizeFeatures(rawFeatures)
      .map(x => String(x).trim())
      .filter(x => x && x.toLowerCase() !== 'null' && x.toLowerCase() !== 'undefined');

    if (!features.length) {
      return `<ul class="text-sm text-gray-700 mb-6 space-y-2"><li class="text-gray-500">Feature list coming soon.</li></ul>`;
    }

    const idBase = `plan-${slug}-features`;
    const visible = features.slice(0, firstCount);
    const hidden  = features.slice(firstCount);

    const li = (text) => {
      const t = String(text ?? '').trim();
      if (!t || t.toLowerCase() === 'null' || t.toLowerCase() === 'undefined') return '';
      return `<li class="flex items-start gap-2"><span aria-hidden="true">✅</span><span>${t}</span></li>`;
    };

    const listTop    = visible.map(li).join('');
    const listHidden = hidden.length ? `<div id="${idBase}-more" class="hidden">${hidden.map(li).join('')}</div>` : '';
    const toggle     = hidden.length ? `<button data-toggle="${idBase}" data-hidden-count="${hidden.length}" type="button" class="text-xs text-blue-600 hover:underline mt-2">Show ${hidden.length} more</button>` : '';

    return `
      <ul class="text-sm text-gray-700 mb-4 space-y-2" id="${idBase}">
        ${listTop}
        ${listHidden}
      </ul>
      ${toggle}
    `;
  };

  const renderSkeleton = () => {
    const cards = Array.from({ length: 3 }).map(() => `
      <div class="bg-white rounded-lg shadow p-6 border animate-pulse">
        <div class="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div class="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
        <div class="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div class="space-y-2 mb-6">
          <div class="h-4 bg-gray-200 rounded"></div>
          <div class="h-4 bg-gray-200 rounded w-5/6"></div>
          <div class="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
        <div class="h-10 bg-gray-200 rounded"></div>
      </div>
    `).join('');
    container.innerHTML = cards;
  };

  // ---------- flow ----------
  try {
    renderSkeleton();

    // NOTE: use the unambiguous API path to avoid static-shadow issues
    const res = await fetch('/api/plans', { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const rawPlans = await res.json();
    if (!Array.isArray(rawPlans) || rawPlans.length === 0) {
      container.innerHTML = `<p class="text-gray-600">Plans will be available soon.</p>`;
      return;
    }

    const plans = [...rawPlans].sort((a, b) => {
      const pa = Number(a.price) || 0;
      const pb = Number(b.price) || 0;
      if (pa !== pb) return pa - pb;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    container.innerHTML = '';

    plans.forEach(plan => {
      const featuresHTML = renderFeatures(plan.slug, plan.features);

      const highlight =
        plan.slug === 'professional' ? 'ring-2 ring-green-500' :
        plan.slug === 'business'     ? 'ring-2 ring-purple-600' :
                                       'border';

      const price    = (Number(plan.price) || 0).toFixed(2);
      const desc     = plan.description || defaultDescription(plan.slug) || '';
      const safeName = String(plan.name || '');
      const safeSlug = String(plan.slug || '');

      const card = document.createElement('div');
      card.className = `bg-white rounded-lg shadow p-6 flex flex-col justify-between ${highlight}`;

      card.innerHTML = `
        <div>
          <div class="flex items-center">
            <h2 class="text-2xl font-semibold mb-2">${safeName}</h2>
            ${planBadges(safeSlug)}
          </div>
          <p class="text-gray-600 mb-4">${desc}</p>
          <div class="text-3xl font-bold text-blue-600 mb-6" aria-label="Price">
            €${price}<span class="text-base text-gray-500 font-normal">/mo</span>
          </div>

          ${featuresHTML}
        </div>

        <a href="${planCTA(safeSlug)}"
           class="mt-auto inline-block bg-blue-600 text-white text-center px-4 py-2 rounded hover:bg-blue-700 transition"
           aria-label="Start free trial for ${safeName}">
          Start Free Trial
        </a>
      `;

      container.appendChild(card);
    });

    // Toggle Show more/less
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-toggle]');
      if (!btn) return;
      const base = btn.getAttribute('data-toggle');
      const moreEl = document.getElementById(`${base}-more`);
      if (!moreEl) return;
      const expanded = !moreEl.classList.contains('hidden');
      moreEl.classList.toggle('hidden', expanded);
      const hiddenCount = btn.getAttribute('data-hidden-count');
      btn.textContent = expanded ? `Show ${hiddenCount} more` : 'Show less';
    });
  } catch (err) {
    console.error('Failed to fetch plans:', err);
    container.innerHTML = `<p class="text-red-500">Failed to load pricing plans. Please try again later.</p>`;
  }
});
