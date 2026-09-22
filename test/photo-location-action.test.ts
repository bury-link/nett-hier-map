import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('upload UI offers the detected photo location after a manually positioned pin', () => {
  const html = readFileSync(new URL('../src/public/index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../src/public/app.ts', import.meta.url), 'utf8');
  assert.match(html, /id="use-photo-location-button"/);
  assert.match(html, />Foto-Standort verwenden</);
  assert.match(app, /photoLocation/);
  assert.match(app, /updatePhotoLocationAction/);
});

test('photo picker has no redundant file-selection explanation', () => {
  const html = readFileSync(new URL('../src/public/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /Öffnet die Dateiauswahl/);
  assert.doesNotMatch(html, /DCIM\/Camera/);
});
