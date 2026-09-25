import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/public/app.ts', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../src/public/fundort.ts', import.meta.url), 'utf8');
const upload = readFileSync(new URL('../src/public/index.html', import.meta.url), 'utf8');

test('shows an automatic location description in map cards and the detail page', () => {
  assert.match(app, /locationDescription\?: string \| null/);
  assert.match(app, /sighting\.locationDescription/);
  assert.match(detail, /locationDescription: string \| null/);
  assert.match(detail, /sighting\.locationDescription/);
});

test('tells uploaders that OpenStreetMap generates a public place description', () => {
  assert.match(upload, /OpenStreetMap.*Ortsbeschreibung|Ortsbeschreibung.*OpenStreetMap/);
});
