import { Vice, ViceId } from '../types';

// US thresholds. Tobacco-21 (federal, 2019) put cigarettes/zyn in the same
// bucket as alcohol, so a single 21-cutoff handles both. If we ever ship a
// region-aware build, split this into per-vice thresholds resolved by locale.
export const AGE_THRESHOLD = 21;

// Vice IDs gated by AGE_THRESHOLD. Anything not listed is unrestricted.
export const RESTRICTED_VICE_IDS: ReadonlySet<ViceId> = new Set([
  'beer',
  'wine',
  'cocktails',
  'cigarettes',
  'zyn',
]);

export function viceRequiresAge(id: ViceId): boolean {
  return RESTRICTED_VICE_IDS.has(id);
}

// Returns whole years between dob and today, or null when dob is missing/invalid.
// Uses local time (matches how the date picker captures the value).
export function userAgeFromDob(dob: string | Date | null | undefined): number | null {
  if (!dob) return null;
  const d = typeof dob === 'string' ? new Date(dob) : dob;
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  return years;
}

// Filter rule used everywhere a list of vices is rendered. When age is null
// (not yet provided) we conservatively hide restricted vices — onboarding
// always collects DOB before reaching the tabs, so this only matters for the
// brief window between sign-up and onboarding completion.
export function filterVicesForAge<T extends { id: ViceId }>(
  vices: readonly T[],
  age: number | null,
): T[] {
  if (age !== null && age >= AGE_THRESHOLD) return [...vices];
  return vices.filter((v) => !viceRequiresAge(v.id));
}

// Same idea for vice-id arrays (e.g. recents).
export function filterViceIdsForAge(
  ids: readonly ViceId[],
  age: number | null,
): ViceId[] {
  if (age !== null && age >= AGE_THRESHOLD) return [...ids];
  return ids.filter((id) => !viceRequiresAge(id));
}
