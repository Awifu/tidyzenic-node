document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgotForm');
  const emailInput = document.getElementById('email');
  const errorBox = document.getElementById('formError');
  const toast = document.getElementById('toast');

  const showError = (msg) => {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  };

  const showToast = (msg = 'Password reset link sent!') => {
    toast.textContent = msg;
    toast.classList.remove('opacity-0');
    toast.classList.add('opacity-100');
    setTimeout(() => {
      toast.classList.add('opacity-0');
    }, 3000);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const email = emailInput.value.trim();
    if (!email) {
      showError('Please enter your email.');
      return;
    }

    try {
      const res = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Failed to send reset link.');
      } else {
        showToast(data.message || 'Reset link sent!');
        emailInput.value = '';
      }
    } catch (err) {
      console.error('Error:', err);
      showError('Network error. Please try again.');
    }
  });
});
