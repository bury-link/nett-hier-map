import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const publicFile = (name: string) => readFileSync(new URL(`../src/public/${name}`, import.meta.url), 'utf8');

test('basic site use does not require analytics, external fonts, maps, or captcha consent', () => {
  const consent = publicFile('consent.js');
  assert.doesNotMatch(consent, /fonts\.googleapis\.com/);
  assert.match(consent, /Nur notwendige Dienste/);
  assert.match(consent, /Die Website bleibt ohne optionale Dienste nutzbar/);
  assert.match(consent, /Alle optionalen Dienste akzeptieren/);
  assert.match(consent, /Nur notwendige Dienste/);
  assert.match(consent, /function acceptAllServices\(\)/);
  assert.match(consent, /if \(hasAnalyticsConsent\(\)\) enableAnalytics\(\)/);
  assert.match(consent, /async function enableMapServices\(\)/);
  assert.match(consent, /function enableAnalytics\(\)/);
});
