import { parseCoordinates, type Coordinates } from './geo.js';

export function validateSubmission(
  fields: { latitude?: string; longitude?: string },
  embeddedCoordinates: Coordinates | null,
): Coordinates {
  const hasManualLatitude = (fields.latitude?.trim() ?? '') !== '';
  const hasManualLongitude = (fields.longitude?.trim() ?? '') !== '';

  if (hasManualLatitude || hasManualLongitude) {
    if (!hasManualLatitude || !hasManualLongitude) {
      throw new Error('Both latitude and longitude are required for a manual location.');
    }
    return parseCoordinates(fields.latitude!, fields.longitude!);
  }

  if (embeddedCoordinates) {
    return parseCoordinates(String(embeddedCoordinates.latitude), String(embeddedCoordinates.longitude));
  }

  throw new Error('A location is required. Set it on the map or use a geotagged photo.');
}
