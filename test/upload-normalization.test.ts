import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { normalizeUploadImage } from '../src/lib/thumbnail.js';

test('normalizes a raster image into a safe JPEG with a bounded pixel count', async () => {
  const input = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffdd00' } }).png().toBuffer();
  const output = await normalizeUploadImage(input);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 2);
  assert.equal(metadata.height, 2);
});

test('rejects SVG source files instead of retaining active uploaded content', async () => {
  await assert.rejects(() => normalizeUploadImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), /JPEG-, PNG- oder WebP/);
});
