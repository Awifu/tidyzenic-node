document.addEventListener('DOMContentLoaded', () => {
  const elements = {
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

  // ─────────────────────────────────────────────────────────────
  // 🔹 Get Business ID
  // ─────────────────────────────────────────────────────────────
  async function getBusinessId() {
    try {
      const res = await fetch('/api/business/public');
      const data = await res.json();
      if (!data?.id) throw new Error('No business ID found');
      businessId = data.id;
    } catch (err) {
      console.error('❌ Failed to fetch business ID:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 🔹 Load Review Settings
  // ─────────────────────────────────────────────────────────────
  async function loadSettings() {
    try {
      const res = await fetch(`/api/reviews/settings/${businessId}`);
      const data = await res.json();
      const settings = data?.settings;
      if (!settings) return;

      elements.googleLink.value = settings.google_review_link || '';
      elements.enableGoogle.checked = !!settings.enable_google;
      elements.enableInternal.checked = !!settings.enable_internal;
      elements.reviewDelay.value = Math.floor((settings.delay_minutes || 0) / 60);
      elements.sendEmail.checked = !!settings.send_email;
      elements.sendSms.checked = !!settings.send_sms;

      updateGoogleLinkDisabled();
    } catch (err) {
      console.error('❌ Error loading settings:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 🔹 Save Review Settings
  // ─────────────────────────────────────────────────────────────
  async function saveSettings() {
    if (!businessId) {
      alert('Business ID not loaded yet.');
      return;
    }

    const googleReviewLink = elements.googleLink.value.trim();
    const isValidGoogleLink = googleReviewLink === '' || /^https:\/\/(g\.page|search\.google\.com|www\.google\.com)\/.+/.test(googleReviewLink);
    if (!isValidGoogleLink) {
      alert('❌ Invalid Google Review link');
      return;
    }

    const payload = {
      business_id: businessId,
      google_review_link: googleReviewLink,
      enable_google: elements.enableGoogle.checked,
      enable_internal: elements.enableInternal.checked,
      delay_minutes: parseInt(elements.reviewDelay.value || '0') * 60,
      send_email: elements.sendEmail.checked,
      send_sms: elements.sendSms.checked,
    };

    try {
      const res = await fetch('/api/reviews/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Failed to save settings');

      alert('✅ Review settings saved!');
    } catch (err) {
      console.error('❌ Error saving review settings:', err);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 🔹 Save Twilio Settings
  // ─────────────────────────────────────────────────────────────
  async function saveTwilioSettings() {
    const sid = elements.twilioSid.value.trim();
    const token = elements.twilioToken.value.trim();
    const phone = elements.twilioPhone.value.trim();

    if (!sid || !token || !phone) {
      alert('Please fill in all Twilio fields');
      return;
    }

    try {
      const res = await fetch('/api/sms-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          sid,
          token,
          phone,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result?.error || 'Failed to save Twilio settings');
      }

      elements.smsModal.classList.add('hidden');
      alert('✅ Twilio settings saved!');
    } catch (err) {
      console.error('❌ Error saving Twilio settings:', err);
      alert('❌ Failed to save Twilio settings');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 🔹 Input Behaviors & Events
  // ─────────────────────────────────────────────────────────────
  function validateGoogleLink() {
    const value = elements.googleLink.value.trim();
    const isValid = /^https:\/\/(g\.page|search\.google\.com|www\.google\.com)\/.+/.test(value);

    elements.googleLink.classList.remove('border-green-500', 'border-red-500');
    if (value === '') return;
    elements.googleLink.classList.add(isValid ? 'border-green-500' : 'border-red-500');
  }

  function updateGoogleLinkDisabled() {
    elements.googleLink.disabled = !elements.enableGoogle.checked;
  }

  // ─────────────────────────────────────────────────────────────
  // 🔹 Modal Events
  // ─────────────────────────────────────────────────────────────
  elements.sendSms?.addEventListener('change', () => {
    if (elements.sendSms.checked && elements.smsModal) {
      elements.smsModal.classList.remove('hidden');
    }
  });

  elements.closeSmsModal?.addEventListener('click', () => {
    elements.smsModal?.classList.add('hidden');
    elements.sendSms.checked = false;
  });

  elements.saveTwilioBtn?.addEventListener('click', saveTwilioSettings);
  elements.googleLink?.addEventListener('input', validateGoogleLink);
  elements.enableGoogle?.addEventListener('change', () => {
    updateGoogleLinkDisabled();
    validateGoogleLink();
  });

  elements.saveBtn?.addEventListener('click', saveSettings);

  // ─────────────────────────────────────────────────────────────
  // 🔹 Init
  // ─────────────────────────────────────────────────────────────
  getBusinessId().then(() => {
    loadSettings();
    // optionally: loadTwilioSettings(); // if implemented
  });
});
