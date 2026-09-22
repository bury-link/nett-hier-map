export type Coordinates = {
  latitude: number;
  longitude: number;
};

function toFiniteNumber(value: string, name: 'Latitude' | 'Longitude'): number {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${name} must be a number.`);
  }
  return number;
}

function roundForPublicMap(value: number): number {
  return Math.round(value * 100_000) / 100_000;
}

export function parseCoordinates(latitudeInput: string, longitudeInput: string): Coordinates {
  const latitude = toFiniteNumber(latitudeInput, 'Latitude');
  const longitude = toFiniteNumber(longitudeInput, 'Longitude');

  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90.');
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180.');
  }

  return {
    latitude: roundForPublicMap(latitude),
    longitude: roundForPublicMap(longitude),
  };
}
