document.addEventListener('DOMContentLoaded', async () => {
  const businessId = window.localStorage.getItem('business_id'); // Assuming business ID is stored
  if (!businessId) return alert('Business not found. Please log in again.');

  const googleReviewLink = document.getElementById('googleReviewLink');
  const enableInternalReview = document.getElementById('enableInternalReview');
  const reviewDelayHours = document.getElementById('reviewDelayHours');
  const sendEmailReview = document.getElementById('sendEmailReview');
  const sendSmsReview = document.getElementById('sendSmsReview');
  const saveButton = document.getElementById('saveReviewSettings');

  // Load settings
  try {
    const res = await fetch(`/api/reviews/settings/${businessId}`);
    const data = await res.json();

    if (data.settings) {
      const s = data.settings;
      googleReviewLink.value = s.google_review_link || '';
      enableInternalReview.checked = !!s.enable_internal;
      reviewDelayHours.value = s.delay_minutes ? Math.round(s.delay_minutes / 60) : '';
      sendEmailReview.checked = !!s.send_email;
      sendSmsReview.checked = !!s.send_sms;
    }
  } catch (err) {
    console.error('Error loading review settings:', err);
  }

  // Save settings
  saveButton.addEventListener('click', async () => {
    const payload = {
      business_id: businessId,
      google_review_link: googleReviewLink.value.trim(),
      enable_internal: enableInternalReview.checked,
      delay_minutes: parseInt(reviewDelayHours.value) * 60 || 120,
      send_email: sendEmailReview.checked,
      send_sms: sendSmsReview.checked,
    };

    try {
      const res = await fetch('/api/reviews/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save settings');

      alert('✅ Review settings saved!');
    } catch (err) {
      console.error('Error saving review settings:', err);
      alert('❌ Failed to save settings. Please try again.');
    }
  });
});
