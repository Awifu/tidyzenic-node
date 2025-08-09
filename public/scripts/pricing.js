// public/scripts/pricing.js
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('plansContainer');
  if (!container) return;

  // --- UI helpers ---
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
      // Try JSON array string first
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

  // Render a features list with a collapsible "Show more" when long
  const renderFeatures = (slug, rawFeatures, firstCount = 12) => {
    const features = normalizeFeatures(rawFeatures);

    if (!features.length) {
      return {
        html: `<ul class="text-sm text-gray-700 mb-6 space-y-2"><li class="text-gray-500">Feature list coming soon.</li></ul>`,
        script: ''
      };
    }

    // Keep the original order! (No sorting)
    const idBase = `plan-${slug}-features`;
    const visible = features.slice(0, firstCount);
    const hidden = features.slice(firstCount);

    const li = (text) => `<li class="flex items-start gap-2"><span aria-hidden="true">✅</span><span>${text}</span></li>`;

    const listTop = visible.map(li).join('');
    const hasHidden = hidden.length > 0;
    const listHidden = hasHidden
      ? `<div id="${idBase}-more" class="hidden">${hidden.map(li).join('')}</div>`
      : '';

    const toggle = hasHidden
      ? `<button id="${idBase}-toggle" type="button" class="text-xs text-blue-600 hover:underline mt-2">
           Show ${hidden.length} more
         </button>`
      : '';

    const html = `
      <ul class="text-sm text-gray-700 mb-4 space-y-2" id="${idBase}">
        ${listTop}
        ${listHidden}
      </ul>
      ${toggle}
    `;

    const script = hasHidden
      ? `
        (function(){
          const btn = document.getElementById('${idBase}-toggle');
          const more = document.getElementById('${idBase}-more');
          if (!btn || !more) return;
          let expanded = false;
          btn.addEventListener('click', () => {
            expanded = !expanded;
            more.classList.toggle('hidden', !expanded);
            btn.textContent = expanded ? 'Show less' : 'Show ${hidden.length} more';
          });
        })();
      `
      : '';

    return { html, script };
  };

  // Optional: small skeleton while loading
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

  try {
    renderSkeleton();

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

    container.innerHTML = ''; // clear skeleton

    const pendingInlineScripts = [];

    plans.forEach(plan => {
      const { html: featuresHTML, script: inlineScript } = renderFeatures(plan.slug, plan.features);

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
          <div class="text-3xl font-bold text-blue-600 mb-6" aria-label="Price">
            €${price}<span class="text-base text-gray-500 font-normal">/mo</span>
          </div>

          ${featuresHTML}
        </div>

        <a href="${planCTA(plan.slug)}"
          class="mt-auto inline-block bg-blue-600 text-white text-center px-4 py-2 rounded hover:bg-blue-700 transition"
          aria-label="Start free trial for ${plan.name}">
          Start Free Trial
        </a>
      `;

      container.appendChild(card);

      if (inlineScript) pendingInlineScripts.push(inlineScript);
    });

    // Run any per-card toggle scripts
    if (pendingInlineScripts.length) {
      const s = document.createElement('script');
      s.type = 'module';
      s.textContent = pendingInlineScripts.join('\n');
      document.body.appendChild(s);
    }
  } catch (err) {
    console.error('Failed to fetch plans:', err);
    container.innerHTML = `<p class="text-red-500">Failed to load pricing plans. Please try again later.</p>`;
  }
});
