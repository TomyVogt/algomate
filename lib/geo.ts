import { GeoLocation } from './types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function geocodeLocation(locationName: string): Promise<GeoLocation | null> {
  if (!locationName || typeof window === 'undefined') return null;

  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(locationName + ', Switzerland')}&format=json&limit=1&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Algomate/1.0' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.length === 0) return null;

    const result = data[0];
    return {
      name: locationName,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      country: result.address?.country || 'Switzerland',
      state: result.address?.state,
    };
  } catch {
    return null;
  }
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
  const result = await geocodeLocation(locationName);
  if (!result) return null;

  if (result.country !== 'Switzerland' && !result.name.toLowerCase().includes('switzerland')) {
    return null;
  }

  return result;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}