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

    // New modals
    openGoogleReviewModal: document.getElementById('openGoogleReviewModal'),
    closeGoogleReviewModal: document.getElementById('closeGoogleReviewModal'),
    googleReviewModal: document.getElementById('googleReviewModal'),

    openInternalReviewModal: document.getElementById('openInternalReviewModal'),
    closeInternalReviewModal: document.getElementById('closeInternalReviewModal'),
    internalReviewModal: document.getElementById('internalReviewModal'),
  };

  let businessId = null;

  // 🔹 Load Business ID
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

  // 🔹 UI Helpers
  function validateGoogleLink() {
    const value = el.googleLink.value.trim();
    const isValid = /^https:\/\/(g\.page|search\.google\.com|www\.google\.com)\/.+/.test(value);

    el.googleLink.classList.remove('border-red-500', 'border-green-500');
    if (value === '') return;
    el.googleLink.classList.add(isValid ? 'border-green-500' : 'border-red-500');
  }

  function toggleGoogleInput() {
    el.googleLink.disabled = !el.enableGoogle.checked;
  }

  // 🔹 Modal Listeners
  function setupModalListeners() {
    // SMS Modal
    el.sendSms?.addEventListener('change', () => {
      if (el.sendSms.checked && el.smsModal) {
        el.smsModal.classList.remove('hidden');
      }
    });

    el.closeSmsModal?.addEventListener('click', () => {
      el.smsModal.classList.add('hidden');
      el.sendSms.checked = false;
    });

    el.saveTwilioBtn?.addEventListener('click', saveTwilioSettings);

    // Google Review Modal
    el.openGoogleReviewModal?.addEventListener('click', () => {
      el.googleReviewModal.classList.remove('hidden');
    });
    el.closeGoogleReviewModal?.addEventListener('click', () => {
      el.googleReviewModal.classList.add('hidden');
    });

    // Internal Review Modal
    el.openInternalReviewModal?.addEventListener('click', () => {
      el.internalReviewModal.classList.remove('hidden');
    });
    el.closeInternalReviewModal?.addEventListener('click', () => {
      el.internalReviewModal.classList.add('hidden');
    });
  }

  // 🔹 Input Listeners
  function setupInputListeners() {
    el.googleLink?.addEventListener('input', validateGoogleLink);
    el.enableGoogle?.addEventListener('change', () => {
      toggleGoogleInput();
      validateGoogleLink();
    });

    el.saveBtn?.addEventListener('click', saveReviewSettings);
  }

  // 🔹 Init
  async function init() {
    await fetchBusinessId();
    if (businessId) {
      await loadReviewSettings();
    }
    setupModalListeners();
    setupInputListeners();
  }

  init();
});
  // 🔹 Load Google Analytics
  async function loadGoogleAnalytics() {
    if (!el.googleReviewModal || !el.enableGoogle.checked) return;

    try {
      const res = await fetch(`/api/reviews/google/analytics/${businessId}`);
      const data = await res.json();

      const ctx = document.getElementById('googleChart');
      if (!ctx) return;

      new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Review Requests Sent',
              data: data.sent || [5, 10, 7, 4, 12, 8, 9],
              borderWidth: 2,
              borderColor: '#6366f1',
              fill: false,
              tension: 0.3,
            },
            {
              label: 'Clicks Received',
              data: data.clicks || [2, 6, 4, 1, 7, 3, 5],
              borderWidth: 2,
              borderColor: '#10b981',
              fill: false,
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Google Reviews Performance' },
          },
        },
      });
    } catch (err) {
      console.error('❌ Failed to load Google review analytics:', err);
    }
  }

  // 🔹 Load Internal Analytics
  async function loadInternalAnalytics() {
    if (!el.internalReviewModal || !el.enableInternal.checked) return;

    try {
      const res = await fetch(`/api/reviews/internal/analytics/${businessId}`);
      const data = await res.json();

      const ctx = document.getElementById('internalChart');
      if (!ctx) return;

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: data.labels || ['Service A', 'Service B', 'Service C'],
          datasets: [
            {
              label: 'Avg Rating',
              data: data.ratings || [4.2, 4.5, 3.8],
              backgroundColor: '#6366f1',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Internal Review Ratings' },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 5,
            },
          },
        },
      });
    } catch (err) {
      console.error('❌ Failed to load internal review analytics:', err);
    }
  }

  // 🔹 Send Google Review Request (trigger manually)
  async function sendGoogleReviewRequest() {
    if (!el.enableGoogle.checked) {
      return alert('Google review requests are disabled.');
    }

    try {
      const res = await fetch(`/api/reviews/google/send/${businessId}`, { method: 'POST' });
      const result = await res.json();

      if (!res.ok) throw new Error(result?.error || 'Error sending request');
      alert('✅ Google review request sent!');
    } catch (err) {
      console.error('❌ Failed to send Google review request:', err);
      alert('❌ Could not send Google review request.');
    }
  }

  // 🔹 Send Internal Review Request (trigger manually)
  async function sendInternalReviewRequest() {
    if (!el.enableInternal.checked) {
      return alert('Internal review system is disabled.');
    }

    try {
      const res = await fetch(`/api/reviews/internal/send/${businessId}`, { method: 'POST' });
      const result = await res.json();

      if (!res.ok) throw new Error(result?.error || 'Error sending request');
      alert('✅ Internal review request sent!');
    } catch (err) {
      console.error('❌ Failed to send internal review request:', err);
      alert('❌ Could not send internal review request.');
    }
  }

  // 🔹 Register Chart Triggers
  function setupAnalyticsTriggers() {
    document.getElementById('openGoogleReviewModal')?.addEventListener('click', loadGoogleAnalytics);
    document.getElementById('openInternalReviewModal')?.addEventListener('click', loadInternalAnalytics);
  }

  // 🔹 Register Send Buttons
  function setupSendButtons() {
    document.getElementById('sendGoogleReview')?.addEventListener('click', sendGoogleReviewRequest);
    document.getElementById('sendInternalReview')?.addEventListener('click', sendInternalReviewRequest);
  }

  setupAnalyticsTriggers();
  setupSendButtons();
