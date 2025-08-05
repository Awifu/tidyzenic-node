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

  // 🔹 Modal Events
  function setupModalListeners() {
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
