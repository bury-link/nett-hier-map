import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('publishes instructions for Meta data-deletion requests', async () => {
  const page = await readFile(new URL('../src/public/datenloeschung.html', import.meta.url), 'utf8');
  assert.match(page, /Datenlöschung/i);
  assert.match(page, /hallo-dev@bury\.link/);
  assert.match(page, /Instagram|Meta/);
});
