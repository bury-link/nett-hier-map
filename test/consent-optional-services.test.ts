import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const publicFile = (name: string) => readFileSync(new URL(`../src/public/${name}`, import.meta.url), 'utf8');

test('basic site use does not require analytics, external fonts, maps, or captcha consent', () => {
  const consent = publicFile('consent.js');
  assert.doesNotMatch(consent, /fonts\.googleapis\.com/);
  assert.match(consent, /Nur Website nutzen/);
  assert.match(consent, /Die Website bleibt ohne optionale Dienste nutzbar/);
  assert.match(consent, /name="analytics-consent"/);
  assert.match(consent, /analyticsConsent\.checked/);
  assert.match(consent, /if \(hasAnalyticsConsent\(\)\) enableAnalytics\(\)/);
  assert.match(consent, /async function enableMapServices\(\)/);
  assert.match(consent, /function enableAnalytics\(\)/);
});
