import assert from 'node:assert/strict';
import test from 'node:test';
import { requirePublicHttpsBaseUrl } from '../src/lib/public-url.js';

test('public base URL rejects insecure and path-bearing values used by OAuth and media publishing', () => {
  assert.equal(requirePublicHttpsBaseUrl('https://nett-hier-map.de'), 'https://nett-hier-map.de');
  assert.throws(() => requirePublicHttpsBaseUrl('http://nett-hier-map.de'));
  assert.throws(() => requirePublicHttpsBaseUrl('https://nett-hier-map.de/not-allowed'));
});
