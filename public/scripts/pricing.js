// /public/scripts/pricing.js
(() => {
  const qs = (s) => document.querySelector(s);
  const container = qs('#plansContainer');
  const statusEl = qs('#plansStatus');

  if (!container) {
    console.error('[pricing] #plansContainer not found');
    return;
  }

  const state = {
    billing: (new URLSearchParams(location.search).get('billing') || 'monthly').toLowerCase(), // 'monthly' | 'annual'
    plans: [],
  };

  const announce = (msg) => {
    if (statusEl) statusEl.textContent = msg;
  };

  const money = (num, currency = 'USD') =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: num % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(num);

  const el = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  // ---------- UI: Skeletons ----------
  const renderSkeletons = (count = 3) => {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      container.appendChild(
        el(`
        <div class="bg-white rounded-lg shadow p-6 border animate-pulse">
          <div class="h-6 bg-gray-200 w-1/2 mb-4 rounded"></div>
          <div class="h-8 bg-gray-200 w-1/3 mb-6 rounded"></div>
          <ul class="space-y-2 mb-6">
            <li class="h-4 bg-gray-200 rounded"></li>
            <li class="h-4 bg-gray-200 w-5/6 rounded"></li>
            <li class="h-4 bg-gray-200 w-2/3 rounded"></li>
          </ul>
          <div class="h-10 bg-gray-200 rounded"></div>
        </div>
      `)
      );
    }
  };

  // ---------- UI: Billing Toggle ----------
  const ensureToggle = () => {
    const hostId = 'billingToggleHost';
    let host = qs(`#${hostId}`);
    if (!host) {
      host = el(`<div id="${hostId}" class="max-w-6xl mx-auto px-4 my-4 flex justify-center"></div>`);
      container.parentElement.insertBefore(host, container);
    }

    host.innerHTML = `
      <div class="inline-flex items-center bg-white border rounded-full shadow px-1 py-1">
        <button type="button" data-bill="monthly"
          class="bill-btn px-4 py-2 rounded-full text-sm font-medium ${state.billing === 'monthly' ? 'bg-gray-900 text-white' : 'text-gray-700'}">
          Monthly
        </button>
        <button type="button" data-bill="annual"
          class="bill-btn px-4 py-2 rounded-full text-sm font-medium ${state.billing === 'annual' ? 'bg-gray-900 text-white' : 'text-gray-700'}">
          Annual <span class="ml-1 text-xs text-green-600">(save)</span>
        </button>
      </div>
    `;

    host.querySelectorAll('.bill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-bill');
        if (val && val !== state.billing) {
          state.billing = val;
          const url = new URL(location.href);
          url.searchParams.set('billing', state.billing);
          history.replaceState({}, '', url.toString());
          renderPlans(); // re-render with new billing
          announce(`Billing switched to ${state.billing}.`);
        }
      });
    });
  };

  // ---------- Data fetch ----------
  const fetchPlans = async () => {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch('/api/plans', { credentials: 'same-origin', signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid plans payload');
      return data;
    } finally {
      clearTimeout(to);
    }
  };

  // ---------- Helpers ----------
  const cleanFeatures = (arr) =>
    (arr || []).filter((f) => typeof f === 'string' && f.trim() !== '');

  const priceFor = (plan) => {
    const block = state.billing === 'annual' ? plan.annual : plan.monthly;
    if (!block || block.price == null) return null;
    return money(block.price, plan.currency || 'USD');
  };

  // ---------- Card ----------
  const planCard = (plan) => {
    const price = priceFor(plan);
    const features = cleanFeatures(plan.features);

    return el(`
      <article class="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col" aria-label="${plan.name} plan">
        <div class="p-6 flex-1 flex flex-col">
          <header class="mb-3">
            <h3 class="text-lg font-semibold">${plan.name}</h3>
            ${plan.badge ? `<div class="inline-block text-xs mt-1 px-2 py-1 rounded bg-indigo-50 text-indigo-700">${plan.badge}</div>` : ''}
          </header>

          <div class="mb-4">
            ${
              price
                ? `<div class="text-3xl font-bold">${price}<span class="text-base text-gray-500">/${state.billing === 'annual' ? 'year' : 'month'}</span></div>`
                : `<div class="text-sm text-gray-500">Contact sales</div>`
            }
            ${
              state.billing === 'annual' && plan.annual && plan.annual.note
                ? `<div class="text-xs text-green-700 mt-1">${plan.annual.note}</div>`
                : ''
            }
          </div>

          <ul class="mb-6 space-y-2 text-sm text-gray-700">
            ${
              (features.length
                ? features
                : ['Core tools included'] // fallback if no features
              )
                .slice(0, 12)
                .map(
                  (f) => `
              <li class="flex items-start gap-2">
                <span aria-hidden="true" class="text-green-600">✓</span>
                <span>${f}</span>
              </li>`
                )
                .join('')
            }
          </ul>

          <a href="${ctaHref(plan)}"
             class="inline-flex justify-center items-center px-4 py-2 rounded-lg font-medium
                    ${ctaKind(plan) === 'secondary'
                      ? 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50'
                      : 'bg-gray-900 text-white hover:bg-gray-800'}">
            ${plan.cta?.label || 'Choose plan'}
          </a>
        </div>
      </article>
    `);
  };

  const ctaKind = (plan) => (plan.cta?.kind || '').toLowerCase();
  const ctaHref = (plan) => {
    const id = encodeURIComponent(plan.id);
    if ((plan.cta?.label || '').toLowerCase().includes('sales')) {
      return `/contact-sales?plan=${id}`;
    }
    const bill = encodeURIComponent(state.billing);
    return `/signup?plan=${id}&billing=${bill}`;
  };

  // ---------- Render ----------
  const renderPlans = () => {
    container.innerHTML = '';
    if (!state.plans.length) {
      container.innerHTML = `<div class="text-sm text-gray-600">No plans available.</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    state.plans.forEach((plan) => frag.appendChild(planCard(plan)));
    container.appendChild(frag);
  };

  // ---------- Init ----------
  const init = async () => {
    ensureToggle();
    renderSkeletons();
    announce('Loading plans…');
    try {
      const plans = await fetchPlans();

      // Normalize: ensure arrays, strip nulls, coerce shapes
      state.plans = plans.map((p) => ({
        id: p.id,
        name: p.name,
        badge: p.badge || null,
        popular: !!p.popular,
        currency: p.currency || 'USD',
        monthly: { price: p?.monthly?.price ?? null, note: p?.monthly?.note ?? null },
        annual: { price: p?.annual?.price ?? null, note: p?.annual?.note ?? null },
        features: cleanFeatures(p.features),
        cta: p.cta || { label: 'Start free trial' },
      }));

      renderPlans();
      announce('Plans loaded.');
    } catch (err) {
      console.error('[pricing] failed to load plans', err);
      container.innerHTML = `
        <div class="max-w-md mx-auto p-4 border border-red-200 bg-red-50 text-red-700 rounded">
          We couldn’t load plans right now. Please try again in a moment.
        </div>`;
      announce('Failed to load plans.');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
