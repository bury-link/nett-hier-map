import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('upload location UI uses concise GPS guidance without showing coordinates', () => {
  const html = readFileSync(new URL('../src/public/index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../src/public/app.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /Öffnet die Dateiauswahl/);
  assert.match(html, /GPS aus dem Foto oder setze den Pin manuell\./);
  assert.match(html, /GPS-Daten können ungenau sein\. Prüfe den Kartenpunkt vor der Veröffentlichung\./);
  assert.doesNotMatch(html, /id="location-summary"/);
  assert.doesNotMatch(app, /Punkt gewählt: \$\{lat\.toFixed\(5\)\}/);
});
