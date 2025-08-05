document.addEventListener('DOMContentLoaded', async () => {
  const businessId = window.localStorage.getItem('business_id');

  // Redirect if no business ID found
  if (!businessId) {
    window.location.href = '/login.html';
    return;
  }

  const googleReviewLink = document.getElementById('googleReviewLink');
  const enableInternalReview = document.getElementById('enableInternalReview');
  const reviewDelayHours = document.getElementById('reviewDelayHours');
  const sendEmailReview = document.getElementById('sendEmailReview');
  const sendSmsReview = document.getElementById('sendSmsReview');
  const saveButton = document.getElementById('saveReviewSettings');

  // Toast setup
  const toast = document.createElement('div');
  toast.className =
    'fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-sm px-4 py-2 rounded shadow-lg z-50 opacity-0 transition-opacity duration-300';
  toast.textContent = '✅ Settings saved successfully!';
  document.body.appendChild(toast);

  function showToast() {
    toast.classList.remove('opacity-0');
    toast.classList.add('opacity-100');
    setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0');
    }, 3000);
  }

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
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    const payload = {
      business_id: businessId,
      google_review_link: googleReviewLink.value.trim(),
      enable_internal: enableInternalReview.checked,
      delay_minutes: parseInt(reviewDelayHours.value || '2') * 60,
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

      showToast();
    } catch (err) {
      console.error('Error saving review settings:', err);
      alert('❌ Something went wrong. Please try again.');
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save Settings';
    }
  });
});
