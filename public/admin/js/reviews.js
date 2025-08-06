document.addEventListener('DOMContentLoaded', () => {
  const el = {
    googleLink: document.getElementById('googleReviewLink'),
    enableGoogle: document.getElementById('enableGoogleReview'),
    enableInternal: document.getElementById('enableInternalReview'),
    reviewDelay: document.getElementById('reviewDelayHours'),
    sendEmail: document.getElementById('sendEmailReview'),
    sendSms: document.getElementById('sendSmsReview'),
    saveBtn: document.getElementById('saveReviewSettings'),

    smsModal: document.getElementById('smsModal'),
    closeSmsModal: document.getElementById('closeSmsModal'),
    saveTwilioBtn: document.getElementById('saveTwilioSettings'),
    twilioSid: document.getElementById('twilioSid'),
    twilioToken: document.getElementById('twilioAuthToken'),
    twilioPhone: document.getElementById('twilioPhone'),

    openGoogleReviewModal: document.getElementById('openGoogleReviewModal'),
    closeGoogleReviewModal: document.getElementById('closeGoogleReviewModal'),
    googleReviewModal: document.getElementById('googleReviewModal'),

    openInternalReviewModal: document.getElementById('openInternalReviewModal'),
    closeInternalReviewModal: document.getElementById('closeInternalReviewModal'),
    internalReviewModal: document.getElementById('internalReviewModal'),

    googleChart: document.getElementById('googleChart'),
    internalChart: document.getElementById('internalChart'),

    sendGoogleReview: document.getElementById('sendGoogleReview'),
    sendInternalReview: document.getElementById('sendInternalReview'),

    internalReviewTableBody: document.getElementById('internalReviewTableBody'),
  };

  let businessId = null;
  let internalChartInstance = null;

  async function fetchBusinessId() {
    try {
      const res = await fetch('/api/business/public');
      const data = await res.json();
      if (!data?.id) throw new Error('Business ID not found');
      businessId = data.id;
    } catch (err) {
      console.error('❌ Error fetching business ID:', err);
    }
  }

  async function loadReviewSettings() {
    try {
      const res = await fetch(`/api/reviews/settings/${businessId}`);
      const { settings } = await res.json();
      if (!settings) return;

      el.googleLink.value = settings.google_review_link || '';
      el.enableGoogle.checked = !!settings.enable_google;
      el.enableInternal.checked = !!settings.enable_internal;
      el.reviewDelay.value = Math.floor((settings.delay_minutes || 0) / 60);
      el.sendEmail.checked = !!settings.send_email;
      el.sendSms.checked = !!settings.send_sms;

      toggleGoogleInput();
    } catch (err) {
      console.error('❌ Error loading review settings:', err);
    }
  }

  async function saveReviewSettings() {
    if (!businessId) return alert('Business ID is missing');

    const googleLink = el.googleLink.value.trim();
    const isValidLink = googleLink === '' || /^https:\/\/(g\.page|search\.google\.com|www\.google\.com)\/.+/.test(googleLink);

    if (!isValidLink) {
      alert('❌ Invalid Google review link');
      return;
    }

    const payload = {
      business_id: businessId,
      google_review_link: googleLink,
      enable_google: el.enableGoogle.checked,
      enable_internal: el.enableInternal.checked,
      delay_minutes: parseInt(el.reviewDelay.value || '0') * 60,
      send_email: el.sendEmail.checked,
      send_sms: el.sendSms.checked,
    };

    try {
      const res = await fetch('/api/reviews/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Failed to save review settings');

      alert('✅ Review settings saved!');
    } catch (err) {
      console.error('❌ Error saving review settings:', err);
      alert('❌ Failed to save settings');
    }
  }

  async function loadInternalReviews() {
    try {
      const res = await fetch(`/api/reviews/internal/${businessId}`);
      const data = await res.json();

      const tbody = el.internalReviewTableBody;
      tbody.innerHTML = '';

      if (!data.reviews || !data.reviews.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-3 text-center text-gray-500">No reviews yet.</td></tr>`;
        return;
      }

      for (const review of data.reviews) {
        const clientName = review.client_name || 'Unknown Client';
        const providerName = review.service_provider_name || 'Unknown Provider';

        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="px-4 py-3">${clientName}</td>
          <td class="px-4 py-3">${providerName}</td>
          <td class="px-4 py-3">${review.rating}</td>
          <td class="px-4 py-3">${review.message || '—'}</td>
          <td class="px-4 py-3">${new Date(review.created_at).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
      }
    } catch (err) {
      console.error('❌ Failed to load internal reviews:', err);
    }
  }

  async function loadGoogleAnalytics() {
    try {
      const res = await fetch(`/api/reviews/analytics/${businessId}`);
      const { analytics } = await res.json();

      if (!analytics || !analytics.length) {
        console.warn('No analytics data available');
        return;
      }

      const labels = analytics.map(entry => entry.label);
      const values = analytics.map(entry => entry.count);

      if (window.googleChartInstance) {
        window.googleChartInstance.destroy();
      }

      window.googleChartInstance = new Chart(el.googleChart, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Google Review Counts',
            data: values,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    } catch (err) {
      console.error('❌ Failed to load Google analytics:', err);
    }
  }

  function toggleGoogleInput() {
    el.googleLink.disabled = !el.enableGoogle.checked;
  }

  function setupEventListeners() {
    el.saveBtn?.addEventListener('click', saveReviewSettings);

    // Internal Review Modal
    el.openInternalReviewModal?.addEventListener('click', () => {
      el.internalReviewModal.classList.remove('hidden');
      loadInternalReviews();
    });

    el.closeInternalReviewModal?.addEventListener('click', () => {
      el.internalReviewModal.classList.add('hidden');
    });

    // Google Review Modal
    el.openGoogleReviewModal?.addEventListener('click', () => {
      el.googleReviewModal.classList.remove('hidden');
      loadGoogleAnalytics();
    });

    el.closeGoogleReviewModal?.addEventListener('click', () => {
      el.googleReviewModal.classList.add('hidden');
    });

    // ✅ SMS Modal
    el.sendSms?.addEventListener('change', () => {
      if (el.sendSms.checked) {
        el.smsModal.classList.remove('hidden');
      }
    });

    el.closeSmsModal?.addEventListener('click', () => {
      el.smsModal.classList.add('hidden');
      el.sendSms.checked = false; // Optional: uncheck on close
    });

    // Enable/disable input
    el.enableGoogle?.addEventListener('change', toggleGoogleInput);
  }

  async function init() {
    await fetchBusinessId();
    if (businessId) {
      await loadReviewSettings();
      setupEventListeners();
    }
  }

  init();
});
