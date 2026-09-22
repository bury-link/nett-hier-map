import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const publicFile = (name: string) => readFileSync(new URL(`../src/public/${name}`, import.meta.url), 'utf8');

test('a sighting report is submitted internally instead of opening an email client', () => {
  const detail = publicFile('fundort.ts');
  assert.doesNotMatch(detail, /mailto:/);
  assert.match(detail, /fetch\('\/api\/reports'/);
  assert.match(detail, /Grund der Meldung/);
});

test('the admin interface displays open reports and allows resolving them', () => {
  const admin = publicFile('admin.ts');
  assert.match(admin, /reportCount/);
  assert.match(admin, /\/api\/admin\/reports/);
  assert.match(admin, /Meldung erledigen/);
});
