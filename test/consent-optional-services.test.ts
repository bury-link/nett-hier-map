import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const publicFile = (name: string) => readFileSync(new URL(`../src/public/${name}`, import.meta.url), 'utf8');

test('necessary map and captcha services do not depend on consent while analytics does', () => {
  const consent = publicFile('consent.js');
  assert.match(consent, /function enableFonts\(\)/);
  assert.match(consent, /fonts\.googleapis\.com/);
  assert.match(consent, /if \(hasCookie\(CHOICE_KEY, 'all'\)\) enableFonts\(\)/);
  assert.match(consent, /Alle Dienste akzeptieren/);
  assert.doesNotMatch(consent, /Alle optionalen Dienste akzeptieren/);
  assert.match(consent, /function acceptAllServices\(\)/);
  assert.match(consent, /enableNecessaryServices\(\);/);
  assert.match(consent, /if \(hasAnalyticsConsent\(\)\) enableAnalytics\(\)/);
  assert.match(consent, /async function enableMapServices\(\)/);
  assert.match(consent, /function enableAnalytics\(\)/);
});
