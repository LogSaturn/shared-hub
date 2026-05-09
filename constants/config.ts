export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const PLACES_PROXY_FN = 'places-proxy';

export const DEFAULT_SEARCH_RADIUS_M = 1600;
export const MAX_SEARCH_RADIUS_M = 16000;

export const COMPASS_FILTER_ALPHA = 0.98;
export const SENSOR_INTERVAL_MAG_MS = 32;
export const SENSOR_INTERVAL_GYRO_MS = 16;
export const SENSOR_INTERVAL_ACCEL_MS = 32;

export const NEEDLE_SPRING = {
  damping: 18,
  stiffness: 120,
  mass: 0.8,
} as const;
