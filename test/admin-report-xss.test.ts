import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('admin moderation renders untrusted report text as text rather than HTML', () => {
  const admin = readFileSync(new URL('../src/public/admin.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(admin, /innerHTML\s*=\s*`[^`]*\$\{report\.reason\}/);
  assert.match(admin, /reason\.textContent\s*=\s*report\.reason/);
});
