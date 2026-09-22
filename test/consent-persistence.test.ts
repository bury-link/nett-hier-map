import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('both consent decisions persist and suppress the dialog after reload', () => {
  const consent = readFileSync(new URL('../src/public/consent.js', import.meta.url), 'utf8');
  assert.match(consent, /setCookie\(CHOICE_KEY, 'necessary'\)/);
  assert.match(consent, /setCookie\(CHOICE_KEY, 'all'\)/);
  assert.match(consent, /const hasChoice = \(\) => hasCookie\(CHOICE_KEY, 'necessary'\) \|\| hasCookie\(CHOICE_KEY, 'all'\)/);
  assert.match(consent, /if \(hasChoice\(\)\) showSettingsButton\(\)/);
});
