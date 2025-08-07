
// public/admin/js/reviews.js
document.addEventListener('DOMContentLoaded', async () => {
  const el = {
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

    // Reset buttons
    resetEmail: document.getElementById('resetEmailTemplate'),
    resetSms: document.getElementById('resetSmsTemplate'),

    // Previews
    emailPreview: document.getElementById('emailPreview'),
    smsPreview: document.getElementById('smsPreview'),
  };

  let businessId = null;

  async function fetchBusinessId() {
    try {
      const res = await fetch('/api/business/me');
      const data = await res.json();
      businessId = data.business?.id || null;
    } catch {
      console.error('❌ Failed to fetch business ID');
    }
  }

  function updateEmailPreview() {
    const body = el.emailTemplateEditor?.querySelector('textarea')?.value || '';
    el.emailPreview.textContent = body
      .replace(/{{customer_name}}/g, 'John Doe')
      .replace(/{{service_name}}/g, 'Window Cleaning')
      .replace(/{{review_link}}/g, 'https://example.com/review');
  }

  function updateSmsPreview() {
    const body = el.smsTemplateEditor?.querySelector('textarea')?.value || '';
    el.smsPreview.textContent = body
      .replace(/{{customer_name}}/g, 'John')
      .replace(/{{review_link}}/g, 'https://link');
  }

  function setupResetButtons() {
    const emailSubject = el.emailTemplateEditor?.querySelector('input');
    const emailBody = el.emailTemplateEditor?.querySelector('textarea');
    const smsBody = el.smsTemplateEditor?.querySelector('textarea');

    const defaultEmailSubject = "We'd love your feedback!";
    const defaultEmailBody = "Hi {{customer_name}},\n\nWe'd really appreciate your feedback on your recent service: {{review_link}}\n\nThanks!";
    const defaultSmsBody = "Hi {{customer_name}}, let us know how we did: {{review_link}}";

    el.resetEmail?.addEventListener('click', () => {
      if (!emailSubject || !emailBody) return;
      emailSubject.value = defaultEmailSubject;
      emailBody.value = defaultEmailBody;
      updateEmailPreview();
    });

    el.resetSms?.addEventListener('click', () => {
      if (!smsBody) return;
      smsBody.value = defaultSmsBody;
      updateSmsPreview();
    });

    emailBody?.addEventListener('input', updateEmailPreview);
    smsBody?.addEventListener('input', updateSmsPreview);
  }

  function updateTemplateToggleUI() {
    el.showEmailTemplate?.addEventListener('click', () => {
      el.emailTemplateEditor?.classList.remove('hidden');
      el.smsTemplateEditor?.classList.add('hidden');
      el.showEmailTemplate?.classList.add('bg-indigo-100', 'text-indigo-700');
      el.showEmailTemplate?.classList.remove('bg-gray-100', 'text-gray-700');
      el.showSmsTemplate?.classList.remove('bg-indigo-100', 'text-indigo-700');
      el.showSmsTemplate?.classList.add('bg-gray-100', 'text-gray-700');
    });

    el.showSmsTemplate?.addEventListener('click', () => {
      el.smsTemplateEditor?.classList.remove('hidden');
      el.emailTemplateEditor?.classList.add('hidden');
      el.showSmsTemplate?.classList.add('bg-indigo-100', 'text-indigo-700');
      el.showSmsTemplate?.classList.remove('bg-gray-100', 'text-gray-700');
      el.showEmailTemplate?.classList.remove('bg-indigo-100', 'text-indigo-700');
      el.showEmailTemplate?.classList.add('bg-gray-100', 'text-gray-700');
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

      const emailInput = el.emailTemplateEditor?.querySelector('input');
      const emailBody = el.emailTemplateEditor?.querySelector('textarea');
      const smsBody = el.smsTemplateEditor?.querySelector('textarea');

      if (emailInput) emailInput.value = template.email_subject || '';
      if (emailBody) emailBody.value = template.email_body || '';
      if (smsBody) smsBody.value = template.sms_body || '';

      updateEmailPreview();
      updateSmsPreview();
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
    setupResetButtons();
    setupSmsModal();
    await loadTemplates();
  }

  init();
});
