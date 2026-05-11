import { supabase } from './supabase';
import type { Place, Vice, ViceId } from '../types';

export type FavoriteKind = 'place' | 'vice';

// Enough data to render a favorite row offline (and to set as the active
// target if the user taps it from /favorites) without a re-fetch.
export interface PlaceSnapshot {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  priceLevel: number | null;
  photoRef: string | null;
}

export interface ViceSnapshot {
  label: string;
  icon: string;
  searchQuery: string;
  placeTypes?: string[];
}

export interface FavoriteRow {
  id: string;
  user_id: string;
  kind: FavoriteKind;
  ref_id: string;
  snapshot: PlaceSnapshot | ViceSnapshot | Record<string, unknown>;
  created_at: string;
}

export type FavResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Lookup key used by client-side maps and cache lookups.
export const favoriteKey = (kind: FavoriteKind, refId: string) =>
  `${kind}:${refId}`;

export function placeToSnapshot(p: Place): PlaceSnapshot {
  return {
    name: p.name,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    rating: p.rating,
    priceLevel: p.priceLevel,
    photoRef: p.photoRef,
  };
}

export function viceToSnapshot(v: Vice): ViceSnapshot {
  return {
    label: v.label,
    icon: v.icon,
    searchQuery: v.searchQuery,
    placeTypes: v.placeTypes,
  };
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listFavorites(
  kind?: FavoriteKind,
): Promise<FavResult<FavoriteRow[]>> {
  const userId = await currentUserId();
  if (!userId) return { ok: true, data: [] };

  let q = supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (kind) q = q.eq('kind', kind);

  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as FavoriteRow[] };
}

export async function addFavorite(
  kind: FavoriteKind,
  refId: string,
  snapshot: PlaceSnapshot | ViceSnapshot,
): Promise<FavResult<FavoriteRow>> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Sign in to save favorites.' };

  const { data, error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, kind, ref_id: refId, snapshot })
    .select('*')
    .single<FavoriteRow>();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function removeFavorite(
  kind: FavoriteKind,
  refId: string,
): Promise<FavResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Sign in to manage favorites.' };

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('ref_id', refId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

// Convenience for UI toggles. Returns the new favorited state on success.
export async function toggleFavorite(
  kind: FavoriteKind,
  refId: string,
  snapshot: PlaceSnapshot | ViceSnapshot,
  currentlyFavorited: boolean,
): Promise<FavResult<boolean>> {
  if (currentlyFavorited) {
    const r = await removeFavorite(kind, refId);
    return r.ok ? { ok: true, data: false } : r;
  }
  const r = await addFavorite(kind, refId, snapshot);
  return r.ok ? { ok: true, data: true } : r;
}

// Vice ids are typed; cast at the edge for callers that need it back as ViceId.
export const refIdToViceId = (refId: string): ViceId => refId as ViceId;
