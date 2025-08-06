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
      // loadGoogleAnalytics(); // ← define this if needed
    });

    el.closeGoogleReviewModal?.addEventListener('click', () => {
      el.googleReviewModal.classList.add('hidden');
    });

    el.openInternalReviewModal?.addEventListener('click', () => {
      el.internalReviewModal.classList.remove('hidden');
      // loadInternalReviews(); // ← define this if needed
    });

    el.closeInternalReviewModal?.addEventListener('click', () => {
      el.internalReviewModal.classList.add('hidden');
    });

    el.sendSms?.addEventListener('change', () => {
      if (el.sendSms.checked) {
        el.smsModal.classList.remove('hidden');
        // loadTwilioSettings(); // ← optional: only if you're preloading from DB
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
