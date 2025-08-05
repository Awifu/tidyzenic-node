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

  // 🔹 Get Business ID from public endpoint
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

  // 🔹 Load settings from backend
  async function loadSettings() {
    if (!businessId) return;

    try {
      const res = await fetch(`/api/reviews/settings/${businessId}`);
      const data = await res.json();
      const settings = data?.settings;
      if (!settings) return;

      elements.googleLink.value = settings.google_review_link || '';
      elements.enableInternal.checked = !!settings.enable_internal;
      elements.reviewDelay.value = Math.floor((settings.delay_minutes || 0) / 60);
      elements.sendEmail.checked = !!settings.send_email;
      elements.sendSms.checked = !!settings.send_sms;
    } catch (err) {
      console.error('❌ Error loading settings:', err);
    }
  }

  // 🔹 Save settings
  async function saveSettings() {
    if (!businessId) {
      console.error('❌ Cannot save settings: business ID is missing');
      return;
    }

    const link = elements.googleLink.value.trim();
    const isValidLink = /^https:\/\/(g\.page|search\.google\.com|www\.google\.com)\/.+/.test(link);

    if (link && !isValidLink) {
      alert('⚠️ Please enter a valid Google Review link.');
      return;
    }

    const payload = {
      business_id: businessId,
      google_review_link: link,
      enable_google: true,
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
      console.error('❌ Error saving settings:', err);
      alert('❌ Failed to save settings. Please try again.');
    }
  }

  // 🔹 Real-time validation for Google Review link
  if (elements.googleLink) {
    elements.googleLink.addEventListener('input', () => {
      const value = elements.googleLink.value.trim();
      const isValid = /^https:\/\/(g\.page|search\.google\.com|www\.google\.com)\/.+/.test(value);

      elements.googleLink.classList.remove('border-green-500', 'border-red-500');

      if (value === '') return;

      elements.googleLink.classList.add(isValid ? 'border-green-500' : 'border-red-500');
    });
  }

  // 🔹 Save button
  elements.saveBtn?.addEventListener('click', saveSettings);

  // 🔹 Init
  getBusinessId().then(loadSettings);
});
