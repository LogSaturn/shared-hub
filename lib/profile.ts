import { supabase } from './supabase';

// Mirror of public.profiles row. Keep typed columns in sync with the
// migration; everything else goes in `preferences` so adding personalized
// fields doesn't require a schema change.
export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  units: 'mi' | 'km';
  onboarding_completed: boolean;
  entitlement: 'free' | 'premium';
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | 'username'
    | 'display_name'
    | 'avatar_url'
    | 'units'
    | 'onboarding_completed'
    | 'preferences'
  >
>;

export type ProfileResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function getProfile(): Promise<ProfileResult<Profile | null>> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { ok: true, data: null };

  // The auth trigger creates a profile row on signup. If it's somehow missing
  // (e.g. user predates the trigger), .maybeSingle() returns null without error.
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle<Profile>();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function updateProfile(
  patch: ProfilePatch,
): Promise<ProfileResult<Profile>> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single<Profile>();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

// Merge-update for the preferences bag. Pass {} to clear nothing.
// Values set to null are stripped from the merged result so callers can
// "unset" a preference without removing the whole bag.
export async function mergePreferences(
  patch: Record<string, unknown>,
): Promise<ProfileResult<Profile>> {
  const current = await getProfile();
  if (!current.ok) return current;
  const merged = { ...(current.data?.preferences ?? {}), ...patch };
  for (const k of Object.keys(merged)) {
    if (merged[k] === null) delete merged[k];
  }
  return updateProfile({ preferences: merged });
}
