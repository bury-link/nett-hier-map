import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const database = readFileSync(new URL('../src/database.ts', import.meta.url), 'utf8');
const server = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');

test('stores a nullable generated location description and returns it to public clients', () => {
  assert.match(database, /location_description TEXT/);
  assert.match(database, /locationDescription: string \| null/);
  assert.match(database, /locationDescription: row\.location_description/);
});

test('generates descriptions asynchronously for new and existing sightings', () => {
  assert.match(server, /queueLocationDescription\(id, coordinates\.latitude, coordinates\.longitude\)/);
  assert.match(server, /backfillMissingLocationDescriptions\(\)/);
});
