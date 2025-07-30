function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `fixed bottom-6 right-6 z-50 px-4 py-2 rounded-lg shadow-lg text-sm ${
    type === 'success' ? 'bg-green-600' : 'bg-red-600'
  } text-white opacity-0 pointer-events-none transition-opacity duration-300`;

  toast.classList.remove('hidden');
  requestAnimationFrame(() => toast.classList.add('opacity-100'));

  setTimeout(() => {
    toast.classList.remove('opacity-100');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 3000);
}
