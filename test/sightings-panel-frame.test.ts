import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('latest-sightings section has its own independent frame', () => {
  const css = readFileSync(new URL('../src/public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.sightings-panel \{[^}]*border: 2px solid var\(--ink\);/);
});
