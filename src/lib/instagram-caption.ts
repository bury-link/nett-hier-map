type FetchImplementation = (input: string | URL, init?: RequestInit) => Promise<Response>;

const model = 'openai/gpt-5.6-luna';
const footer = 'Fund eingereicht auf nett-hier-map.de\nEntdecke weitere Fundorte über den Link in der Bio.\n\n#netthier #theländ #badenwürttemberg #stickersichtung';

function fallbackPhrase(locationDescription: string): string {
  return locationDescription.replace(/^\s*…?\s*/u, '').trim();
}

function validPhrase(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const phrase = value.trim();
  return phrase.length >= 8 && phrase.length <= 180 && !/[\r\n]/.test(phrase) && /\p{L}/u.test(phrase);
}

function compose(phrase: string): string {
  return `Nett hier.\n\n… ${fallbackPhrase(phrase)}\n\n${footer}`;
}

export async function createInstagramCaption(locationDescription: string, fetchImplementation: FetchImplementation = fetch): Promise<string> {
  const fallback = compose(locationDescription);
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return fallback;
  try {
    const response = await fetchImplementation('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://nett-hier-map.de', 'X-Title': 'Nett Hier Map' },
      body: JSON.stringify({
        model,
        temperature: 0.15,
        max_tokens: 80,
        messages: [{
          role: 'system',
          content: 'Formuliere aus der Ortsphrase eine einzige kurze deutsche Ortszeile für den Beginn einer Instagram-Caption. Gib ausschließlich eine natürliche Ortsphrase aus, die mit einer passenden Präposition oder einem Artikel beginnen kann, etwa „am Busshuttle-Halt am Flughafen Zadar in Kroatien.“ Nutze nur die Ortsphrase, erfinde nichts und gib weder Hashtags, noch Call to action, noch Anführungszeichen aus.',
        }, { role: 'user', content: locationDescription }],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return fallback;
    const body = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const phrase = body.choices?.[0]?.message?.content;
    return validPhrase(phrase) ? compose(phrase.trim()) : fallback;
  } catch {
    return fallback;
  }
}
