// @ts-expect-error This browser-only module is copied to dist/public at build time.
import { FriendlyCaptchaSDK } from '/friendlycaptcha-sdk.js';
declare const L: any;
type LocationSource = 'manual' | 'exif' | 'unknown';
type Sighting = { id: string; latitude: number; longitude: number; locationSource: LocationSource; imageUrl: string; createdAt: string };
const root = document.getElementById('sighting-detail')!;
const FRIENDLY_CAPTCHA_SITE_KEY = 'FCMS82ULRDPS8F43';
const id = new URLSearchParams(window.location.search).get('id');
function formatDate(value: string): string { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value)); }
function locationSourceLabel(source: LocationSource): string { if (source === 'exif') return 'Aus Fotodaten (EXIF)'; if (source === 'manual') return 'Manuell auf der Karte gesetzt'; return 'Für diesen älteren Eintrag nicht gespeichert'; }
function showError(message: string): void { root.replaceChildren(); const section = document.createElement('section'); section.className = 'detail-error'; section.innerHTML = `<p class="eyebrow">FUNDORT NICHT GEFUNDEN</p><h1>${message}</h1><a class="primary-button" href="/">Zur Karte <span aria-hidden="true">→</span></a>`; root.append(section); }
function createReportForm(sightingId: string): HTMLFormElement {
  const form = document.createElement('form'); form.className = 'report-form';
  form.innerHTML = `<label for="report-reason">Grund der Meldung</label><textarea id="report-reason" name="reason" minlength="5" maxlength="1000" required placeholder="Zum Beispiel: Das Foto zeigt keinen Nett-hier-Sticker oder der Fundort ist nicht mehr sichtbar."></textarea><p>Die Meldung wird intern zur Prüfung gespeichert. Bitte keine personenbezogenen Daten eintragen.</p><div class="report-captcha" aria-live="polite"></div><p class="report-status" role="status"></p><button class="primary-button" type="submit" disabled>Meldung senden <span aria-hidden="true">→</span></button>`;
  const captchaMount = form.querySelector<HTMLElement>('.report-captcha')!;
  let captchaResponse = '';
  const submit = form.querySelector<HTMLButtonElement>('button')!;
  captchaMount.addEventListener('frc:widget.complete', () => { captchaResponse = captchaMount.querySelector<HTMLInputElement>('input[name="frc-captcha-response"]')?.value ?? ''; submit.disabled = !captchaResponse; });
  for (const eventName of ['frc:widget.expire', 'frc:widget.error', 'frc:widget.reset']) captchaMount.addEventListener(eventName, () => { captchaResponse = ''; submit.disabled = true; });
  new FriendlyCaptchaSDK({ apiEndpoint: 'global' }).createWidget({ element: captchaMount, sitekey: FRIENDLY_CAPTCHA_SITE_KEY, language: 'de' });
  form.addEventListener('submit', async (event) => { event.preventDefault(); const status = form.querySelector<HTMLElement>('.report-status')!; const button = form.querySelector<HTMLButtonElement>('button')!; button.disabled = true; status.textContent = 'Meldung wird gesendet …'; try { const response = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sightingId, reason: new FormData(form).get('reason'), captchaResponse }) }); const body = await response.json().catch(() => ({})) as { error?: string }; if (!response.ok) throw new Error(body.error ?? 'Die Meldung konnte nicht gespeichert werden.'); form.replaceChildren(); form.textContent = 'Vielen Dank. Die Meldung wurde zur Prüfung gespeichert.'; } catch (error) { status.textContent = error instanceof Error ? error.message : 'Die Meldung konnte nicht gespeichert werden.'; button.disabled = false; } });
  return form;
}
async function loadDetail(): Promise<void> {
  if (!id) return showError('Dieser Fundort ist nicht verfügbar.');
  try { const response = await fetch('/api/sightings', { headers: { Accept: 'application/json' } }); if (!response.ok) throw new Error(); const body = await response.json() as { sightings?: Sighting[] }; const sighting = body.sightings?.find((item) => item.id === id); if (!sighting) return showError('Dieser Fundort wurde entfernt oder existiert nicht.');
    root.replaceChildren(); const article = document.createElement('article'); article.className = 'detail-card'; const intro = document.createElement('div'); intro.className = 'detail-intro'; intro.innerHTML = '<p class="eyebrow">NETT-HIER-FUNDORT</p><h1>Ein Sticker,<br />ein Fundort.</h1>'; const date = document.createElement('time'); date.dateTime = sighting.createdAt; date.textContent = `Eingetragen am ${formatDate(sighting.createdAt)}`; const source = document.createElement('p'); source.className = 'location-source'; source.textContent = `GPS-Quelle: ${locationSourceLabel(sighting.locationSource)}`; intro.append(date, source);
    const image = document.createElement('img'); image.className = 'detail-image'; image.src = sighting.imageUrl; image.alt = 'Foto eines Nett-hier-Fundorts'; const mapBlock = document.createElement('section'); mapBlock.className = 'detail-map-block'; mapBlock.innerHTML = '<h2>Fundort auf der Karte</h2><div id="detail-map" aria-label="Karte des Fundorts"></div>';
    const report = document.createElement('section'); report.className = 'report-block'; report.innerHTML = '<h2>Fundort melden</h2><p>Hinweise auf unzutreffende oder problematische Einträge werden von uns geprüft.</p>'; report.append(createReportForm(sighting.id)); article.append(image, mapBlock, intro, report); root.append(article);
    const map = L.map('detail-map', { zoomControl: false, attributionControl: true }).setView([sighting.latitude, sighting.longitude], 18); L.control.zoom({ position: 'bottomright' }).addTo(map); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap-Mitwirkende' }).addTo(map); L.circleMarker([sighting.latitude, sighting.longitude], { radius: 11, color: '#000', weight: 2, fillColor: '#ffdd00', fillOpacity: 1 }).addTo(map);
  } catch { showError('Der Fundort konnte gerade nicht geladen werden.'); }
}
void loadDetail();
