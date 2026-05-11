import { useCallback, useEffect, useState } from 'react';
import { useSession } from './useSession';
import {
  FavoriteKind,
  FavoriteRow,
  favoriteKey,
  listFavorites,
  toggleFavorite,
  PlaceSnapshot,
  ViceSnapshot,
} from '../lib/favorites';

export interface UseFavoritesResult {
  favorites: Map<string, FavoriteRow>;
  loading: boolean;
  isFavorited: (kind: FavoriteKind, refId: string) => boolean;
  toggle: (
    kind: FavoriteKind,
    refId: string,
    snapshot: PlaceSnapshot | ViceSnapshot,
  ) => Promise<{ ok: boolean; favorited: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

// Loads the user's full favorites set into a client-side Map keyed by
// "kind:refId". Optimistic toggle with rollback on server error so the
// heart never appears stuck during normal use.
export function useFavorites(): UseFavoritesResult {
  const { session, loading: sessionLoading } = useSession();
  const [favorites, setFavorites] = useState<Map<string, FavoriteRow>>(new Map());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!session) {
      setFavorites(new Map());
      return;
    }
    setLoading(true);
    const r = await listFavorites();
    setLoading(false);
    if (!r.ok) return;
    const next = new Map<string, FavoriteRow>();
    for (const row of r.data) {
      next.set(favoriteKey(row.kind, row.ref_id), row);
    }
    setFavorites(next);
  }, [session]);

  useEffect(() => {
    if (sessionLoading) return;
    refresh();
  }, [sessionLoading, refresh]);

  const isFavorited = useCallback(
    (kind: FavoriteKind, refId: string) =>
      favorites.has(favoriteKey(kind, refId)),
    [favorites],
  );

  const toggle = useCallback(
    async (
      kind: FavoriteKind,
      refId: string,
      snapshot: PlaceSnapshot | ViceSnapshot,
    ) => {
      const key = favoriteKey(kind, refId);
      const wasFavorited = favorites.has(key);
      const prev = favorites;

      // Optimistic update: flip immediately so the UI feels instant.
      const next = new Map(prev);
      if (wasFavorited) {
        next.delete(key);
      } else {
        // Synthesize a temporary row; will be replaced on next refresh.
        next.set(key, {
          id: `optimistic-${key}`,
          user_id: session?.user.id ?? '',
          kind,
          ref_id: refId,
          snapshot,
          created_at: new Date().toISOString(),
        });
      }
      setFavorites(next);

      const r = await toggleFavorite(kind, refId, snapshot, wasFavorited);
      if (!r.ok) {
        // Roll back on failure.
        setFavorites(prev);
        return { ok: false, favorited: wasFavorited, error: r.error };
      }
      // Re-fetch in the background to materialize the real row id; don't await.
      refresh();
      return { ok: true, favorited: r.data };
    },
    [favorites, session, refresh],
  );

  return { favorites, loading, isFavorited, toggle, refresh };
}
