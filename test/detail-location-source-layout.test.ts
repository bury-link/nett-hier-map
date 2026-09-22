import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('detail page prioritizes photo and map and places reporting last', () => {
  const detail = readFileSync(new URL('../src/public/fundort.ts', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/styles.css', import.meta.url), 'utf8');
  assert.match(detail, /article\.append\(image, mapBlock, intro, report\)/);
  assert.match(detail, /GPS-Quelle:/);
  assert.match(detail, /Aus Fotodaten \(EXIF\)/);
  assert.match(detail, /Manuell auf der Karte gesetzt/);
  assert.match(css, /\.detail-image \{ grid-column: 1; grid-row: 1;/);
  assert.match(css, /\.detail-map-block \{ grid-column: 2; grid-row: 1;/);
  assert.match(css, /\.report-block \{ grid-column: 1 \/ -1; grid-row: 3;/);
});
