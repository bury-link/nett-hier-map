import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');

test('publishes a freshly encoded JPEG derivative rather than legacy uploaded image bytes', () => {
  assert.match(server, /app\.get\('\/instagram-media\/:filename'/);
  assert.match(server, /sharp\(uploadPath\(filename\),[^\n]+\)\.rotate\(\)\.jpeg\(/);
  assert.match(server, /new URL\(`\/instagram-media\/\$\{encodeURIComponent\(publication\.imageFilename\)\}`/);
});
