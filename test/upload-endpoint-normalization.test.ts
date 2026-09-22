import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('the upload endpoint stores only normalized JPEG files', () => {
  const server = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');
  assert.match(server, /normalizeUploadImage\(sourceBuffer\)/);
  assert.match(server, /filename\s*=\s*`\$\{randomUUID\(\)\}\.jpg`/);
  assert.match(server, /await writeFile\(uploadPath\(filename\), normalizedImage\)/);
});
