document.addEventListener('DOMContentLoaded', () => {
  const googleReviewLink = document.getElementById('googleReviewLink');
  const enableInternalReview = document.getElementById('enableInternalReview');
  const reviewDelayHours = document.getElementById('reviewDelayHours');
  const sendEmailReview = document.getElementById('sendEmailReview');
  const sendSmsReview = document.getElementById('sendSmsReview');
  const saveBtn = document.getElementById('saveReviewSettings');

  // Utility: Show toast message
  const showToast = (msg, type = 'success') => {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.className = `fixed bottom-6 right-6 px-4 py-2 rounded shadow-lg text-white text-sm z-50 transition 
      ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  };

  // Load saved settings from backend
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/reviews/settings');
      const data = await res.json();

      if (res.ok && data) {
        googleReviewLink.value = data.google_review_link || '';
        enableInternalReview.checked = data.internal_enabled || false;
        reviewDelayHours.value = data.delay_hours || '';
        sendEmailReview.checked = data.send_email || false;
        sendSmsReview.checked = data.send_sms || false;
      } else {
        throw new Error(data.error || 'Failed to load review settings.');
      }
    } catch (err) {
      console.error('❌ Error loading settings:', err);
      showToast('Failed to load review settings.', 'error');
    }
  };

  // Save settings to backend
  const saveSettings = async () => {
    const payload = {
      google_review_link: googleReviewLink.value.trim(),
      internal_enabled: enableInternalReview.checked,
      delay_hours: parseInt(reviewDelayHours.value) || 0,
      send_email: sendEmailReview.checked,
      send_sms: sendSmsReview.checked,
    };

    try {
      const res = await fetch('/api/reviews/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        showToast('✅ Review settings saved!');
      } else {
        throw new Error(data.error || 'Failed to save settings.');
      }
    } catch (err) {
      console.error('❌ Error saving settings:', err);
      showToast('Failed to save review settings.', 'error');
    }
  };

  // Event Listener
  saveBtn.addEventListener('click', saveSettings);

  // Initial Load
  loadSettings();
});
