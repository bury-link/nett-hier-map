import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('original-file picker does not constrain Chrome Android to its photo picker', () => {
  const html = readFileSync(new URL('../src/public/index.html', import.meta.url), 'utf8');
  const input = html.match(/<input id="photo"[^>]*>/)?.[0] ?? '';
  assert.match(input, /type="file"/);
  assert.doesNotMatch(input, /\saccept=/);
});
