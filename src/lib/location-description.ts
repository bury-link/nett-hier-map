export type ReverseGeocodeResult = {
  name?: string;
  category?: string;
  type?: string;
  address?: Record<string, string | undefined>;
};

type FetchImplementation = (input: string | URL, init?: RequestInit) => Promise<Response>;
const locationModel = 'google/gemini-2.5-flash-lite';

const settlementKeys = ['city', 'town', 'village', 'municipality', 'county'] as const;
const featureLabels: Record<string, { preposition: string; label: string }> = {
  aerodrome: { preposition: 'am', label: 'Flughafen' },
  airport: { preposition: 'am', label: 'Flughafen' },
  station: { preposition: 'am', label: 'Bahnhof' },
  railway_station: { preposition: 'am', label: 'Bahnhof' },
  beach: { preposition: 'am', label: 'Strand' },
  island: { preposition: 'auf der', label: 'Insel' },
  peak: { preposition: 'auf dem', label: 'Gipfel' },
  viewpoint: { preposition: 'am', label: 'Aussichtspunkt' },
};

function settlement(address: Record<string, string | undefined>): string | null {
  for (const key of settlementKeys) {
    const value = address[key]?.trim();
    if (value) return value;
  }
  return null;
}

function airportCity(name: string): string | null {
  const match = name.match(/^(.+?)\s+(?:Flughafen|Airport)\b/i);
  return match?.[1]?.trim() || null;
}

export function formatLocationDescription(result: ReverseGeocodeResult): string | null {
  const address = result.address ?? {};
  const country = address.country?.trim();
  let place = settlement(address);
  if (!country || !place) return null;

  const name = result.name?.trim();
  const type = result.type?.toLowerCase();
  const isAirport = type === 'aerodrome' || type === 'airport' || Boolean(name && /\b(flug(hafen)?|airport)\b/i.test(name));
  if (isAirport) {
    place = name ? airportCity(name) ?? place : place;
    return `am Flughafen in ${place}, ${country}`;
  }

  const feature = type ? featureLabels[type] : undefined;
  if (feature) return `${feature.preposition} ${feature.label} in ${place}, ${country}`;
  if (name && name.toLocaleLowerCase('de-DE') !== place.toLocaleLowerCase('de-DE')) return `bei ${name} in ${place}, ${country}`;
  return `in ${place}, ${country}`;
}

function validLlmDescription(value: unknown, result: ReverseGeocodeResult): value is string {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  if (normalized.length < 8 || normalized.length > 180 || /[\r\n]/.test(normalized) || !/\p{L}/u.test(normalized)) return false;
  const address = result.address ?? {};
  const evidence = [settlement(address), address.country?.trim(), result.name?.trim(), result.name ? airportCity(result.name) : null]
    .filter((item): item is string => Boolean(item && item.length >= 3))
    .map((item) => item.toLocaleLowerCase('de-DE'));
  return evidence.some((item) => normalized.toLocaleLowerCase('de-DE').includes(item));
}

export async function interpretLocationDescription(result: ReverseGeocodeResult, fetchImplementation: FetchImplementation = fetch): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const response = await fetchImplementation('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://nett-hier-map.de', 'X-Title': 'Nett Hier Map' },
    body: JSON.stringify({
      model: locationModel,
      temperature: 0.35,
      max_tokens: 70,
      messages: [{
        role: 'system',
        content: 'Formuliere eine kurze, lebendige deutsche Ortsbeschreibung für ein Foto. Nutze ausschließlich auf Basis der bereitgestellten Daten. Erfinde keine Sehenswürdigkeiten, Aktivitäten, Menschen oder Details. Gib genau einen neutralen Satz ohne Anführungszeichen aus, maximal 180 Zeichen.',
      }, {
        role: 'user',
        content: JSON.stringify(result),
      }],
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;
  const body = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const description = body.choices?.[0]?.message?.content;
  return validLlmDescription(description, result) ? description.trim() : null;
}

export type LocationDescription = { value: string; interpreted: boolean };

export async function resolveLocationDescription(latitude: number, longitude: number, baseUrl = 'https://nominatim.openstreetmap.org'): Promise<LocationDescription | null> {
  const url = new URL('/reverse', baseUrl);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'de');
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'nett-hier-map/1.0 (contact: nettHier-meldung@bury.link)' },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) return null;
  const result = await response.json() as ReverseGeocodeResult;
  const interpreted = await interpretLocationDescription(result);
  if (interpreted) return { value: interpreted, interpreted: true };
  const fallback = formatLocationDescription(result);
  return fallback ? { value: fallback, interpreted: false } : null;
}
