import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('publish action stays disabled until privacy consent and captcha completion', () => {
  const html = readFileSync(new URL('../src/public/index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../src/public/app.ts', import.meta.url), 'utf8');
  assert.match(html, /id="submit-button"[^>]*disabled/);
  assert.match(app, /function updateSubmitAvailability/);
  assert.match(app, /privacyConsent\.addEventListener\('change', updateSubmitAvailability\)/);
  assert.match(app, /frc:widget\.complete/);
  assert.match(app, /frc:widget\.(?:expire|error|reset)/);
});

test('footer links to internal legal pages', () => {
  const html = readFileSync(new URL('../src/public/index.html', import.meta.url), 'utf8');
  assert.match(html, /href="\/datenschutz\.html"/);
  assert.match(html, /href="\/impressum\.html"/);
});
