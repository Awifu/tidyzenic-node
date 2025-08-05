document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const ticketId = urlParams.get('t');
  if (!ticketId) return alert('Invalid review link');

  const ratingContainer = document.getElementById('ratingContainer');
  const comment = document.getElementById('comment');
  const submitBtn = document.getElementById('submitReview');
  const successMessage = document.getElementById('successMessage');

  let selectedRating = 0;

  // Render 5 stars
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'text-3xl cursor-pointer text-gray-300 hover:text-yellow-400';
    star.innerHTML = '★';
    star.dataset.value = i;

    star.addEventListener('click', () => {
      selectedRating = i;
      [...ratingContainer.children].forEach((s, idx) => {
        s.classList.toggle('text-yellow-400', idx < i);
        s.classList.toggle('text-gray-300', idx >= i);
      });
    });

    ratingContainer.appendChild(star);
  }

  submitBtn.addEventListener('click', async () => {
    if (selectedRating === 0) return alert('Please select a rating.');
    const message = comment.value.trim();

    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, rating: selectedRating, comment: message })
      });

      if (!res.ok) throw new Error('Submission failed');

      successMessage.classList.remove('hidden');
      submitBtn.disabled = true;
      comment.disabled = true;
    } catch (err) {
      console.error(err);
      alert('❌ Failed to submit review. Try again later.');
    }
  });
});
