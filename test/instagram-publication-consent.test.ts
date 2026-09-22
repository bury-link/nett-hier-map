import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('privacy notice covers website and associated Instagram publication', () => {
  const policy = readFileSync(new URL('../src/public/datenschutz.html', import.meta.url), 'utf8');
  assert.match(policy, /Foto und zugehöriger Standort werden auf dieser Website und dem zugehörigen Instagram-Konto veröffentlicht/);
});
