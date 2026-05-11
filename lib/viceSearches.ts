import { supabase } from './supabase';
import { distanceBetween } from './bearing';
import type { ViceId, UserLocation } from '../types';

export interface ViceSearchRow {
  id: string;
  user_id: string;
  vice_id: ViceId;
  query: string | null;
  search_lat: number | null;
  search_lng: number | null;
  created_at: string;
}

export type SearchResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Fire-and-forget: callers should NOT await this on a hot path.
// No-op for anonymous users (returns ok=true with no write).
export async function logViceSearch(args: {
  viceId: ViceId;
  query?: string | null;
  location?: Pick<UserLocation, 'lat' | 'lng'> | null;
}): Promise<SearchResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: true, data: undefined };

  const { error } = await supabase.from('vice_searches').insert({
    user_id: userId,
    vice_id: args.viceId,
    query: args.query ?? null,
    search_lat: args.location?.lat ?? null,
    search_lng: args.location?.lng ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

// Compute "recent vice ids" at read time from the append-only log.
// Distinct vice_ids, most-recent first, capped at `limit`.
// Server-side dedupe is cheaper than client-side once a user has hundreds
// of rows; we fetch a small window and dedupe in JS for now.
export async function recentViceIds(limit = 5): Promise<SearchResult<ViceId[]>> {
  const userId = await currentUserId();
  if (!userId) return { ok: true, data: [] };

  // Pull enough rows to dedupe down to `limit`. 50 is a safe ceiling for
  // typical users; large histories will still work since we dedupe in JS.
  const { data, error } = await supabase
    .from('vice_searches')
    .select('vice_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { ok: false, error: error.message };

  const seen = new Set<string>();
  const out: ViceId[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.vice_id)) continue;
    seen.add(row.vice_id);
    out.push(row.vice_id as ViceId);
    if (out.length >= limit) break;
  }
  return { ok: true, data: out };
}

export interface ViceSearchStats {
  totalTrips: number;
  distinctVices: number;
  distanceMeters: number;
}

// Aggregate stats for the dashboard. Walks all of the user's vice_searches
// rows once, computing:
//  - totalTrips: row count
//  - distinctVices: number of unique vice_ids
//  - distanceMeters: cumulative haversine distance between consecutive
//    search locations (rows lacking lat/lng are skipped without resetting
//    the chain). Imperfect proxy for "traveled" — we only have search
//    pings, not continuous GPS — but it's the honest read from what we log.
export async function getViceSearchStats(): Promise<SearchResult<ViceSearchStats>> {
  const userId = await currentUserId();
  if (!userId) {
    return { ok: true, data: { totalTrips: 0, distinctVices: 0, distanceMeters: 0 } };
  }

  const { data, error } = await supabase
    .from('vice_searches')
    .select('vice_id, search_lat, search_lng, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) return { ok: false, error: error.message };

  const rows = data ?? [];
  const distinct = new Set<string>();
  let distanceMeters = 0;
  let prev: { lat: number; lng: number } | null = null;

  for (const row of rows) {
    distinct.add(row.vice_id);
    if (row.search_lat != null && row.search_lng != null) {
      if (prev) {
        distanceMeters += distanceBetween(
          prev.lat,
          prev.lng,
          row.search_lat,
          row.search_lng,
        );
      }
      prev = { lat: row.search_lat, lng: row.search_lng };
    }
  }

  return {
    ok: true,
    data: {
      totalTrips: rows.length,
      distinctVices: distinct.size,
      distanceMeters,
    },
  };
}

export async function clearViceSearches(): Promise<SearchResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: true, data: undefined };

  const { error } = await supabase
    .from('vice_searches')
    .delete()
    .eq('user_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}
