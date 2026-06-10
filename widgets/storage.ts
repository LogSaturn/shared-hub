import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ViceId } from '../types';

const cfgKey = (name: string, id: number) => `widget:${name}:${id}:cfg`;
const cacheKey = (id: number) => `widget:Compass:${id}:cache`;

export interface WidgetConfig {
  viceId: ViceId;
}

export interface CompassCache {
  placeName: string;
  placeAddress: string;
  // Coordinates of the destination — kept so we can recompute bearing/distance
  // from a fresh user position without re-hitting the places API on every tap.
  placeLat: number;
  placeLng: number;
  // Geographic bearing from user → place, 0–360 CW from north.
  bearing: number;
  // Tilt-compensated heading of the phone at the time of capture
  // (0 = phone top points magnetic north). Null when the sensor read failed
  // or for old cached entries that predate heading capture — widget falls
  // back to a static dial in that case.
  phoneHeading?: number | null;
  distanceMeters: number;
  updatedAt: number;
}

export async function getWidgetConfig(name: string, id: number): Promise<WidgetConfig | null> {
  const raw = await AsyncStorage.getItem(cfgKey(name, id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WidgetConfig;
  } catch {
    return null;
  }
}

export async function setWidgetConfig(name: string, id: number, cfg: WidgetConfig): Promise<void> {
  await AsyncStorage.setItem(cfgKey(name, id), JSON.stringify(cfg));
}

export async function deleteWidgetConfig(name: string, id: number): Promise<void> {
  await AsyncStorage.removeItem(cfgKey(name, id));
  await AsyncStorage.removeItem(cacheKey(id));
}

export async function getCompassCache(id: number): Promise<CompassCache | null> {
  const raw = await AsyncStorage.getItem(cacheKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CompassCache;
  } catch {
    return null;
  }
}

export async function setCompassCache(id: number, cache: CompassCache): Promise<void> {
  await AsyncStorage.setItem(cacheKey(id), JSON.stringify(cache));
}
