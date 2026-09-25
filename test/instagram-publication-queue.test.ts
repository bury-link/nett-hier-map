import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const database = readFileSync(new URL('../src/database.ts', import.meta.url), 'utf8');
const server = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');

test('database creates an Instagram publication queue tied to opted-in sightings', () => {
  assert.match(database, /CREATE TABLE IF NOT EXISTS instagram_publications/);
  assert.match(database, /status TEXT NOT NULL DEFAULT 'pending' CHECK \(status IN \('pending', 'approved', 'rejected', 'publishing', 'published', 'failed'\)\)/);
  assert.match(database, /sighting_id UUID PRIMARY KEY REFERENCES sightings/);
  assert.match(database, /createInstagramPublication/);
});

test('upload records Instagram consent and queues only opted-in sightings', () => {
  assert.match(database, /instagram_consent BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(server, /request\.body\.instagramConsent === 'yes'/);
  assert.match(server, /await createInstagramPublication\(database, id\)/);
});
