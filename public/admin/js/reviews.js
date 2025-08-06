document.addEventListener('DOMContentLoaded', () => {
  const el = {
    // Review Settings
    googleLink: document.getElementById('googleReviewLink'),
    enableGoogle: document.getElementById('enableGoogleReview'),
    enableInternal: document.getElementById('enableInternalReview'),
    reviewDelay: document.getElementById('reviewDelayHours'),
    sendEmail: document.getElementById('sendEmailReview'),
    sendSms: document.getElementById('sendSmsReview'),
    saveBtn: document.getElementById('saveReviewSettings'),

    // Twilio Modal
    smsModal: document.getElementById('smsModal'),
    closeSmsModal: document.getElementById('closeSmsModal'),
    saveTwilioBtn: document.getElementById('saveTwilioSettings'),
    twilioSid: document.getElementById('twilioSid'),
    twilioToken: document.getElementById('twilioAuthToken'),
    twilioPhone: document.getElementById('twilioPhone'),

    // Modals
    openGoogleReviewModal: document.getElementById('openGoogleReviewModal'),
    closeGoogleReviewModal: document.getElementById('closeGoogleReviewModal'),
    googleReviewModal: document.getElementById('googleReviewModal'),
    openInternalReviewModal: document.getElementById('openInternalReviewModal'),
    closeInternalReviewModal: document.getElementById('closeInternalReviewModal'),
    internalReviewModal: document.getElementById('internalReviewModal'),

    // Charts
    googleChart: document.getElementById('googleChart'),
    internalChart: document.getElementById('internalChart'),

    // Send buttons
    sendGoogleReview: document.getElementById('sendGoogleReview'),
    sendInternalReview: document.getElementById('sendInternalReview'),
  };

  let businessId = null;

  // 🔹 Fetch Business ID
  async function fetchBusinessId() {
    try {
      const res = await fetch('/api/business/public');
      const data = await res.json();
      if (!data?.id) throw new Error('Business ID not found');
      businessId = data.id;
    } catch (err) {
      console.error('❌ Failed to fetch business ID:', err);
    }
  }

  // 🔹 Load Review Settings
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

  // 🔹 Save Review Settings
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
    }
  }

  // 🔹 Save Twilio Settings
  async function saveTwilioSettings() {
    const sid = el.twilioSid.value.trim();
    const token = el.twilioToken.value.trim();
    const phone = el.twilioPhone.value.trim();

    if (!sid || !token || !phone) {
      alert('Please complete all Twilio fields');
      return;
    }

    try {
      const res = await fetch('/api/sms/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          twilio_sid: sid,
          twilio_auth_token: token,
          twilio_phone: phone,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Failed to save Twilio settings');

      el.smsModal.classList.add('hidden');
      alert('✅ Twilio settings saved!');
    } catch (err) {
      console.error('❌ Error saving Twilio settings:', err);
      alert('❌ Failed to save Twilio settings');
    }
  }

  // 🔹 Analytics
  async function loadGoogleAnalytics() {
    if (!el.enableGoogle.checked || !el.googleChart) return;

    try {
      const res = await fetch(`/api/reviews/google/analytics/${businessId}`);
      const data = await res.json();

      new Chart(el.googleChart, {
        type: 'line',
        data: {
          labels: data.labels || [],
          datasets: [
            {
              label: 'Requests Sent',
              data: data.sent || [],
              borderColor: '#6366f1',
              tension: 0.3,
            },
            {
              label: 'Clicks Received',
              data: data.clicks || [],
              borderColor: '#10b981',
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: 'Google Reviews' },
          },
        },
      });
    } catch (err) {
      console.error('❌ Failed to load Google analytics:', err);
    }
  }

  async function loadInternalAnalytics() {
    if (!el.enableInternal.checked || !el.internalChart) return;

    try {
      const res = await fetch(`/api/reviews/internal/analytics/${businessId}`);
      const data = await res.json();

      new Chart(el.internalChart, {
        type: 'bar',
        data: {
          labels: data.labels || [],
          datasets: [{
            label: 'Avg Rating',
            data: data.ratings || [],
            backgroundColor: '#6366f1',
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 5
            }
          },
          plugins: {
            title: { display: true, text: 'Internal Review Ratings' },
            legend: { display: false }
          }
        },
      });
    } catch (err) {
      console.error('❌ Failed to load internal analytics:', err);
    }
  }

  // 🔹 Send Requests
  async function sendGoogleReviewRequest() {
    if (!el.enableGoogle.checked) return alert('Google reviews are disabled');

    try {
      const res = await fetch(`/api/reviews/google/send/${businessId}`, { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Failed');
      alert('✅ Google review request sent!');
    } catch (err) {
      console.error('❌ Send Google review failed:', err);
    }
  }

  async function sendInternalReviewRequest() {
    if (!el.enableInternal.checked) return alert('Internal reviews are disabled');

    try {
      const res = await fetch(`/api/reviews/internal/send/${businessId}`, { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Failed');
      alert('✅ Internal review request sent!');
    } catch (err) {
      console.error('❌ Send internal review failed:', err);
    }
  }

  // 🔹 Helper Functions
  function toggleGoogleInput() {
    el.googleLink.disabled = !el.enableGoogle.checked;
  }

  function validateGoogleLink() {
    const value = el.googleLink.value.trim();
    const isValid = /^https:\/\/(g\.page|search\.google\.com|www\.google\.com)\/.+/.test(value);
    el.googleLink.classList.remove('border-red-500', 'border-green-500');
    if (value !== '') {
      el.googleLink.classList.add(isValid ? 'border-green-500' : 'border-red-500');
    }
  }

  // 🔹 Event Listeners
  function setupEventListeners() {
    el.googleLink?.addEventListener('input', validateGoogleLink);
    el.enableGoogle?.addEventListener('change', () => {
      toggleGoogleInput();
      validateGoogleLink();
    });
    el.saveBtn?.addEventListener('click', saveReviewSettings);
    el.saveTwilioBtn?.addEventListener('click', saveTwilioSettings);

    el.sendSms?.addEventListener('change', () => {
      if (el.sendSms.checked) el.smsModal.classList.remove('hidden');
    });
    el.closeSmsModal?.addEventListener('click', () => {
      el.smsModal.classList.add('hidden');
      el.sendSms.checked = false;
    });

    el.openGoogleReviewModal?.addEventListener('click', () => {
      el.googleReviewModal.classList.remove('hidden');
      loadGoogleAnalytics();
    });
    el.closeGoogleReviewModal?.addEventListener('click', () => {
      el.googleReviewModal.classList.add('hidden');
    });

    el.openInternalReviewModal?.addEventListener('click', () => {
      el.internalReviewModal.classList.remove('hidden');
      loadInternalAnalytics();
    });
    el.closeInternalReviewModal?.addEventListener('click', () => {
      el.internalReviewModal.classList.add('hidden');
    });

    el.sendGoogleReview?.addEventListener('click', sendGoogleReviewRequest);
    el.sendInternalReview?.addEventListener('click', sendInternalReviewRequest);
  }

  // 🔹 Init
  async function init() {
    await fetchBusinessId();
    if (businessId) {
      await loadReviewSettings();
    }
    setupEventListeners();
  }

  init();
});
