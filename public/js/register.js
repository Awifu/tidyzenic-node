document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://auth.tidyzenic.com';

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

  const subPreview = document.getElementById('subPreview');
  const loginHint = document.getElementById('email-login-hint');

  function setFeedback(field, message, isValid = false) {
    if (!feedback[field]) return;
    feedback[field].textContent = message;
    feedback[field].className = `${isValid ? 'text-green-600' : 'text-red-600'} text-sm`;
  }

  function clearFeedback() {
    Object.values(feedback).forEach(el => el.textContent = '');
    if (loginHint) loginHint.innerHTML = '';
  }

  // Email validation
  inputs.email.addEventListener('input', () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputs.email.value.trim());
    setFeedback('email', valid ? '✅ Valid email.' : '❌ Invalid email format.', valid);
    loginHint.innerHTML = '';
  });

  // Subdomain generation and check
  inputs.businessName.addEventListener('input', () => {
    const slug = inputs.businessName.value.trim().toLowerCase().replace(/\s+/g, '-');
    inputs.subdomain.value = slug;
    subPreview.textContent = `${slug}.tidyzenic.com`;
    debounceSubdomainCheck(slug);
  });

  let debounceTimeout;
  function debounceSubdomainCheck(sub) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => checkSubdomain(sub), 500);
  }

  async function checkSubdomain(sub) {
    if (!sub) return;
    try {
      const res = await fetch(`${API_BASE}/register/check-subdomain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: sub })
      });
      const data = await res.json();
      setFeedback('subdomain', data.exists ? '❌ Subdomain is already taken.' : '✅ Subdomain is available.', !data.exists);
    } catch {
      setFeedback('subdomain', '❌ Unable to check subdomain availability.');
    }
  }

  // Confirm password match
  inputs.confirmPassword.addEventListener('input', () => {
    const match = inputs.password.value === inputs.confirmPassword.value;
    setFeedback('confirmPassword', match ? '✅ Passwords match.' : '❌ Passwords do not match.', match);
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback();

    let hasError = false;

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputs.email.value.trim());
    if (!emailValid) {
      setFeedback('email', '❌ Invalid email.');
      hasError = true;
    }

    if (inputs.password.value !== inputs.confirmPassword.value) {
      setFeedback('confirmPassword', '❌ Passwords do not match.');
      hasError = true;
    }

    if (!inputs.terms.checked) {
      setFeedback('terms', '❌ You must agree to the terms.');
      hasError = true;
    }

    if (hasError) return;

    const payload = {
      businessName: inputs.businessName.value.trim(),
      email: inputs.email.value.trim(),
      phone: `${inputs.countryCode.value}${inputs.phone.value.trim()}`,
      subdomain: inputs.subdomain.value.trim(),
      password: inputs.password.value,
      location: inputs.location.value.trim(),
      ownerName: inputs.ownerName.value.trim(),
      vatNumber: inputs.vatNumber.value.trim(),
    };

    submitBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || '✅ Registered successfully!');
        form.reset();
        subPreview.textContent = '__.tidyzenic.com';
        loginHint.innerHTML = '';
        window.location.href = '/login.html';
      } else {
        if (data.error?.toLowerCase().includes('email')) {
          setFeedback('email', data.error);
          loginHint.innerHTML = `<a href="/login.html" class="text-blue-600 underline">Already registered? Login here →</a>`;
        } else if (data.error?.toLowerCase().includes('subdomain')) {
          setFeedback('subdomain', data.error);
        } else {
          alert(data.error || '❌ Something went wrong.');
        }
      }
    } catch (err) {
      console.error('❌ Error:', err);
      alert('❌ Server error. Try again later.');
    } finally {
      submitBtn.disabled = false;
    }
  });
});
