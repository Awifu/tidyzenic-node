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

  async function fetchBusinessId() {
    try {
      const res = await fetch('/api/business/public');
      const data = await res.json();
      businessId = data.id;
    } catch (err) {
      console.error('❌ Error fetching business ID:', err);
    }
  }
let googleChartInstance = null;
let internalChartInstance = null;

async function loadGoogleAnalytics() {
  if (!businessId) return;

  try {
    const res = await fetch(`/api/reviews/analytics/${businessId}`);
    const { analytics } = await res.json();

    if (!analytics || !Array.isArray(analytics)) return;

    const labels = analytics.map((a) => a.label);
    const data = analytics.map((a) => a.count);

    if (googleChartInstance) googleChartInstance.destroy();

    googleChartInstance = new Chart(el.googleChart, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Google Review Ratings',
          data,
          backgroundColor: 'rgba(79, 70, 229, 0.6)',
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
      },
    });
  } catch (err) {
    console.error('❌ Failed to load Google analytics:', err);
  }
}

async function loadInternalReviews() {
  if (!businessId) return;

  try {
    const res = await fetch(`/api/reviews/internal/${businessId}`);
    const { reviews } = await res.json();

    // 🌟 Populate chart
    const serviceRatings = {};
    reviews.forEach(({ service_name, rating }) => {
      if (!serviceRatings[service_name]) {
        serviceRatings[service_name] = [];
      }
      serviceRatings[service_name].push(rating);
    });

    const labels = Object.keys(serviceRatings);
    const data = labels.map((label) => {
      const ratings = serviceRatings[label];
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      return parseFloat(avg.toFixed(2));
    });

    if (internalChartInstance) internalChartInstance.destroy();

    internalChartInstance = new Chart(el.internalChart, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Avg Rating',
          data,
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
        }],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            min: 0,
            max: 5,
            ticks: { stepSize: 1 },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });

    // 🌟 Optionally, populate the internal reviews table
    el.internalReviewTableBody.innerHTML = '';
    reviews.slice(0, 5).forEach((r) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-4 py-3">${r.client_name}</td>
        <td class="px-4 py-3">${r.service_provider_name}</td>
        <td class="px-4 py-3">${r.rating}</td>
        <td class="px-4 py-3">${r.message || ''}</td>
        <td class="px-4 py-3">${new Date(r.created_at).toLocaleDateString()}</td>
      `;
      el.internalReviewTableBody.appendChild(row);
    });

  } catch (err) {
    console.error('❌ Failed to load internal reviews:', err);
  }
}

  async function loadReviewSettings() {
    if (!businessId) return;

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
    if (!businessId) return alert('Business ID missing');

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
      if (!res.ok) throw new Error(result.error || 'Failed to save');

      alert('✅ Review settings saved!');
    } catch (err) {
      console.error('❌ Failed to save review settings:', err);
      alert('❌ Save failed');
    }
  }

  function toggleGoogleInput() {
    el.googleLink.disabled = !el.enableGoogle.checked;
  }

  function setupEventListeners() {
    el.saveBtn?.addEventListener('click', saveReviewSettings);
    el.enableGoogle?.addEventListener('change', toggleGoogleInput);

el.openGoogleReviewModal?.addEventListener('click', () => {
  el.googleReviewModal.classList.remove('hidden');
  loadGoogleAnalytics(); // ✅ now it's active
});

el.openInternalReviewModal?.addEventListener('click', () => {
  el.internalReviewModal.classList.remove('hidden');
  loadInternalReviews(); // ✅ now it's active
});

 el.closeGoogleReviewModal?.addEventListener('click', () => {
  el.googleReviewModal.classList.add('hidden');
});

    el.sendSms?.addEventListener('change', () => {
      if (el.sendSms.checked) {
        el.smsModal.classList.remove('hidden');
      }
    });

    el.closeSmsModal?.addEventListener('click', () => {
      el.smsModal.classList.add('hidden');
      el.sendSms.checked = false;
    });

    el.saveTwilioBtn?.addEventListener('click', async () => {
      const sid = el.twilioSid.value.trim();
      const authToken = el.twilioToken.value.trim();
      const phone = el.twilioPhone.value.trim();

      if (!sid || !authToken || !phone) {
        alert('❌ Please fill in all Twilio fields.');
        return;
      }

      try {
        const res = await fetch('/api/sms/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ twilio_sid: sid, twilio_auth_token: authToken }),
        });

        const result = await res.json();
        if (!res.ok || !result.valid) {
          alert(result.error || 'Invalid Twilio credentials');
          return;
        }
      } catch (err) {
        alert('❌ Error validating Twilio credentials.');
        return;
      }

      try {
        const res = await fetch('/api/sms/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: businessId,
            twilio_sid: sid,
            twilio_auth_token: authToken,
            twilio_phone: phone,
          }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        alert('✅ Twilio credentials saved!');
        el.smsModal.classList.add('hidden');
      } catch (err) {
        console.error('❌ Save failed:', err);
        alert('❌ Could not save Twilio credentials.');
      }
    });
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
