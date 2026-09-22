import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const publicFile = (name: string) => readFileSync(new URL(`../src/public/${name}`, import.meta.url), 'utf8');

test('third-party resources are deferred behind explicit consent on all public pages', () => {
  for (const page of ['index.html', 'fundort.html']) {
    const html = publicFile(page);
    assert.match(html, /src="\/consent\.js"/);
    assert.doesNotMatch(html, /https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com|www\.googletagmanager\.com)/);
  }
  const consent = publicFile('consent.js');
  assert.match(consent, /netthier_external_services/);
  assert.match(consent, /G-0R00EL14X2/);
  assert.match(consent, /Friendly Captcha/);
  assert.match(consent, /if \(hasConsent\(\)\) enableExternalServices\(\)/);
});
