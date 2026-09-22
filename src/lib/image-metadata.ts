import exifr from 'exifr';
import type { Coordinates } from './geo.js';

export async function readEmbeddedCoordinates(image: Buffer): Promise<Coordinates | null> {
  const gps = await exifr.gps(image);
  return gps ? { latitude: gps.latitude, longitude: gps.longitude } : null;
}
