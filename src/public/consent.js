(() => {
  const MAP_KEY = 'netthier_map_services';
  const ANALYTICS_KEY = 'netthier_analytics';
  const CHOICE_KEY = 'netthier_consent_choice';
  const LEGACY_KEY = 'netthier_external_services';
  const MAX_AGE = 60 * 60 * 24 * 180;
  const config = window.netthierConsentConfig || {};
  const hasCookie = (key, value = 'granted') => document.cookie.split('; ').some((entry) => entry === `${key}=${value}`);
  const hasMapConsent = () => hasCookie(MAP_KEY) || hasCookie(LEGACY_KEY);
  const hasAnalyticsConsent = () => hasCookie(ANALYTICS_KEY) || hasCookie(LEGACY_KEY);

  function setCookie(key, value) {
    document.cookie = `${key}=${value}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax`;
  }

  function deleteCookie(key) {
    document.cookie = `${key}=; Max-Age=0; Path=/; SameSite=Lax`;
  }

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

  async function enableMapServices() {
    loadStyle('/leaflet.css');
    try {
      await loadScript('/leaflet.js');
      await loadScript(config.appScript, 'module');
    } catch {
      document.documentElement.classList.add('external-services-error');
    }
  }

  function enableAnalytics() {
    loadScript('https://www.googletagmanager.com/gtag/js?id=G-0R00EL14X2').then(() => {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', 'G-0R00EL14X2');
    }).catch(() => {});
  }

  function showSettingsButton() {
    if (document.querySelector('.consent-settings-button')) return;
    const button = document.createElement('button');
    button.className = 'consent-settings-button';
    button.type = 'button';
    button.textContent = 'Datenschutz-Einstellungen';
    button.addEventListener('click', showChoice);
    document.body.append(button);
  }

  function useBasicSite() {
    setCookie(CHOICE_KEY, 'essential');
    deleteCookie(MAP_KEY);
    deleteCookie(ANALYTICS_KEY);
    deleteCookie(LEGACY_KEY);
    document.documentElement.classList.add('external-services-rejected');
    showSettingsButton();
  }

  function acceptAllServices() {
    setCookie(MAP_KEY, 'granted');
    setCookie(ANALYTICS_KEY, 'granted');
    setCookie(CHOICE_KEY, 'all');
    deleteCookie(LEGACY_KEY);
    enableMapServices();
    enableAnalytics();
    showSettingsButton();
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
    dialog.innerHTML = `<div class="consent-card"><p class="eyebrow">DATENSCHUTZ</p><h2 id="consent-title">Ihre Privatsphäre</h2><p>Die Website bleibt ohne optionale Dienste nutzbar. Wenn Sie alle optionalen Dienste akzeptieren, laden wir OpenStreetMap für die Karte, Friendly Captcha für Uploads und Meldungen sowie Google Analytics zur statistischen Auswertung.</p><p class="consent-small">Dabei können Daten, insbesondere Ihre IP-Adresse, an die jeweiligen Anbieter übertragen werden. Ohne Ihre Einwilligung werden keine optionalen Dienste geladen. Ihre Auswahl können Sie jederzeit über die Datenschutz-Einstellungen ändern oder widerrufen.</p><div class="consent-actions"><button id="consent-all" class="primary-button" type="button">Alle optionalen Dienste akzeptieren <span aria-hidden="true">✓</span></button><button id="consent-essential" class="secondary-button" type="button">Nur notwendige Dienste</button></div></div>`;
    document.body.append(dialog);
    document.getElementById('consent-all').addEventListener('click', () => {
      dialog.remove();
      acceptAllServices();
    });
    document.getElementById('consent-essential').addEventListener('click', () => {
      dialog.remove();
      useBasicSite();
    });
  }

  if (hasMapConsent()) enableMapServices();
  if (hasAnalyticsConsent()) enableAnalytics();
  if (hasCookie(CHOICE_KEY) || hasMapConsent()) showSettingsButton();
  else showChoice();
})();
