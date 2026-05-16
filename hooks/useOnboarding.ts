import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from '../lib/profile';
import { useSession } from './useSession';

export const ONBOARDING_COMPLETE_KEY = 'vice.onboardingComplete';

export interface UseOnboardingResult {
  complete: boolean;
  loading: boolean;
}

// Single source of truth for "has the user finished onboarding?". Checks the
// local AsyncStorage flag first (covers anon users + offline cold boot) then
// falls back to profiles.onboarding_completed for signed-in users.
//
// Mark complete via markOnboardingComplete(); the splash watches this hook
// and routes to /(onboarding)/welcome when it returns false.
export function useOnboarding(): UseOnboardingResult {
  const { session, loading: sessionLoading } = useSession();
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    let cancelled = false;

    (async () => {
      const local = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
      if (cancelled) return;
      if (local === '1') {
        setComplete(true);
        setLoading(false);
        return;
      }
      if (session) {
        const r = await getProfile();
        if (cancelled) return;
        if (r.ok && r.data?.onboarding_completed) {
          // Backfill the local flag so subsequent boots skip the network call.
          await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, '1');
          setComplete(true);
        }
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session, sessionLoading]);

  return { complete, loading };
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, '1');
}

// Test/dev helper. Not wired into UI yet — use from a Settings entry later.
export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.multiRemove([ONBOARDING_COMPLETE_KEY]);
}
