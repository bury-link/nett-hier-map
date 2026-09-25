import assert from 'node:assert/strict';
import test from 'node:test';
import { createInstagramCaption } from '../src/lib/instagram-caption.js';

test('creates a concise Instagram caption from the generated location phrase', async () => {
  let request: { model?: string; messages?: Array<{ content: string }> } | undefined;
  const caption = await createInstagramCaption('Busshuttle-Halt am Flughafen Zadar in Kroatien.', async (_url, init) => {
    request = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: 'am Busshuttle-Halt am Flughafen Zadar in Kroatien.' } }] }), { status: 200 });
  });

  assert.equal(caption, 'Nett hier.\n\n… am Busshuttle-Halt am Flughafen Zadar in Kroatien.\n\nFund eingereicht auf nett-hier-map.de\nEntdecke weitere Fundorte über den Link in der Bio.\n\n#netthier #theländ #badenwürttemberg #stickersichtung');
  assert.equal(request?.model, 'openai/gpt-5.6-luna');
  assert.match(request?.messages?.[0]?.content ?? '', /Ortsphrase/);
});

test('falls back to the stored location description when caption wording cannot be generated', async () => {
  const caption = await createInstagramCaption('Montée de Clausen in Clausen, Luxemburg.', async () => new Response('{}', { status: 503 }));
  assert.match(caption, /… Montée de Clausen in Clausen, Luxemburg\./);
  assert.match(caption, /#netthier #theländ #badenwürttemberg #stickersichtung/);
});
