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
  assert.equal(request?.model, 'google/gemini-2.5-flash-lite');
  assert.match(request?.messages?.[0]?.content ?? '', /ausschließlich auf Basis der bereitgestellten Daten/);
});

test('rejects LLM output that is too long or lacks a location', async () => {
  const description = await interpretLocationDescription({ address: { city: 'Zadar', country: 'Kroatien' } }, async () => new Response(JSON.stringify({ choices: [{ message: { content: 'Das ist eine sehr lange, frei erfundene Geschichte ohne einen erkennbaren Ort und ohne überprüfbare geografische Angabe, die deshalb nicht veröffentlicht werden darf.' } }] }), { status: 200 }));

  assert.equal(description, null);
});
