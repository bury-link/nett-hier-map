(() => {
  const KEY = 'netthier_external_services';
  const MAX_AGE = 60 * 60 * 24 * 180;
  const config = window.netthierConsentConfig || {};
  const hasConsent = () => document.cookie.split('; ').some((entry) => entry === `${KEY}=granted`);

  function loadStyle(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.append(link);
  }

  function loadScript(src, type = '') {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      if (type) script.type = type;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }

  async function enableExternalServices() {
    loadStyle('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
    loadStyle('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    try {
      await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      await loadScript(config.appScript, 'module');
      loadScript('https://www.googletagmanager.com/gtag/js?id=G-0R00EL14X2').then(() => {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', 'G-0R00EL14X2');
      }).catch(() => {});
    } catch {
      document.documentElement.classList.add('external-services-error');
    }
  }

  function showChoice() {
    if (document.getElementById('consent-dialog')) return;
    document.querySelectorAll('.consent-settings-button').forEach((button) => button.remove());
    const dialog = document.createElement('section');
    dialog.id = 'consent-dialog';
    dialog.className = 'consent-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'consent-title');
    dialog.innerHTML = `<div class="consent-card"><p class="eyebrow">DATENSCHUTZ</p><h2 id="consent-title">Externe Dienste zulassen?</h2><p>Mit Ihrer Einwilligung laden wir externe Dienste. Dabei können Daten, insbesondere Ihre IP-Adresse, an die jeweiligen Anbieter übertragen werden.</p><ul><li>OpenStreetMap für die Kartenansicht</li><li>Google Fonts für die Darstellung der Schrift</li><li>Friendly Captcha zum Schutz vor automatisierten Uploads</li><li>Google Analytics zur statistischen Auswertung der Nutzung</li></ul><p class="consent-small">Ohne Ihre Einwilligung werden keine externen Dienste geladen. Kartenansicht und Upload-Funktion können in diesem Fall nicht bereitgestellt werden.</p><div class="consent-actions"><button id="consent-accept" class="primary-button" type="button">Zustimmen</button><button id="consent-reject" class="secondary-button" type="button">Ablehnen</button></div></div>`;
    document.body.append(dialog);
    document.getElementById('consent-accept').addEventListener('click', () => {
      document.cookie = `${KEY}=granted; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax`;
      dialog.remove();
      enableExternalServices();
    });
    document.getElementById('consent-reject').addEventListener('click', () => {
      dialog.remove();
      document.documentElement.classList.add('external-services-rejected');
      const notice = document.createElement('button');
      notice.className = 'consent-settings-button';
      notice.type = 'button';
      notice.textContent = 'Externe Dienste erlauben';
      notice.addEventListener('click', showChoice);
      document.body.append(notice);
    });
  }

  if (hasConsent()) enableExternalServices();
  else showChoice();
})();
