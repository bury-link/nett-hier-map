// @ts-expect-error This browser-only module is copied to dist/public at build time.
import { FriendlyCaptchaSDK } from '/friendlycaptcha-sdk.js';

declare const L: any;

type Sighting = {
  id: string | number;
  latitude: number;
  longitude: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
};

type MapMarker = {
  addTo(map: unknown): MapMarker;
  bindPopup(content: string): MapMarker;
  openPopup(): MapMarker;
  setLatLng(latLng: [number, number]): MapMarker;
  on(event: string, handler: (event: { target: { getLatLng(): { lat: number; lng: number } } }) => void): MapMarker;
};

const FRIENDLY_CAPTCHA_SITE_KEY = 'FCMS82ULRDPS8F43';
const DEFAULT_CENTER: [number, number] = [48.5839, 7.7455];
const DEFAULT_ZOOM = 12;
const UPLOAD_LOCATION_ZOOM = 18;

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element #${id} fehlt.`);
  return element as T;
};

const dialog = byId<HTMLDialogElement>('upload-dialog');
const form = byId<HTMLFormElement>('upload-form');
const photoInput = byId<HTMLInputElement>('photo');
const photoLabel = byId<HTMLElement>('photo-label');
const preview = byId<HTMLElement>('image-preview');
const previewImage = preview.querySelector('img')!;
const latitudeInput = byId<HTMLInputElement>('latitude');
const longitudeInput = byId<HTMLInputElement>('longitude');
const status = byId<HTMLElement>('form-status');
const locationStatus = byId<HTMLElement>('location-status');
const useLocationButton = byId<HTMLButtonElement>('use-location-button');
const usePhotoLocationButton = byId<HTMLButtonElement>('use-photo-location-button');
const submitButton = byId<HTMLButtonElement>('submit-button');
const privacyConsent = byId<HTMLInputElement>('privacy-consent');
const captchaMount = byId<HTMLElement>('friendly-captcha');
const list = byId<HTMLElement>('sighting-list');
const count = byId<HTMLElement>('sighting-count');

const map = L.map('karte', { zoomControl: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap-Mitwirkende',
}).addTo(map);

const pickerMap = L.map('location-picker', { zoomControl: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
L.control.zoom({ position: 'bottomright' }).addTo(pickerMap);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap-Mitwirkende',
}).addTo(pickerMap);

const markerIcon = (className: string) => L.divIcon({ className: '', html: `<span class="sighting-marker ${className}" aria-hidden="true"></span>`, iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -25] });
let manualMarker: MapMarker | null = null;
let ownLocationMarker: MapMarker | null = null;
let ownLocationAccuracy: any = null;
let lastOwnLocation: [number, number] | null = null;
let manualLocationSource: 'user' | 'own' | 'photo' | null = null;
let photoLocation: [number, number] | null = null;
let captchaInitialised = false;
let captchaEventsBound = false;
let captchaCompleted = false;
let previewUrl: string | null = null;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Kürzlich eingetragen' : new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function safe(value: string): string {
  const node = document.createElement('span');
  node.textContent = value;
  return node.innerHTML;
}

function popupFor(sighting: Sighting): string {
  const detailUrl = `/fundort.html?id=${encodeURIComponent(String(sighting.id))}`;
  return `<article class="map-popup"><img src="${safe(sighting.thumbnailUrl ?? sighting.imageUrl)}" alt="Foto eines Fundorts" /><time datetime="${safe(sighting.createdAt)}">${safe(formatDate(sighting.createdAt))}</time> <a href="${detailUrl}">Mehr anzeigen <span aria-hidden="true">→</span></a></article>`;
}

function updateCount(total: number): void {
  count.textContent = total === 1 ? '1 Fundort auf der Karte' : `${total} Fundorte auf der Karte`;
}

function showEmpty(message: string, heading = 'Noch keine Fundorte'): void {
  list.replaceChildren();
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.innerHTML = `<strong>${heading}</strong><span>${message}</span>`;
  list.append(empty);
}

