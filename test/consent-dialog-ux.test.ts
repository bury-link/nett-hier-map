import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('consent copy explains the consequence in professional language', () => {
  const consent = readFileSync(new URL('../src/public/consent.js', import.meta.url), 'utf8');
  assert.match(consent, /Die Website bleibt ohne optionale Dienste nutzbar/);
  assert.match(consent, /Karte und Upload stehen erst nach der gesonderten Aktivierung/);
  assert.match(consent, /Nur Website nutzen/);
});

test('settings button is removed immediately after consent is granted', () => {
  const consent = readFileSync(new URL('../src/public/consent.js', import.meta.url), 'utf8');
  assert.match(consent, /document\.querySelectorAll\('\.consent-settings-button'\).*\.remove/);
});
