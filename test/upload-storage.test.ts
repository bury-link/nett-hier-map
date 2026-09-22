import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { persistUploadedFile } from '../src/lib/upload-storage.js';

test('persists an uploaded file by copying across filesystem boundaries', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'nett-hier-storage-'));
  const source = path.join(root, 'temporary-upload');
  const target = path.join(root, 'uploads', 'sighting.png');
  await writeFile(source, 'image bytes');
  await persistUploadedFile(source, target);
  assert.equal((await readFile(target)).toString(), 'image bytes');
});
