document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const ticketId = urlParams.get('t');
  if (!ticketId) {
    return alert('Missing ticket reference.');
  }

  const starContainer = document.getElementById('starContainer');
  const commentBox = document.getElementById('reviewComment');
  const submitButton = document.getElementById('submitReview');
  const toast = document.getElementById('toast');

  let selectedRating = 0;

  // Inject stars
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.innerHTML = '⭐';
    star.classList.add('text-3xl', 'cursor-pointer', 'transition');
    star.dataset.value = i;

    star.addEventListener('click', () => {
      selectedRating = i;
      highlightStars(i);
    });

    starContainer.appendChild(star);
  }

  function highlightStars(count) {
    [...starContainer.children].forEach((star, i) => {
      star.style.opacity = i < count ? '1' : '0.3';
    });
  }

  // Branding (from subdomain)
  try {
    const res = await fetch('/api/business/public');
    const data = await res.json();

    if (data.business_name) {
      document.getElementById('businessName').textContent = data.business_name;
    }

    if (data.logo_filename) {
      const logo = document.getElementById('businessLogo');
      logo.src = `/uploads/${data.logo_filename}`;
      logo.classList.remove('hidden');
    }
  } catch (err) {
    console.warn('Branding not loaded.');
  }

  submitButton.addEventListener('click', async () => {
    const comment = commentBox.value.trim();

    if (!selectedRating) {
      return showToast('Please select a star rating.');
    }

    try {
      const res = await fetch('/api/reviews/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, rating: selectedRating, comment })
      });

      const result = await res.json();

      if (res.ok) {
        showToast('✅ Thanks for your feedback!');
        submitButton.disabled = true;
        submitButton.textContent = 'Submitted';
      } else {
        showToast(result.error || 'Submission failed.');
      }
    } catch (err) {
      showToast('Server error. Try again.');
    }
  });

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
  }
});
