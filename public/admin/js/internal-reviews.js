document.addEventListener('DOMContentLoaded', async () => {
  const businessId = localStorage.getItem('business_id');
  const container = document.getElementById('reviewsContainer');
  const noReviews = document.getElementById('noReviews');

  if (!businessId) return;

  try {
    const res = await fetch(`/api/reviews/internal/${businessId}`);
    const data = await res.json();

    if (!res.ok || !data.reviews || data.reviews.length === 0) {
      noReviews.classList.remove('hidden');
      return;
    }

    data.reviews.forEach(review => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-2xl shadow p-5 space-y-2';

      const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      const submittedAt = new Date(review.created_at).toLocaleString();

      card.innerHTML = `
        <div class="text-yellow-500 font-semibold text-lg">${stars}</div>
        <div class="text-sm text-gray-700">${review.comment || '(No comment)'}</div>
        <div class="text-xs text-gray-400">Ticket ID: ${review.ticket_id}</div>
        <div class="text-xs text-gray-400">Submitted: ${submittedAt}</div>
      `;

      container.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load internal reviews:', err);
    noReviews.classList.remove('hidden');
  }
});
