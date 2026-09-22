import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createThumbnail } from '../src/lib/thumbnail.js';

test('creates a small JPEG thumbnail for an uploaded image', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'nett-hier-thumbnail-'));
  const source = path.join(root, 'source.png');
  const target = path.join(root, 'thumbnail.jpg');
  await writeFile(source, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4f5cBAAS7Ad2fWq3CAAAAAElFTkSuQmCC', 'base64'));
  await createThumbnail(source, target);
  const thumbnail = await readFile(target);
  assert.equal(thumbnail.subarray(0, 2).toString('hex'), 'ffd8');
});
