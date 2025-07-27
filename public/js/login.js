document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberMe = document.getElementById('rememberMe');
  const switchTrack = document.getElementById('switchTrack');
  const switchDot = document.getElementById('switchDot');
  const loginForm = document.getElementById('loginForm');

  // === UI Helpers ===
  const errorBox = document.createElement('div');
  errorBox.id = 'loginError';
  errorBox.className = 'text-sm text-red-600 mt-2 hidden';
  loginForm.prepend(errorBox);

  const showError = (message) => {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  };

  const toast = document.createElement('div');
  toast.textContent = 'Email remembered!';
  toast.className =
    'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-md opacity-0 transition-opacity duration-300 z-50';
  document.body.appendChild(toast);

  const showToast = () => {
    toast.classList.remove('opacity-0');
    toast.classList.add('opacity-100');
    setTimeout(() => toast.classList.add('opacity-0'), 2500);
  };

  const updateSwitchUI = (isChecked) => {
    switchTrack.classList.toggle('bg-blue-600', isChecked);
    switchTrack.classList.toggle('bg-gray-300', !isChecked);
    switchDot.classList.toggle('translate-x-5', isChecked);
  };

  // === Remembered Email ===
  const savedEmail = localStorage.getItem('rememberedEmail');
  if (savedEmail) {
    emailInput.value = savedEmail;
    rememberMe.checked = true;
    updateSwitchUI(true);
  } else {
    emailInput.focus();
  }

  rememberMe.addEventListener('change', () => {
    updateSwitchUI(rememberMe.checked);
  });

  // === Form Submit ===
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    errorBox.textContent = '';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('Email and password are required.');
      return;
    }

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 403 && result.error?.includes('verify')) {
          showUnverifiedPrompt(email);
        } else {
          showError(result.error || 'Login failed. Please try again.');
        }
        return;
      }

      // ✅ Remember email
      if (rememberMe.checked) {
        localStorage.setItem('rememberedEmail', email);
        showToast();
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // ✅ Redirect logic
      if (result.role === 'superadmin') {
        window.location.href = '/superadmin-dashboard.html';
      } else if (result.businessSubdomain) {
        window.location.href = `https://${result.businessSubdomain}.tidyzenic.com/admin/dashboard.html`;
      } else {
        showError('Missing business subdomain.');
      }
    } catch (err) {
      console.error('❌ Login request failed:', err);
      showError('Network error. Please try again.');
    }
  });

  // === Resend Verification ===
  function showUnverifiedPrompt(email) {
    showError('Please verify your account first.');

    const resendLink = document.createElement('button');
    resendLink.textContent = 'Resend verification link';
    resendLink.className = 'text-blue-600 text-sm mt-2 hover:underline ml-2';
    resendLink.type = 'button';

    resendLink.addEventListener('click', async () => {
      resendLink.disabled = true;
      resendLink.textContent = 'Sending...';

      try {
        const res = await fetch('/auth/resend-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (res.ok) {
          resendLink.textContent = 'Verification sent!';
          resendLink.classList.replace('text-blue-600', 'text-green-600');
        } else {
          resendLink.textContent = data.error || 'Failed to resend';
          resendLink.disabled = false;
        }
      } catch {
        resendLink.textContent = 'Network error';
        resendLink.disabled = false;
      }
    });

    errorBox.appendChild(resendLink);
  }
});
