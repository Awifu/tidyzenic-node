

document.addEventListener('DOMContentLoaded', async () => {
  const plansContainer = document.getElementById('plansContainer');
  const plansStatus = document.getElementById('plansStatus');
  const currencySymbol = '€';

  const createSkeletonCard = () => `
    <div class="bg-white rounded-lg shadow-lg p-6 flex flex-col justify-between animate-pulse">
      <div>
        <div class="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div class="text-3xl font-bold my-4 h-10 bg-gray-200 rounded"></div>
        <ul class="space-y-2 mt-4">
          <li class="h-4 bg-gray-200 rounded"></li>
          <li class="h-4 bg-gray-200 rounded"></li>
          <li class="h-4 bg-gray-200 rounded"></li>
          <li class="h-4 bg-gray-200 rounded"></li>
        </ul>
      </div>
      <div class="mt-6 h-10 bg-gray-200 rounded"></div>
    </div>
  `;

  plansContainer.innerHTML = createSkeletonCard() + createSkeletonCard() + createSkeletonCard();
  plansStatus.textContent = "Loading pricing plans...";

  try {
    const response = await fetch('/api/plans', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const plans = await response.json();

    plansStatus.textContent = "Pricing plans loaded successfully.";

    if (!plans || plans.length === 0) {
      plansContainer.innerHTML = `
        <p class="col-span-full text-center text-gray-500 text-lg">No pricing plans available at the moment. Please check back later.</p>
      `;
      return;
    }

    plansContainer.innerHTML = '';
    plans.forEach(plan => {
      const monthlyPrice = plan.monthly.price !== null
        ? `${currencySymbol}${plan.monthly.price.toFixed(2)}`
        : 'Contact us';
      const annualPrice = plan.annual.price !== null
        ? `${currencySymbol}${plan.annual.price.toFixed(2)}`
        : 'Contact us';

      // **FIXED: Correctly iterate through the features array to create the list.**
      const featuresList = plan.features.map(feature => `
        <li class="flex items-start">
          <svg class="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>${feature}</span>
        </li>
      `).join('');

      const ctaLabel = plan.cta.label || (plan.monthly.price === null ? 'Contact Sales' : 'Start free trial');
      const ctaHref = plan.monthly.price === null ? '/contact-sales' : '/register';
      const ctaClass = plan.popular ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-indigo-600 border border-gray-200';

      const planCard = `
        <div class="bg-white rounded-lg shadow-lg p-6 flex flex-col justify-between ${plan.popular ? 'ring-2 ring-indigo-500 transform scale-105' : ''}">
          ${plan.badge ? `<div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase">${plan.badge}</div>` : ''}
          <div>
            <h2 class="text-xl font-bold mb-2">${plan.name}</h2>
            <p class="text-sm text-gray-500">${plan.monthly.note || 'No credit card required'}</p>
            <div class="mt-4">
              <span class="text-4xl font-bold">${monthlyPrice}</span>
              <span class="text-gray-500">/month</span>
            </div>
            <p class="text-sm text-gray-500 mt-1">${plan.annual.note || ''}</p>
            <ul class="space-y-3 mt-6 text-sm">
              ${featuresList}
            </ul>
          </div>
          <a href="${ctaHref}" class="mt-8 block w-full text-center py-3 px-4 rounded-lg font-semibold transition-colors duration-200 ${ctaClass}">
            ${ctaLabel}
          </a>
        </div>
      `;
      plansContainer.innerHTML += planCard;
    });

  } catch (error) {
    console.error("Failed to fetch pricing plans:", error);
    plansStatus.textContent = "Error loading pricing plans. Please try again.";
    plansContainer.innerHTML = `
      <div class="col-span-full text-center p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p class="font-semibold">Oops! Something went wrong.</p>
        <p class="mt-1">We couldn't load the pricing plans. Please refresh the page or try again later.</p>
      </div>
    `;
  }
});