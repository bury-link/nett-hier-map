import { parseCoordinates, type Coordinates } from './geo.js';

export function validateSubmissionWithSource(
  fields: { latitude?: string; longitude?: string },
  embeddedCoordinates: Coordinates | null,
): Coordinates & { locationSource: 'manual' | 'exif' } {
  const hasManualLatitude = (fields.latitude?.trim() ?? '') !== '';
  const hasManualLongitude = (fields.longitude?.trim() ?? '') !== '';

  if (hasManualLatitude || hasManualLongitude) {
    if (!hasManualLatitude || !hasManualLongitude) throw new Error('Both latitude and longitude are required for a manual location.');
    return { ...parseCoordinates(fields.latitude!, fields.longitude!), locationSource: 'manual' };
  }
  if (embeddedCoordinates) return { ...parseCoordinates(String(embeddedCoordinates.latitude), String(embeddedCoordinates.longitude)), locationSource: 'exif' };
  throw new Error('A location is required. Set it on the map or use a geotagged photo.');
}

export function validateSubmission(fields: { latitude?: string; longitude?: string }, embeddedCoordinates: Coordinates | null): Coordinates {
  const { locationSource: _locationSource, ...coordinates } = validateSubmissionWithSource(fields, embeddedCoordinates);
  return coordinates;
}
