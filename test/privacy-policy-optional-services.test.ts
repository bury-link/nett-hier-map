import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('privacy policy identifies map and captcha as necessary and analytics as consent-based', () => {
  const policy = readFileSync(new URL('../src/public/datenschutz.html', import.meta.url), 'utf8');
  assert.match(policy, /technisch notwendige Dienste/);
  assert.match(policy, /OpenStreetMap/);
  assert.match(policy, /Friendly Captcha/);
  assert.match(policy, /Alle Dienste akzeptieren/);
  assert.doesNotMatch(policy, /optional/i);
  assert.doesNotMatch(policy, /Google Fonts/);
});
