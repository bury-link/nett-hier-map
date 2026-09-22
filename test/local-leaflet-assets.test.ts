import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('map library is served locally as a necessary application service', () => {
  const consent = readFileSync(new URL('../src/public/consent.js', import.meta.url), 'utf8');
  const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.doesNotMatch(consent, /unpkg\.com/);
  assert.match(consent, /loadStyle\('\/leaflet\.css'\)/);
  assert.match(consent, /loadScript\('\/leaflet\.js'\)/);
  assert.match(dockerfile, /node_modules\/leaflet\/dist\/leaflet\.js/);
});