function addSightingCard(sighting: Sighting, marker: MapMarker): void {
  const template = byId<HTMLTemplateElement>('sighting-card-template');
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const button = fragment.querySelector<HTMLButtonElement>('button')!;
  const image = fragment.querySelector<HTMLImageElement>('img')!;
  const time = fragment.querySelector<HTMLTimeElement>('time')!;
  image.src = sighting.thumbnailUrl ?? sighting.imageUrl;
  image.alt = `Fundort vom ${formatDate(sighting.createdAt)}`;
  time.dateTime = sighting.createdAt;
  time.textContent = formatDate(sighting.createdAt);
  button.addEventListener('click', () => {
    map.setView([sighting.latitude, sighting.longitude], Math.max(map.getZoom(), 15), { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
    marker.openPopup();
    byId<HTMLElement>('karte').focus({ preventScroll: true });
  });
  list.append(fragment);
}

async function loadSightings(): Promise<void> {
  list.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/sightings', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Die Karte konnte gerade nicht geladen werden.');
    const body = await response.json() as { sightings?: Sighting[] };
    const sightings = Array.isArray(body.sightings) ? body.sightings : [];
    list.replaceChildren();
    if (!sightings.length) showEmpty('Sei der erste Mensch, der einen netten Ort einträgt.');
    sightings.forEach((sighting) => {
      const marker: MapMarker = L.marker([sighting.latitude, sighting.longitude], { icon: markerIcon('') }).addTo(map).bindPopup(popupFor(sighting));
      addSightingCard(sighting, marker);
    });
    updateCount(sightings.length);
  } catch (error) {
    showEmpty(error instanceof Error ? error.message : 'Unbekannter Fehler.', 'Karte vorübergehend nicht erreichbar');
    count.textContent = 'Fundorte derzeit nicht verfügbar';
  } finally {
    list.setAttribute('aria-busy', 'false');
  }
}

function setStatus(message = '', state: 'error' | 'success' | 'notice' | '' = ''): void {
  status.textContent = message;
  status.dataset.state = state;
}

function setLocationStatus(message = '', state: 'error' | 'success' | '' = ''): void {
  locationStatus.textContent = message;
  locationStatus.dataset.state = state;
}

function syncPickerViewport(): void {
  const center = map.getCenter();
  pickerMap.setView([center.lat, center.lng], map.getZoom(), { animate: false });
}

function showOwnLocation(latitude: number, longitude: number, accuracy: number): void {
  const point: [number, number] = [latitude, longitude];
  lastOwnLocation = point;
  if (!ownLocationMarker) {
    ownLocationMarker = L.marker(point, {
      icon: markerIcon('own-location-marker'),
      keyboard: true,
      title: 'Dein Standort',
    }).addTo(map);
  } else {
    ownLocationMarker.setLatLng(point);
  }

  if (!ownLocationAccuracy) {
    ownLocationAccuracy = L.circle(point, {
      radius: accuracy,
      color: '#000',
      weight: 2,
      fillColor: '#ffdd00',
      fillOpacity: 0.22,
      interactive: false,
    }).addTo(map);
  } else {
    ownLocationAccuracy.setLatLng(point);
    ownLocationAccuracy.setRadius(accuracy);
  }
}

function locationErrorMessage(error?: GeolocationPositionError): string {
  if (!error) return 'Dein Standort ist gerade nicht verfügbar. Du kannst die Karte weiterhin selbst verschieben.';
  if (error.code === error.PERMISSION_DENIED) return 'Standortfreigabe wurde nicht erlaubt. Du kannst die Karte weiterhin selbst verschieben.';
  if (error.code === error.TIMEOUT) return 'Die Standortabfrage hat zu lange gedauert. Versuche es bitte noch einmal.';
  return 'Dein Standort ist gerade nicht verfügbar. Du kannst die Karte weiterhin selbst verschieben.';
}

function updatePhotoLocationAction(): void {
  usePhotoLocationButton.hidden = !(photoLocation && manualLocationSource === 'user');
}

function setManualLocation(lat: number, lng: number, source: 'user' | 'own' | 'photo' = 'user'): void {
  manualLocationSource = source;
  latitudeInput.value = lat.toFixed(5);
  longitudeInput.value = lng.toFixed(5);
  if (!manualMarker) {
    const newMarker: MapMarker = L.marker([lat, lng], {
      icon: markerIcon('manual-marker'),
      draggable: true,
      keyboard: true,
      title: 'Ausgewählter Fundort',
    }).addTo(pickerMap);
    newMarker.on('dragend', (event) => {
      const position = event.target.getLatLng();
      setManualLocation(position.lat, position.lng);
    });
    manualMarker = newMarker;
  } else {
    manualMarker.setLatLng([lat, lng]);
  }
  updatePhotoLocationAction();
}

function clearManualLocation(): void {
  manualLocationSource = null;
  latitudeInput.value = '';
  longitudeInput.value = '';
  if (manualMarker) {
    pickerMap.removeLayer(manualMarker);
    manualMarker = null;
  }
  updatePhotoLocationAction();
  setStatus('Manuelle Ortsangabe entfernt. GPS-Daten im Foto bleiben möglich.');
}

