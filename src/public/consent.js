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

  function showChoice() {
    if (document.getElementById('consent-dialog')) return;
    document.querySelectorAll('.consent-settings-button').forEach((button) => button.remove());
    const dialog = document.createElement('section');
    dialog.id = 'consent-dialog';
    dialog.className = 'consent-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'consent-title');
    dialog.innerHTML = `<div class="consent-card"><p class="eyebrow">DATENSCHUTZ</p><h2 id="consent-title">Ihre Auswahl</h2><p>Die Website bleibt ohne optionale Dienste nutzbar. Dafür werden weder Google Analytics noch externe Schriftarten geladen.</p><p>Für die interaktive Karte und das Veröffentlichen eines Fundorts benötigen wir Ihre Einwilligung, um OpenStreetMap und Friendly Captcha zu laden. Dabei können Daten, insbesondere Ihre IP-Adresse, an die jeweiligen Anbieter übertragen werden.</p><label class="analytics-choice"><input id="analytics-consent" name="analytics-consent" type="checkbox" ${hasAnalyticsConsent() ? 'checked' : ''} /> <span>Google Analytics zur anonymisierten statistischen Auswertung aktivieren (optional)</span></label><p class="consent-small">Sie können die Website ohne diese Dienste nutzen. Karte und Upload stehen erst nach der gesonderten Aktivierung der dafür erforderlichen Dienste zur Verfügung. Ihre Auswahl können Sie jederzeit über die Datenschutz-Einstellungen ändern oder widerrufen.</p><div class="consent-actions"><button id="consent-map" class="primary-button" type="button">Karte und Upload aktivieren</button><button id="consent-essential" class="secondary-button" type="button">Nur Website nutzen</button></div></div>`;
    document.body.append(dialog);
    const analyticsConsent = document.getElementById('analytics-consent');
    document.getElementById('consent-map').addEventListener('click', () => {
      setCookie(MAP_KEY, 'granted');
      setCookie(CHOICE_KEY, 'map');
      deleteCookie(LEGACY_KEY);
      if (analyticsConsent.checked) setCookie(ANALYTICS_KEY, 'granted');
      else deleteCookie(ANALYTICS_KEY);
      dialog.remove();
      enableMapServices();
      if (analyticsConsent.checked) enableAnalytics();
      showSettingsButton();
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
