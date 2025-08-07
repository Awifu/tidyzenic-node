// public/admin/js/reviews.js
document.addEventListener('DOMContentLoaded', () => {
  const el = {
    // Review Settings
    googleLink: document.getElementById('googleReviewLink'),
    enableGoogle: document.getElementById('enableGoogleReview'),
    enableInternal: document.getElementById('enableInternalReview'),
    reviewDelay: document.getElementById('reviewDelayHours'),
    sendEmail: document.getElementById('sendEmailReview'),
    sendSms: document.getElementById('sendSmsReview'),
    saveBtn: document.getElementById('saveReviewSettings'),

    // Templates
    showEmailTemplate: document.getElementById('showEmailTemplate'),
    showSmsTemplate: document.getElementById('showSmsTemplate'),
    emailTemplateEditor: document.getElementById('emailTemplateEditor'),
    smsTemplateEditor: document.getElementById('smsTemplateEditor'),
    toggleTemplateSettings: document.getElementById('toggleTemplateSettings'),
    templateSettingsContent: document.getElementById('templateSettingsContent'),

    // Modals
    smsModal: document.getElementById('smsModal'),
    closeSmsModal: document.getElementById('closeSmsModal'),
    saveTwilioBtn: document.getElementById('saveTwilioSettings'),
    twilioSid: document.getElementById('twilioSid'),
    twilioToken: document.getElementById('twilioAuthToken'),
    twilioPhone: document.getElementById('twilioPhone'),
  };

  let businessId = null;

  async function fetchBusinessId() {
    try {
      const res = await fetch('/api/business/me');
      const data = await res.json();
      businessId = data.business?.id || null;
    } catch (e) {
      console.error('❌ Failed to fetch business ID');
    }
  }

  function updateTemplateToggleUI() {
    if (!el.showEmailTemplate || !el.showSmsTemplate) return;

    el.showEmailTemplate.addEventListener('click', () => {
      el.emailTemplateEditor.classList.remove('hidden');
      el.smsTemplateEditor.classList.add('hidden');
      el.showEmailTemplate.classList.add('bg-indigo-100', 'text-indigo-700');
      el.showEmailTemplate.classList.remove('bg-gray-100', 'text-gray-700');
      el.showSmsTemplate.classList.remove('bg-indigo-100', 'text-indigo-700');
      el.showSmsTemplate.classList.add('bg-gray-100', 'text-gray-700');
    });

    el.showSmsTemplate.addEventListener('click', () => {
      el.smsTemplateEditor.classList.remove('hidden');
      el.emailTemplateEditor.classList.add('hidden');
      el.showSmsTemplate.classList.add('bg-indigo-100', 'text-indigo-700');
      el.showSmsTemplate.classList.remove('bg-gray-100', 'text-gray-700');
      el.showEmailTemplate.classList.remove('bg-indigo-100', 'text-indigo-700');
      el.showEmailTemplate.classList.add('bg-gray-100', 'text-gray-700');
    });

    el.toggleTemplateSettings?.addEventListener('click', () => {
      el.templateSettingsContent?.classList.toggle('hidden');
    });
  }

  async function loadTemplates() {
    try {
      const res = await fetch(`/api/templates/${businessId}`);
      const { template } = await res.json();
      if (!template) return;

      el.emailTemplateEditor.querySelector('input').value = template.email_subject || '';
      el.emailTemplateEditor.querySelector('textarea').value = template.email_body || '';
      el.smsTemplateEditor.querySelector('textarea').value = template.sms_body || '';
    } catch (err) {
      console.error('❌ Failed to load templates:', err);
    }
  }

  function setupSmsModal() {
    el.sendSms?.addEventListener('change', () => {
      if (el.sendSms.checked) el.smsModal?.classList.remove('hidden');
    });

    el.closeSmsModal?.addEventListener('click', () => {
      el.smsModal?.classList.add('hidden');
      el.sendSms.checked = false;
    });
  }

  async function init() {
    await fetchBusinessId();
    if (!businessId) return;
    updateTemplateToggleUI();
    setupSmsModal();
    await loadTemplates();
  }

  init();
});
