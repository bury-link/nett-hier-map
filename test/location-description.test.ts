import assert from 'node:assert/strict';
import test from 'node:test';
import { formatLocationDescription } from '../src/lib/location-description.js';

test('formats a named airport shuttle as an airport location in German', () => {
  const description = formatLocationDescription({
    name: 'Zadar Flughafen Busshuttle',
    type: 'bus_stop',
    address: { village: 'Zemunik Donji', country: 'Kroatien' },
  });

  assert.equal(description, 'am Flughafen in Zadar, Kroatien');
});

test('formats a regular location with the most specific settlement and country', () => {
  const description = formatLocationDescription({
    address: { village: 'Valun', country: 'Kroatien' },
  });

  assert.equal(description, 'in Valun, Kroatien');
});

test('returns null when the geocoder cannot identify a settlement', () => {
  assert.equal(formatLocationDescription({ address: { country: 'Deutschland' } }), null);
});
