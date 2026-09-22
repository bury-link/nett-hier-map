import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('consent copy explains the consequence in professional language', () => {
  const consent = readFileSync(new URL('../src/public/consent.js', import.meta.url), 'utf8');
  assert.match(consent, /Ohne Ihre Einwilligung werden keine externen Dienste geladen/);
  assert.match(consent, /Kartenansicht und Upload-Funktion können in diesem Fall nicht bereitgestellt werden/);
  assert.doesNotMatch(consent, /Karte und Upload sind dann nicht verfügbar/);
});

test('settings button is removed immediately after consent is granted', () => {
  const consent = readFileSync(new URL('../src/public/consent.js', import.meta.url), 'utf8');
  assert.match(consent, /document\.querySelectorAll\('\.consent-settings-button'\).*\.remove/);
});
