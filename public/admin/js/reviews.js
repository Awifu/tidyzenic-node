document.addEventListener('DOMContentLoaded', () => {
  const el = {
    // Review form fields
    googleLink: document.getElementById('googleReviewLink'),
    enableGoogle: document.getElementById('enableGoogleReview'),
    enableInternal: document.getElementById('enableInternalReview'),
    reviewDelay: document.getElementById('reviewDelayHours'),
    sendEmail: document.getElementById('sendEmailReview'),
    sendSms: document.getElementById('sendSmsReview'),
    saveBtn: document.getElementById('saveReviewSettings'),

    // Template editor controls
    emailPreview: document.getElementById('emailPreview'),
    smsPreview: document.getElementById('smsPreview'),
    showEmailTemplate: document.getElementById('showEmailTemplate'),
    showSmsTemplate: document.getElementById('showSmsTemplate'),
    emailTemplateEditor: document.getElementById('emailTemplateEditor'),
    smsTemplateEditor: document.getElementById('smsTemplateEditor'),
    toggleTemplateSettings: document.getElementById('toggleTemplateSettings'),
    templateSettingsContent: document.getElementById('templateSettingsContent'),

    // Twilio modal
    smsModal: document.getElementById('smsModal'),
    closeSmsModal: document.getElementById('closeSmsModal'),
    saveTwilioBtn: document.getElementById('saveTwilioSettings'),
    twilioSid: document.getElementById('twilioSid'),
    twilioToken: document.getElementById('twilioAuthToken'),
    twilioPhone: document.getElementById('twilioPhone'),

    // Modals
    openGoogleReviewModal: document.getElementById('openGoogleReviewModal'),
    closeGoogleReviewModal: document.getElementById('closeGoogleReviewModal'),
    googleReviewModal: document.getElementById('googleReviewModal'),

    openInternalReviewModal: document.getElementById('openInternalReviewModal'),
    closeInternalReviewModal: document.getElementById('closeInternalReviewModal'),
    internalReviewModal: document.getElementById('internalReviewModal'),

    openLinkAnalyticsModal: document.getElementById('openLinkAnalyticsModal'),
    closeLinkAnalyticsModal: document.getElementById('closeLinkAnalyticsModal'),
    linkAnalyticsModal: document.getElementById('linkAnalyticsModal'),

    // Charts
    googleChart: document.getElementById('googleChart'),
    internalChart: document.getElementById('internalChart'),
    ctrChart: document.getElementById('ctrChart'),
    hourlyChart: document.getElementById('hourlyChart'),

    // Tables
    internalReviewTableBody: document.getElementById('internalReviewTableBody'),
  };

  let businessId = null;

  let chartInstances = {
    google: null,
    internal: null,
    ctr: null,
    hourly: null,
  };


    async function loadChart(ctx, type, data, options) {
    if (chartInstances[type]) chartInstances[type].destroy();
    chartInstances[type] = new Chart(ctx, { type, data, options });
  }

  async function loadGoogleAnalytics() {
    try {
      const res = await fetch(`/api/reviews/analytics/${businessId}`);
      const { analytics } = await res.json();
      if (!analytics?.length) return;

      const labels = analytics.map(a => a.label);
      const data = analytics.map(a => a.count);

      await loadChart(el.googleChart, 'bar', {
        labels,
        datasets: [{
          label: 'Google Review Ratings',
          data,
          backgroundColor: 'rgba(79, 70, 229, 0.6)',
        }]
      }, {
        responsive: true,
        plugins: { legend: { display: false } }
      });
    } catch (err) {
      console.error('❌ Failed to load Google analytics:', err);
    }
  }

  async function loadInternalReviews() {
    try {
      const res = await fetch(`/api/reviews/internal/${businessId}`);
      const { reviews } = await res.json();

      const serviceRatings = {};
      reviews.forEach(({ service_name, rating }) => {
        if (!serviceRatings[service_name]) serviceRatings[service_name] = [];
        serviceRatings[service_name].push(rating);
      });

      const labels = Object.keys(serviceRatings);
      const data = labels.map(label => {
        const ratings = serviceRatings[label];
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        return parseFloat(avg.toFixed(2));
      });

      await loadChart(el.internalChart, 'bar', {
        labels,
        datasets: [{
          label: 'Avg Rating',
          data,
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
        }]
      }, {
        responsive: true,
        scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } } },
        plugins: { legend: { display: false } }
      });

      el.internalReviewTableBody.innerHTML = '';
      reviews.slice(0, 5).forEach(r => {
        el.internalReviewTableBody.insertAdjacentHTML('beforeend', `
          <tr>
            <td class="px-4 py-3">${r.client_name}</td>
            <td class="px-4 py-3">${r.service_provider_name}</td>
            <td class="px-4 py-3">${r.rating}</td>
            <td class="px-4 py-3">${r.message || ''}</td>
            <td class="px-4 py-3">${new Date(r.created_at).toLocaleDateString()}</td>
          </tr>
        `);
      });
    } catch (err) {
      console.error('❌ Failed to load internal reviews:', err);
    }
  }

  async function loadLinkAnalytics() {
    try {
      const [ctrRes, hourlyRes] = await Promise.all([
        fetch(`/api/reviews/analytics/links/${businessId}`),
        fetch(`/api/reviews/analytics/clicks/hourly/${businessId}`)
      ]);

      const { data: ctrData } = await ctrRes.json();
      const { data: hourlyData } = await hourlyRes.json();

      const ctrLabels = ctrData.map(r => `${r.type} (${r.channel})`);
      const sent = ctrData.map(r => r.sent);
      const clicked = ctrData.map(r => r.clicked);

      await loadChart(el.ctrChart, 'bar', {
        labels: ctrLabels,
        datasets: [
          { label: 'Sent', data: sent, backgroundColor: '#e5e7eb' },
          { label: 'Clicked', data: clicked, backgroundColor: '#6366f1' }
        ]
      }, {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } }
      });

      const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      const clicks = Array(24).fill(0);
      hourlyData.forEach(({ hour, clicks: c }) => clicks[hour] = c);

      await loadChart(el.hourlyChart, 'line', {
        labels: hours,
        datasets: [{
          label: 'Clicks per Hour',
          data: clicks,
          fill: true,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(99, 102, 241, 0.4)',
          tension: 0.4
        }]
      }, {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } }
      });

    } catch (err) {
      console.error('❌ Link analytics error:', err);
    }
  }

  async function loadReviewSettings() {
    try {
      const res = await fetch(`/api/reviews/settings/${businessId}`);
      const { settings } = await res.json();
      if (!settings) return;

      el.googleLink.value = settings.google_review_link || '';
      el.enableGoogle.checked = !!settings.enable_google;
      el.enableInternal.checked = !!settings.enable_internal;
      el.reviewDelay.value = Math.floor((settings.delay_minutes || 0) / 60);
      el.sendEmail.checked = !!settings.send_email;
      el.sendSms.checked = !!settings.send_sms;

      toggleGoogleInput();
    } catch (err) {
      console.error('❌ Error loading review settings:', err);
    }
  }
