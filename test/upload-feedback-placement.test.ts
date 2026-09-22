import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('upload feedback is placed directly below the location picker before captcha and consent', () => {
  const html = readFileSync(new URL('../src/public/index.html', import.meta.url), 'utf8');
  const status = html.indexOf('id="form-status"');
  const captcha = html.indexOf('class="captcha-section"');
  const consent = html.indexOf('class="privacy-consent"');
  const picker = html.indexOf('id="location-picker"');
  assert.ok(status > picker, 'status should follow the location picker');
  assert.ok(status < captcha, 'status should appear before captcha');
  assert.ok(status < consent, 'status should appear before consent');
});
