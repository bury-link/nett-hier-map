import assert from 'node:assert/strict';
import test from 'node:test';
import { interpretLocationDescription } from '../src/lib/location-description.js';

test('asks the LLM for a concise German location phrase grounded in reverse-geocoding data', async () => {
  let request: { model?: string; messages?: Array<{ content: string }> } | undefined;
  const description = await interpretLocationDescription({
    name: 'Zadar Flughafen Busshuttle',
    type: 'bus_stop',
    address: { village: 'Zemunik Donji', country: 'Kroatien' },
  }, async (_url, init) => {
    request = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Am Flughafen nahe Zadar, Kroatien' } }] }), { status: 200 });
  });

  assert.equal(description, 'Am Flughafen nahe Zadar, Kroatien');
  assert.equal(request?.model, 'openai/gpt-5.6-luna');
  const prompt = request?.messages?.[0]?.content ?? '';
  assert.match(prompt, /ausschließlich auf Basis der bereitgestellten Daten/);
  assert.match(prompt, /keine Füllphrasen wie „befindet sich“, „steht“ oder „ist ein“/);
  assert.match(prompt, /Keine überflüssigen Verwaltungsregionen/);
  assert.match(prompt, /Ohne Mehrwert einer Straßennennung: nur Straße, Ort und Land/);
});

test('rejects LLM output that is too long or lacks a location', async () => {
  const description = await interpretLocationDescription({ address: { city: 'Zadar', country: 'Kroatien' } }, async () => new Response(JSON.stringify({ choices: [{ message: { content: 'Das ist eine sehr lange, frei erfundene Geschichte ohne einen erkennbaren Ort und ohne überprüfbare geografische Angabe, die deshalb nicht veröffentlicht werden darf.' } }] }), { status: 200 }));

  assert.equal(description, null);
});
