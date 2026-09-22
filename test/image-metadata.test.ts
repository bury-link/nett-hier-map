import assert from 'node:assert/strict';
import test from 'node:test';
import { readEmbeddedCoordinates } from '../src/lib/image-metadata.js';

test('a non-geotagged image buffer returns no embedded coordinates', async () => {
  const image = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  assert.equal(await readEmbeddedCoordinates(image), null);
});
