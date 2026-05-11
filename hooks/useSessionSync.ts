import { useEffect } from 'react';
import { useSession } from './useSession';
import { useAppStore } from '../store';
import { recentViceIds } from '../lib/viceSearches';

// Pulls server-side per-user data into Zustand whenever the auth session
// changes. Anonymous → no-op (local persisted state stays). Signed-in →
// server is the source of truth for recents; replaces local with server.
//
// Mount once near the root (app/_layout.tsx) — does nothing visual.
export function useSessionSync() {
  const { session, loading } = useSession();
  const setRecentViceIds = useAppStore((s) => s.setRecentViceIds);

  useEffect(() => {
    if (loading) return;
    if (!session) return;
    let cancelled = false;
    recentViceIds(5).then((r) => {
      if (cancelled || !r.ok) return;
      // Only overwrite if server has any history; otherwise keep whatever
      // local recents the user may have built up before signing in.
      if (r.data.length > 0) setRecentViceIds(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, [session, loading, setRecentViceIds]);
}
