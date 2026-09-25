import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('default Instagram caption links to the public Fundort page', () => {
  const server = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');
  assert.match(server, /Fundort auf der Karte:/);
  assert.match(server, /fundort\.html\?id=\$\{encodeURIComponent\(publication\.sightingId\)\}/);
});
