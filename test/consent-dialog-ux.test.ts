import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('consent copy explains the consequence in professional language', () => {
  const consent = readFileSync(new URL('../src/public/consent.js', import.meta.url), 'utf8');
  assert.match(consent, /technisch notwendige Dienste: OpenStreetMap und Friendly Captcha/);
  assert.match(consent, /Google Analytics verwenden wir nur mit Ihrer Einwilligung/);
  assert.match(consent, /Nur notwendige Dienste/);
});

test('settings button is removed immediately after consent is granted', () => {
  const consent = readFileSync(new URL('../src/public/consent.js', import.meta.url), 'utf8');
  assert.match(consent, /document\.querySelectorAll\('\.consent-settings-button'\).*\.remove/);
});
