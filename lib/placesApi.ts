import { PLACES_PROXY_FN } from '../constants/config';
import { supabase } from './supabase';

const log = (...args: unknown[]) => console.log('[placesApi]', ...args);
const warn = (...args: unknown[]) => console.warn('[placesApi]', ...args);

export interface RawNearbyPlace {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isOpen: boolean | null;
  rating: number | null;
  priceLevel: number | null;
  photoRef: string | null;
  types: string[];
}

export interface PlaceDetails extends RawNearbyPlace {
  websiteUri: string | null;
  phone: string | null;
  weekdayDescriptions: string[];
}

interface NearbyArgs {
  lat: number;
  lng: number;
  radius: number;
  query?: string;
  placeTypes?: string[];
  openNow?: boolean;
  maxResults?: number;
}

export async function nearbySearch(args: NearbyArgs): Promise<RawNearbyPlace[]> {
  log('nearbySearch invoking edge function', {
    lat: args.lat,
    lng: args.lng,
    radius: args.radius,
    query: args.query,
    placeTypes: args.placeTypes,
  });

  const t0 = Date.now();
  const { data, error } = await supabase.functions.invoke<{
    places: RawNearbyPlace[];
    error?: string;
  }>(PLACES_PROXY_FN, {
    body: { action: 'nearby', ...args },
  });
  const dt = Date.now() - t0;

  if (error) {
    let detail = error.message ?? String(error);
    if (__DEV__) {
      // FunctionsHttpError exposes the upstream Response on `context`. Read
      // the body in dev so the error message is actually useful; in prod we
      // skip it to avoid leaking upstream details to the user.
      const ctx = (error as { context?: { text?: () => Promise<string> } }).context;
      if (ctx?.text) {
        try {
          const body = await ctx.text();
          detail = `${detail} — body=${body.slice(0, 500)}`;
        } catch {
          /* ignore */
        }
      }
    }
    warn(`invoke error after ${dt}ms`, detail);
    throw new Error(`places-proxy invoke failed: ${detail}`);
  }
  if (!data) {
    warn(`empty data after ${dt}ms`);
    throw new Error('places-proxy returned no data');
  }
  if (data.error) {
    warn(`upstream error after ${dt}ms`, data.error);
    throw new Error(`places-proxy: ${data.error}`);
  }
  log(`nearbySearch ok in ${dt}ms — ${data.places?.length ?? 0} place(s)`);
  return data.places ?? [];
}

export async function placeDetails(placeId: string): Promise<PlaceDetails> {
  log('placeDetails invoking', placeId);
  const { data, error } = await supabase.functions.invoke<{
    place: PlaceDetails;
    error?: string;
  }>(PLACES_PROXY_FN, {
    body: { action: 'details', placeId },
  });

  if (error) {
    warn('details invoke error', error);
    throw new Error(`places-proxy invoke failed: ${error.message ?? error}`);
  }
  if (!data) throw new Error('places-proxy returned no data');
  if (data.error) throw new Error(`places-proxy: ${data.error}`);
  return data.place;
}
