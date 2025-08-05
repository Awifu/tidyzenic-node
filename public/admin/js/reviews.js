document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    googleLink: document.getElementById('googleReviewLink'),
    enableInternal: document.getElementById('enableInternalReview'),
    reviewDelay: document.getElementById('reviewDelayHours'),
    sendEmail: document.getElementById('sendEmailReview'),
    sendSms: document.getElementById('sendSmsReview'),
    saveBtn: document.getElementById('saveReviewSettings'),
  };

  let businessId = null;

  // 🔹 Validate Google Review Link Format
  function validateGoogleLink(value) {
    return /^https:\/\/(g\.page|search\.google\.com|www\.google\.com)\/.+/.test(value);
  }

  // 🔹 Apply Validation Feedback
  function applyValidationStyles(inputEl, isValid) {
    inputEl.classList.remove('border-green-500', 'border-red-500');

    if (!inputEl.value.trim()) return; // Don't style empty

    inputEl.classList.add(isValid ? 'border-green-500' : 'border-red-500');
  }

  // 🔹 Fetch Business ID from Public Endpoint
  async function getBusinessId() {
    try {
      const res = await fetch('/api/business/public');
      const data = await res.json();
      if (!data?.id) throw new Error('Missing business ID');
      businessId = data.id;
      return businessId;
    } catch (err) {
      console.error('❌ Failed to load business ID:', err);
    }
  }

  // 🔹 Load Existing Settings
  async function loadSettings() {
    if (!businessId) return;

    try {
      const res = await fetch(`/api/reviews/settings/${businessId}`);
      const data = await res.json();
      const settings = data.settings;

      if (!settings) return;

      if (elements.googleLink) {
        elements.googleLink.value = settings.google_review_link || '';
        applyValidationStyles(elements.googleLink, validateGoogleLink(elements.googleLink.value));
      }

      elements.enableInternal.checked = !!settings.enable_internal;
      elements.reviewDelay.value = Math.floor((settings.delay_minutes || 0) / 60);
      elements.sendEmail.checked = !!settings.send_email;
      elements.sendSms.checked = !!settings.send_sms;
    } catch (err) {
      console.error('❌ Error loading settings:', err);
    }
  }

  // 🔹 Save Settings
  async function saveSettings() {
    if (!businessId) {
      console.error('❌ Cannot save: business ID missing');
      return;
    }

    const payload = {
      business_id: businessId,
      google_review_link: elements.googleLink?.value?.trim() || '',
      enable_google: true,
      enable_internal: elements.enableInternal.checked,
      delay_minutes: parseInt(elements.reviewDelay.value || '0') * 60,
      send_email: elements.sendEmail.checked,
      send_sms: elements.sendSms.checked,
    };

    // 🔸 Validate Google URL before saving
    const isGoogleLinkValid = validateGoogleLink(payload.google_review_link);
    applyValidationStyles(elements.googleLink, isGoogleLinkValid);

    if (payload.google_review_link && !isGoogleLinkValid) {
      alert('❌ Invalid Google Review link. Please check and try again.');
      return;
    }

    try {
      const res = await fetch('/api/reviews/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Save failed');

      alert('✅ Review settings saved!');
    } catch (err) {
      console.error('❌ Error saving settings:', err);
      alert('❌ Failed to save review settings. See console.');
    }
  }

  // 🔹 Attach Real-time Validation
  if (elements.googleLink) {
    elements.googleLink.addEventListener('input', () => {
      const value = elements.googleLink.value.trim();
      applyValidationStyles(elements.googleLink, validateGoogleLink(value));
    });
  }

  // 🔹 Bind Save Button
  elements.saveBtn?.addEventListener('click', saveSettings);

  // 🔹 Init
  getBusinessId().then(loadSettings);
});
