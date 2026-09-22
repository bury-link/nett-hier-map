import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('consent dialog prioritizes accepting all optional services without removing the necessary-only option', () => {
  const consent = readFileSync(new URL('../src/public/consent.js', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/public/styles.css', import.meta.url), 'utf8');
  assert.match(consent, /id="consent-all" class="primary-button"/);
  assert.match(consent, /id="consent-essential" class="secondary-button"/);
  assert.match(consent, /Alle optionalen Dienste akzeptieren/);
  assert.match(consent, /Nur notwendige Dienste/);
  assert.match(styles, /\.consent-actions \{ display: flex; flex-direction: column/);
});