function setDefaultOwnLocation(): void {
  if (manualMarker) return;
  if (lastOwnLocation) {
    pickerMap.setView(lastOwnLocation, UPLOAD_LOCATION_ZOOM);
    setManualLocation(...lastOwnLocation, 'own');
    setStatus('Dein aktueller Standort ist als Startpunkt gesetzt. Du kannst den Pin verschieben.', 'success');
    return;
  }
  if (!navigator.geolocation) return;
  setStatus('Dein Standort wird als Startpunkt ermittelt …');
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const point: [number, number] = [coords.latitude, coords.longitude];
      map.setView(point, 15);
      showOwnLocation(coords.latitude, coords.longitude, Math.max(coords.accuracy, 1));
      pickerMap.setView(point, UPLOAD_LOCATION_ZOOM);
      setManualLocation(...point, 'own');
      setStatus('Dein aktueller Standort ist als Startpunkt gesetzt. Du kannst den Pin verschieben.', 'success');
    },
    () => setStatus('Standort nicht verfügbar. Setze den Pin direkt auf der Karte.', 'error'),
    { enableHighAccuracy: true, timeout: 10_000 },
  );
}

function updateSubmitAvailability(): void {
  submitButton.disabled = !(privacyConsent.checked && captchaCompleted);
}

function ensureCaptcha(): void {
  if (captchaInitialised) return;
  if (!captchaEventsBound) {
    captchaMount.addEventListener('frc:widget.complete', () => {
      captchaCompleted = true;
      updateSubmitAvailability();
    });
    for (const eventName of ['frc:widget.expire', 'frc:widget.error', 'frc:widget.reset']) {
      captchaMount.addEventListener(eventName, () => {
        captchaCompleted = false;
        updateSubmitAvailability();
      });
    }
    captchaEventsBound = true;
  }
  const sdk = new FriendlyCaptchaSDK({ apiEndpoint: 'global' });
  sdk.createWidget({ element: captchaMount, sitekey: FRIENDLY_CAPTCHA_SITE_KEY, language: 'de' });
  captchaInitialised = true;
}

function openUpload(): void {
  if (!dialog.open) dialog.showModal();
  ensureCaptcha();
  syncPickerViewport();
  setDefaultOwnLocation();
  window.requestAnimationFrame(() => {
    pickerMap.invalidateSize();
    if (!manualMarker) syncPickerViewport();
  });
  photoInput.focus();
}

privacyConsent.addEventListener('change', updateSubmitAvailability);
updateSubmitAvailability();

document.querySelectorAll<HTMLButtonElement>('[data-open-upload]').forEach((button) => button.addEventListener('click', openUpload));
byId<HTMLButtonElement>('close-upload').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

usePhotoLocationButton.addEventListener('click', () => {
  if (!photoLocation) return;
  pickerMap.setView(photoLocation, UPLOAD_LOCATION_ZOOM);
  setManualLocation(...photoLocation, 'photo');
  setStatus('Der Standort aus dem Foto wurde für den Pin übernommen. Du kannst ihn noch verschieben.', 'success');
});
pickerMap.on('click', (event: { latlng: { lat: number; lng: number } }) => {
  setManualLocation(event.latlng.lat, event.latlng.lng);
  setStatus('Kartenpunkt gesetzt. Du kannst ihn auf der Karte noch verschieben.', 'success');
});

function requestOwnLocation(): void {
  const locateButton = byId<HTMLButtonElement>('locate-button');
  if (!navigator.geolocation) {
    setLocationStatus('Dein Browser unterstützt keine Standortfreigabe. Du kannst die Karte weiterhin selbst verschieben.', 'error');
    return;
  }
  locateButton.disabled = true;
  setLocationStatus('Standort wird ermittelt …');
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const point: [number, number] = [coords.latitude, coords.longitude];
      const accuracy = Math.max(coords.accuracy, 1);
      map.setView(point, 15);
      showOwnLocation(...point, accuracy);
      syncPickerViewport();
      setLocationStatus(`Dein Standort wird mit einer Genauigkeit von etwa ${Math.round(accuracy)} m angezeigt.`, 'success');
      locateButton.disabled = false;
    },
    (error) => {
      setLocationStatus(locationErrorMessage(error), 'error');
      locateButton.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10_000 },
  );
}

