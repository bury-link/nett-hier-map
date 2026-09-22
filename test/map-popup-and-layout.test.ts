import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('map popup separates its date from the detail link', () => {
  const app = readFileSync(new URL('../src/public/app.ts', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/styles.css', import.meta.url), 'utf8');
  assert.match(app, /<time[^>]*>[^<]*<\/time>\s+<a href=/);
  assert.match(css, /\.map-popup time \{[^}]*margin-bottom:/);
});

test('the gap before the latest-sightings heading is free of the old outer frame', () => {
  const css = readFileSync(new URL('../src/public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.map-layout \{[^}]*min-height: 600px; background:/);
  assert.doesNotMatch(css, /\.map-layout \{[^}]*border:/);
  assert.match(css, /\.map-frame \{[^}]*border: 2px solid var\(--ink\); border-bottom: 0;/);
});
