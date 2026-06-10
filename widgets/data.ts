import * as Location from 'expo-location';
import { VICE_CATEGORIES } from '../constants/vices';
import { fromVice, toPlacesQuery } from '../lib/searchConfig';
import { nearbySearch } from '../lib/placesApi';
import { bearingBetween, distanceBetween } from '../lib/bearing';
import type { ViceId } from '../types';
import type { CompassCache } from './storage';
import { getPhoneHeading } from './getPhoneHeading';

export async function fetchCompassData(viceId: ViceId): Promise<CompassCache | null> {
  const vice = VICE_CATEGORIES.find((v) => v.id === viceId);
  if (!vice) return null;

  const perm = await Location.getForegroundPermissionsAsync();
  if (perm.status !== 'granted') return null;

  let loc: Location.LocationObject;
  try {
    loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    return null;
  }

  const cfg = fromVice(vice);
  const args = toPlacesQuery(cfg, { maxResults: 5 });

  // Capture the phone heading in parallel with the places lookup — sensors
  // need ~150ms to stabilize, network call is ~500–1500ms, so running them
  // together hides the sensor read inside the network latency.
  const headingPromise = getPhoneHeading();

  let raw;
  try {
    raw = await nearbySearch({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      ...args,
    });
  } catch {
    return null;
  }

  if (!raw || raw.length === 0) return null;

  let best = null as null | {
    name: string;
    address: string;
    lat: number;
    lng: number;
    bearing: number;
    distance: number;
  };
  for (const p of raw) {
    const distance = distanceBetween(loc.coords.latitude, loc.coords.longitude, p.lat, p.lng);
    if (!best || distance < best.distance) {
      best = {
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        distance,
        bearing: bearingBetween(loc.coords.latitude, loc.coords.longitude, p.lat, p.lng),
      };
    }
  }
  if (!best) return null;

  const phoneHeading = await headingPromise;

  return {
    placeName: best.name,
    placeAddress: best.address,
    placeLat: best.lat,
    placeLng: best.lng,
    bearing: best.bearing,
    phoneHeading,
    distanceMeters: best.distance,
    updatedAt: Date.now(),
  };
}

// Fast path: re-aim the needle using the existing cached place. Skips the
// places-proxy network call and the slow GPS fix. Total wall time ≈ the
// heading capture (~150ms) plus a last-known-location read (instant).
//
// Returns null if we don't have the data we need (no cached place coords,
// no last-known location, sensor failure).
export async function fastRefreshHeading(
  prev: CompassCache,
): Promise<CompassCache | null> {
  const perm = await Location.getForegroundPermissionsAsync();
  if (perm.status !== 'granted') return null;

  let last;
  try {
    last = await Location.getLastKnownPositionAsync({
      maxAge: 60 * 1000,
      requiredAccuracy: 200,
    });
  } catch {
    return null;
  }
  if (!last) return null;

  const phoneHeading = await getPhoneHeading();

  const distance = distanceBetween(
    last.coords.latitude,
    last.coords.longitude,
    prev.placeLat,
    prev.placeLng,
  );
  const bearing = bearingBetween(
    last.coords.latitude,
    last.coords.longitude,
    prev.placeLat,
    prev.placeLng,
  );

  return {
    ...prev,
    bearing,
    distanceMeters: distance,
    phoneHeading,
    updatedAt: Date.now(),
  };
}
