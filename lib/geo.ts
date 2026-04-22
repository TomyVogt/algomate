import { GeoLocation } from './types';
import { findSwissLocation, searchSwissLocations, SwissLocation } from './swiss-locations';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

async function geocodeQuery(query: string): Promise<GeoLocation | null> {
  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Algomate/1.0' },
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.length === 0) return null;

    const result = data[0];
    return {
      name: query.split(',')[0].trim(),
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      country: result.address?.country || '',
      state: result.address?.state,
    };
  } catch {
    return null;
  }
}

function isInSwissBounds(lat: number, lon: number): boolean {
  return lat >= 45.7 && lat <= 48.0 && lon >= 5.8 && lon <= 10.7;
}

export async function geocodeLocation(locationName: string): Promise<GeoLocation | null> {
  if (!locationName?.trim() || typeof window === 'undefined') return null;

  const queries = [
    locationName.trim() + ' Switzerland',
    locationName.trim() + ', Switzerland',
    locationName.trim() + ' BE Switzerland',
    locationName.trim() + ', BE, Switzerland',
  ];

  for (const query of queries) {
    const result = await geocodeQuery(query);
    if (!result) continue;
    if (isInSwissBounds(result.latitude, result.longitude)) {
      return result;
    }
  }

  return null;
}

function swissLocationToGeoLocation(loc: SwissLocation): GeoLocation {
  return {
    name: loc.name,
    latitude: loc.lat,
    longitude: loc.lon,
    country: 'Switzerland',
    state: loc.canton,
  };
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export async function geocodeSwissLocation(locationName: string): Promise<GeoLocation | null> {
  const local = findSwissLocation(locationName);
  if (local) return swissLocationToGeoLocation(local);
  const fallback = await geocodeLocation(locationName);
  if (fallback && isInSwissBounds(fallback.latitude, fallback.longitude)) return fallback;
  return null;
}

export { searchSwissLocations };

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}