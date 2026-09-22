import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('upload UI uses a simple photo label and has no location-clear action', () => {
  const html = readFileSync(new URL('../src/public/index.html', import.meta.url), 'utf8');
  assert.match(html, />Foto auswählen</);
  assert.doesNotMatch(html, /id="clear-pin-button"/);
  assert.doesNotMatch(html, />Auswahl löschen</);
});
