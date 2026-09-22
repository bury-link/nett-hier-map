import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('upload UI offers a photo picker backed by the device file chooser', () => {
  const html = readFileSync(new URL('../src/public/index.html', import.meta.url), 'utf8');
  assert.match(html, /Foto auswählen/);
  assert.match(html, /Öffnet die Dateiauswahl/);
});
