import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from '../lib/profile';
import { userAgeFromDob } from '../lib/age';
import { useSession } from './useSession';

// Local mirror of the DOB the user gave during onboarding. Persisted so anon
// users (no profile row) still get an age-gated catalog after onboarding.
export const ONBOARDING_DOB_KEY = 'vice.onboardingDob';

export interface UseUserAgeResult {
  age: number | null;
  loading: boolean;
}

// Resolves the user's age from (in order) the signed-in profile's birth_date
// or the locally-stored onboarding DOB. Returns null while loading or when no
// DOB has been captured yet.
export function useUserAge(): UseUserAgeResult {
  const { session, loading: sessionLoading } = useSession();
  const [age, setAge] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    let cancelled = false;

    (async () => {
      // Signed-in users: profile.birth_date wins so DOB stays authoritative
      // server-side. Falls through to the local mirror if the column is null
      // (legacy users who predate this field).
      if (session) {
        const r = await getProfile();
        if (cancelled) return;
        const dob = r.ok ? r.data?.birth_date ?? null : null;
        if (dob) {
          setAge(userAgeFromDob(dob));
          setLoading(false);
          return;
        }
      }

      const raw = await AsyncStorage.getItem(ONBOARDING_DOB_KEY);
      if (cancelled) return;
      setAge(userAgeFromDob(raw));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session, sessionLoading]);

  return { age, loading };
}
