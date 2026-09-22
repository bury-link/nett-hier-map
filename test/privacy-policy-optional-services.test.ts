import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('privacy policy distinguishes basic site use from optional map, captcha, and analytics', () => {
  const policy = readFileSync(new URL('../src/public/datenschutz.html', import.meta.url), 'utf8');
  assert.match(policy, /ohne optionale Dienste nutzbar/);
  assert.match(policy, /OpenStreetMap/);
  assert.match(policy, /Friendly Captcha/);
  assert.match(policy, /Alle optionalen Dienste akzeptieren/);
  assert.doesNotMatch(policy, /Google Fonts/);
});