async function loadTemplates() {
  try {
    const res = await fetch(`/api/templates/${businessId}`);
    const { template } = await res.json();
    if (!template) return;

    document.querySelector('#emailTemplateEditor input')?.value = template.email_subject || '';
    document.querySelector('#emailTemplateEditor textarea')?.value = template.email_body || '';
    document.querySelector('#smsTemplateEditor textarea')?.value = template.sms_body || '';
  } catch (err) {
    console.error('❌ Failed to load templates:', err);
  }
updatePreviews();

}
async function saveTemplates() {
  const emailSubject = document.querySelector('#emailTemplateEditor input')?.value.trim();
  const emailBody = document.querySelector('#emailTemplateEditor textarea')?.value.trim();
  const smsBody = document.querySelector('#smsTemplateEditor textarea')?.value.trim();

  if (!emailSubject || !emailBody) {
    alert('❌ Email subject and body are required.');
    return;
  }

  if (smsBody.length > 160) {
    alert(`❌ SMS body is too long (${smsBody.length}/160 characters).`);
    return;
  }

  try {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: businessId,
        email_subject: emailSubject,
        email_body: emailBody,
        sms_body: smsBody,
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    alert('✅ Templates saved successfully!');
  } catch (err) {
    console.error('❌ Failed to save templates:', err);
    alert('❌ Could not save templates.');
  }
}

  async function saveReviewSettings() {
    const googleLink = el.googleLink.value.trim();
    const isValidLink = !googleLink || /^https:\/\/(g\.page|search\.google\.com|www\.google\.com)\/.+/.test(googleLink);
    if (!isValidLink) return alert('❌ Invalid Google review link');

    const payload = {
      business_id: businessId,
      google_review_link: googleLink,
      enable_google: el.enableGoogle.checked,
      enable_internal: el.enableInternal.checked,
      delay_minutes: parseInt(el.reviewDelay.value || '0') * 60,
      send_email: el.sendEmail.checked,
      send_sms: el.sendSms.checked
    };

    try {
      const res = await fetch('/api/reviews/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save');
      alert('✅ Review settings saved!');
    } catch (err) {
      console.error('❌ Failed to save review settings:', err);
      alert('❌ Save failed');
    }
  }

  function toggleGoogleInput() {
    el.googleLink.disabled = !el.enableGoogle.checked;
  }

  function setupTemplateEditor() {
    const { showEmailTemplate, showSmsTemplate, emailTemplateEditor, smsTemplateEditor, toggleTemplateSettings, templateSettingsContent } = el;

    showEmailTemplate?.addEventListener('click', () => {
      emailTemplateEditor.classList.remove('hidden');
      smsTemplateEditor.classList.add('hidden');
      showEmailTemplate.classList.replace('bg-gray-100', 'bg-indigo-100');
      showEmailTemplate.classList.replace('text-gray-700', 'text-indigo-700');
      showSmsTemplate.classList.replace('bg-indigo-100', 'bg-gray-100');
      showSmsTemplate.classList.replace('text-indigo-700', 'text-gray-700');
    });

    showSmsTemplate?.addEventListener('click', () => {
      smsTemplateEditor.classList.remove('hidden');
      emailTemplateEditor.classList.add('hidden');
      showSmsTemplate.classList.replace('bg-gray-100', 'bg-indigo-100');
      showSmsTemplate.classList.replace('text-gray-700', 'text-indigo-700');
      showEmailTemplate.classList.replace('bg-indigo-100', 'bg-gray-100');
      showEmailTemplate.classList.replace('text-indigo-700', 'text-gray-700');
    });

    toggleTemplateSettings?.addEventListener('click', () => {
      templateSettingsContent.classList.toggle('hidden');
    });
  }

  function setupEventListeners() {
el.saveBtn?.addEventListener('click', async () => {
  await saveReviewSettings();
  await saveTemplates(); // ✅ Save the templates too
});
    el.enableGoogle?.addEventListener('change', toggleGoogleInput);

    el.openGoogleReviewModal?.addEventListener('click', () => {
      el.googleReviewModal.classList.remove('hidden');
      loadGoogleAnalytics();
    });

    el.closeGoogleReviewModal?.addEventListener('click', () => {
      el.googleReviewModal.classList.add('hidden');
    });

    el.openInternalReviewModal?.addEventListener('click', () => {
      el.internalReviewModal.classList.remove('hidden');
      loadInternalReviews();
    });

    el.closeInternalReviewModal?.addEventListener('click', () => {
      el.internalReviewModal.classList.add('hidden');
    });

    el.openLinkAnalyticsModal?.addEventListener('click', () => {
      el.linkAnalyticsModal.classList.remove('hidden');
      loadLinkAnalytics();
    });

    el.closeLinkAnalyticsModal?.addEventListener('click', () => {
      el.linkAnalyticsModal.classList.add('hidden');
    });

    el.sendSms?.addEventListener('change', () => {
      if (el.sendSms.checked) el.smsModal.classList.remove('hidden');
    });

    el.closeSmsModal?.addEventListener('click', () => {
      el.smsModal.classList.add('hidden');
      el.sendSms.checked = false;
    });


    el.saveTwilioBtn?.addEventListener('click', async () => {
      const sid = el.twilioSid.value.trim();
      const authToken = el.twilioToken.value.trim();
      const phone = el.twilioPhone.value.trim();
      if (!sid || !authToken || !phone) return alert('❌ Please fill in all Twilio fields.');

      try {
        const validation = await fetch('/api/sms/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ twilio_sid: sid, twilio_auth_token: authToken })
        });
        const result = await validation.json();
        if (!validation.ok || !result.valid) return alert(result.error || 'Invalid Twilio credentials');
      } catch {
        return alert('❌ Error validating Twilio credentials.');
      }

      try {
        const save = await fetch('/api/sms/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: businessId,
            twilio_sid: sid,
            twilio_auth_token: authToken,
            twilio_phone: phone
          })
        });

        const result = await save.json();
        if (!save.ok) throw new Error(result.error);
        alert('✅ Twilio credentials saved!');
        el.smsModal.classList.add('hidden');
      } catch (err) {
        console.error('❌ Save failed:', err);
        alert('❌ Could not save Twilio credentials.');
      }
    });

    setupTemplateEditor();
  }
function updatePreviews() {
  const emailSubject = document.querySelector('#emailTemplateEditor input')?.value || '';
  const emailBody = document.querySelector('#emailTemplateEditor textarea')?.value || '';
  const smsBody = document.querySelector('#smsTemplateEditor textarea')?.value || '';

  const exampleData = {
    client_name: 'Jane Doe',
    business_name: 'Zenic Spa',
    review_link: 'https://zenicspa.com/review?o=123',
  };

  const inject = (template) => {
    return template
      .replace(/{{\s*client_name\s*}}/gi, exampleData.client_name)
      .replace(/{{\s*business_name\s*}}/gi, exampleData.business_name)
      .replace(/{{\s*review_link\s*}}/gi, exampleData.review_link);
  };

  el.emailPreview.innerHTML = `📨 <strong>${inject(emailSubject)}</strong><br><br>${inject(emailBody)}`;
  el.smsPreview.innerHTML = inject(smsBody);
}

async function init() {
  await fetchBusinessId();
  if (!businessId) return;
  await loadReviewSettings();
  await loadTemplates(); // ✅ Moved here correctly
  setupEventListeners();
}

  init();
});
