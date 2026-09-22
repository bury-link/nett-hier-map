import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCoordinates } from '../src/lib/geo.js';

test('accepts valid latitude and longitude values', () => {
  assert.deepEqual(parseCoordinates('48.77585', '9.18293'), {
    latitude: 48.77585,
    longitude: 9.18293,
  });
});

test('rejects coordinates outside geographic bounds', () => {
  assert.throws(() => parseCoordinates('91', '9.18293'), /Latitude/);
  assert.throws(() => parseCoordinates('48.77585', '181'), /Longitude/);
});

test('rounds coordinates to five decimals for public storage', () => {
  assert.deepEqual(parseCoordinates('48.775852739', '9.182928384'), {
    latitude: 48.77585,
    longitude: 9.18293,
  });
});
