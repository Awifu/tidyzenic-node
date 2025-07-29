document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://auth.tidyzenic.com'; // 👈 adjust if needed

  const form = document.getElementById('registerForm');
  const submitBtn = document.getElementById('submitBtn');

  const inputs = {
    businessName: document.getElementById('business_name'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    countryCode: document.getElementById('country_code'),
    subdomain: document.getElementById('subdomain'),
    password: document.getElementById('password'),
    confirmPassword: document.getElementById('confirmPassword'),
    ownerName: document.getElementById('owner_name'),
    location: document.getElementById('location'),
    vatNumber: document.getElementById('vat_number'),
    terms: document.getElementById('terms'),
  };

  const subPreview = document.getElementById('subPreview');
  const loginHint = document.getElementById('email-login-hint');

  const feedback = {
    businessName: document.getElementById('business-name-feedback'),
    email: document.getElementById('email-feedback'),
    phone: document.getElementById('phone-feedback'),
    ownerName: document.getElementById('owner-name-feedback'),
    location: document.getElementById('location-feedback'),
    subdomain: document.getElementById('subdomain-feedback'),
    password: document.getElementById('password-feedback'),
    confirmPassword: document.getElementById('confirm-password-feedback'),
    terms: document.getElementById('terms-feedback'),
  };

  function clearFeedback() {
    Object.values(feedback).forEach(el => el && (el.textContent = ''));
    if (loginHint) loginHint.innerHTML = '';
  }

  function setFeedback(field, message, isSuccess = false) {
    if (feedback[field]) {
      feedback[field].innerHTML = message;
      feedback[field].className = isSuccess ? 'text-green-600 text-sm' : 'text-red-600 text-sm';
    }
  }

  inputs.email.addEventListener('input', () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputs.email.value.trim());
    setFeedback('email', valid ? '✅ Valid email.' : '❌ Invalid email format.', valid);
    loginHint.innerHTML = '';
  });

  inputs.businessName.addEventListener('input', () => {
    const sub = inputs.businessName.value.trim().toLowerCase().replace(/\s+/g, '-');
    inputs.subdomain.value = sub;
    subPreview.textContent = `${sub}.tidyzenic.com`;
    debounceSubdomainCheck(sub);
  });

  let debounceTimeout;
  function debounceSubdomainCheck(subdomain) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => checkSubdomain(subdomain), 500);
  }

  async function checkSubdomain(sub) {
    if (!sub) return;
    try {
      const res = await fetch(`${API_BASE}/register/check-subdomain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: sub })
        // credentials: 'include', // Only needed if auth required
      });
      const data = await res.json();
      setFeedback('subdomain', data.exists ? '❌ Subdomain is already taken.' : '✅ Subdomain is available.', !data.exists);
    } catch (err) {
      console.error(err);
      setFeedback('subdomain', '❌ Could not check subdomain.');
    }
  }

  inputs.confirmPassword.addEventListener('input', () => {
    const match = inputs.password.value === inputs.confirmPassword.value;
    setFeedback('confirmPassword', match ? '✅ Passwords match.' : '❌ Passwords do not match.', match);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback();

    let hasError = false;

    if (!inputs.terms.checked) {
      setFeedback('terms', '❌ You must agree to the terms.');
      hasError = true;
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputs.email.value.trim());
    if (!emailValid) {
      setFeedback('email', '❌ Invalid email.');
      hasError = true;
    }

    if (inputs.password.value !== inputs.confirmPassword.value) {
      setFeedback('confirmPassword', '❌ Passwords do not match.');
      hasError = true;
    }

    if (hasError) return;

    const payload = {
      businessName: inputs.businessName.value.trim(),
      email: inputs.email.value.trim(),
      phone: `${inputs.countryCode.value}${inputs.phone.value.trim()}`,
      subdomain: inputs.subdomain.value.trim(),
      password: inputs.password.value.trim(),
      location: inputs.location.value.trim(),
      ownerName: inputs.ownerName.value.trim(),
      vatNumber: inputs.vatNumber.value.trim(),
    };

    submitBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
        // credentials: 'include', // Uncomment if cookie/session needs to persist
      });

      let data;
      try {
        data = await res.json();
      } catch {
        alert('❌ Unexpected server response.');
        return;
      }

      if (res.ok) {
        alert(data.message || '✅ Registration successful!');
        form.reset();
        subPreview.textContent = '__.tidyzenic.com';
        loginHint.innerHTML = '';
        window.location.href = '/login.html';
      } else {
        if (data.error?.toLowerCase().includes('email')) {
          setFeedback('email', data.error);
          if (loginHint && data.error.toLowerCase().includes('already')) {
            loginHint.innerHTML = `<a href="/login.html" class="underline hover:text-blue-800">Already registered? Log in →</a>`;
          }
        } else if (data.error?.toLowerCase().includes('subdomain')) {
          setFeedback('subdomain', data.error);
        } else {
          alert(data.error || '❌ Something went wrong.');
        }
      }
    } catch (err) {
      console.error('❌ Error:', err);
      alert('❌ Server error. Please try again later.');
    } finally {
      submitBtn.disabled = false;
    }
  });
});
