import { useEffect } from 'react';
import { useSession } from './useSession';
import { useAppStore } from '../store';
import { recentViceIds } from '../lib/viceSearches';
import { getProfile } from '../lib/profile';

// Pulls server-side per-user data into Zustand whenever the auth session
// changes. Also prefetches the user profile so tabs render instantly without
// a second network round-trip.
//
// Mount once near the root (app/_layout.tsx) — does nothing visual.
export function useSessionSync() {
  const { session, loading } = useSession();
  const setRecentViceIds = useAppStore((s) => s.setRecentViceIds);
  const setCachedProfile = useAppStore((s) => s.setCachedProfile);
  const setProfileReady = useAppStore((s) => s.setProfileReady);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      setCachedProfile(null);
      setProfileReady(true);
      return;
    }

    let cancelled = false;

    // Fetch recent vice IDs and profile in parallel.
    recentViceIds(5).then((r) => {
      if (cancelled || !r.ok) return;
      if (r.data.length > 0) setRecentViceIds(r.data);
    });

    getProfile().then((r) => {
      if (cancelled) return;
      if (r.ok) setCachedProfile(r.data);
      setProfileReady(true);
    }).catch(() => {
      if (!cancelled) setProfileReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [session, loading, setRecentViceIds, setCachedProfile, setProfileReady]);
}