byId<HTMLButtonElement>('locate-button').addEventListener('click', requestOwnLocation);
useLocationButton.addEventListener('click', () => {
  if (!navigator.geolocation) { setStatus('Dein Browser unterstützt keine Standortfreigabe. Setze den Punkt bitte auf der Karte.', 'error'); return; }
  useLocationButton.disabled = true;
  setStatus('Standort wird ermittelt …');
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const point: [number, number] = [coords.latitude, coords.longitude];
      const accuracy = Math.max(coords.accuracy, 1);
      map.setView(point, 15);
      showOwnLocation(...point, accuracy);
      pickerMap.setView(point, UPLOAD_LOCATION_ZOOM);
      setManualLocation(...point);
      setStatus('Dein Standort wurde als Kartenpunkt gesetzt.', 'success');
      useLocationButton.disabled = false;
    },
    (error) => {
      setStatus(`${locationErrorMessage(error)} Setze den Punkt bitte auf der Karte.`, 'error');
      useLocationButton.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10_000 },
  );
});
byId<HTMLButtonElement>('reset-view').addEventListener('click', () => map.setView(DEFAULT_CENTER, DEFAULT_ZOOM));

photoInput.addEventListener('change', async () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    photoInput.value = '';
    photoLabel.textContent = 'Foto auswählen';
    setStatus('Bitte wähle eine Bilddatei aus.', 'error');
    return;
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  previewImage.src = previewUrl;
  preview.hidden = false;
  photoLabel.textContent = file.name;
  photoLocation = null;
  updatePhotoLocationAction();
  setStatus('Bilddatei ausgewählt. GPS-Daten werden geprüft …');
  try {
    const data = new FormData();
    data.set('photo', file);
    const response = await fetch('/api/photo-location', { method: 'POST', body: data });
    if (!response.ok) throw new Error();
    const location = await response.json() as { latitude: number | null; longitude: number | null };
    if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      photoLocation = [location.latitude, location.longitude];
      if (manualLocationSource !== 'user') {
        pickerMap.setView(photoLocation, UPLOAD_LOCATION_ZOOM);
        setManualLocation(...photoLocation, 'photo');
        setStatus('GPS-Daten aus dem Foto wurden für den Pin übernommen. Du kannst ihn noch verschieben.', 'success');
      } else {
        updatePhotoLocationAction();
        setStatus('GPS-Daten im Foto erkannt. Dein manuell gesetzter Pin bleibt unverändert.', 'success');
      }
    } else {
      setStatus('Keine GPS-Daten im Bild. Prüfe den Pin auf der Karte.', 'notice');
    }
  } catch {
    photoLocation = null;
    updatePhotoLocationAction();
    setStatus('GPS-Daten im Foto konnten nicht geprüft werden. Prüfe den Pin auf der Karte.', 'notice');
  }
});
byId<HTMLButtonElement>('remove-photo').addEventListener('click', () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  photoInput.value = '';
  photoLocation = null;
  updatePhotoLocationAction();
  preview.hidden = true;
  photoLabel.textContent = 'Foto auswählen';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const photo = photoInput.files?.[0];
  if (!photo) { setStatus('Wähle bitte zuerst ein Foto aus.', 'error'); photoInput.focus(); return; }
  if (!privacyConsent.checked) { setStatus('Bitte bestätige die Veröffentlichung von Foto und Standort.', 'error'); privacyConsent.focus(); return; }
  const latitude = latitudeInput.value.trim();
  const longitude = longitudeInput.value.trim();
  if ((latitude && !longitude) || (!latitude && longitude)) { setStatus('Für einen manuellen Ort sind beide Koordinaten nötig.', 'error'); return; }
  submitButton.disabled = true;
  setStatus('Fundort wird veröffentlicht …');
  try {
    const data = new FormData();
    data.set('photo', photo);
    const captchaResponse = form.querySelector<HTMLInputElement>('input[name="frc-captcha-response"]')?.value ?? '';
    data.set('frc-captcha-response', captchaResponse);
    if (latitude && longitude) { data.set('latitude', latitude); data.set('longitude', longitude); }
    const response = await fetch('/api/sightings', { method: 'POST', body: data });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error ?? 'Der Fundort konnte nicht veröffentlicht werden.');
    }
    form.reset();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    photoLocation = null;
    updatePhotoLocationAction();
    preview.hidden = true;
    photoLabel.textContent = 'Foto auswählen';
    captchaMount.replaceChildren();
    captchaInitialised = false;
    captchaCompleted = false;
    updateSubmitAvailability();
    clearManualLocation();
    setStatus('Veröffentlicht. Dein Fundort erscheint jetzt auf der Karte.', 'success');
    dialog.close();
    await loadSightings();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Der Fundort konnte nicht veröffentlicht werden.', 'error');
  } finally {
    submitButton.disabled = false;
  }
});

void loadSightings();
requestOwnLocation();
