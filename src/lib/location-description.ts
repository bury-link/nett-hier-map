export type ReverseGeocodeResult = {
  name?: string;
  category?: string;
  type?: string;
  address?: Record<string, string | undefined>;
};

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

export async function resolveLocationDescription(latitude: number, longitude: number, baseUrl = 'https://nominatim.openstreetmap.org'): Promise<string | null> {
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
  return formatLocationDescription(await response.json() as ReverseGeocodeResult);
}
