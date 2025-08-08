// 📄 /public/admin/js/translation.js

document.addEventListener("DOMContentLoaded", function () {
  const languageSelect = document.getElementById("languageSelect");

  if (!languageSelect) return;

  languageSelect.addEventListener("change", async function () {
    const selectedLang = languageSelect.value;

    try {
      const res = await fetch("/admin/set-language", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language: selectedLang }),
      });

      if (res.ok) {
        alert("🌐 Language preference saved. Reloading...");
        window.location.reload();
      } else {
        const errorData = await res.json();
        alert("❌ Error saving language: " + (errorData.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Language save failed:", err);
      alert("❌ Network error while saving language");
    }
  });
});
