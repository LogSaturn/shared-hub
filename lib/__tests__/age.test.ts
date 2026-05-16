import {
  AGE_THRESHOLD,
  filterVicesForAge,
  filterViceIdsForAge,
  RESTRICTED_VICE_IDS,
  userAgeFromDob,
  viceRequiresAge,
} from '../age';
import { VICE_CATEGORIES } from '../../constants/vices';
import type { ViceId } from '../../types';

describe('userAgeFromDob', () => {
  test('returns null for missing input', () => {
    expect(userAgeFromDob(null)).toBeNull();
    expect(userAgeFromDob(undefined)).toBeNull();
    expect(userAgeFromDob('')).toBeNull();
  });

  test('returns null for invalid date strings', () => {
    expect(userAgeFromDob('not-a-date')).toBeNull();
  });

  test('handles birthday today / tomorrow / yesterday correctly', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setFullYear(now.getFullYear() - 25);
    yesterday.setDate(yesterday.getDate() - 1);
    expect(userAgeFromDob(yesterday)).toBe(25);

    const tomorrow = new Date(now);
    tomorrow.setFullYear(now.getFullYear() - 25);
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Birthday hasn't happened yet this year — still 24.
    expect(userAgeFromDob(tomorrow)).toBe(24);

    const exact = new Date(now);
    exact.setFullYear(now.getFullYear() - 25);
    expect(userAgeFromDob(exact)).toBe(25);
  });

  test('parses ISO date strings the same way', () => {
    const iso = '2000-01-15';
    const got = userAgeFromDob(iso);
    expect(got).toBeGreaterThanOrEqual(25);
    expect(got).toBeLessThanOrEqual(27);
  });
});

describe('viceRequiresAge', () => {
  test('flags alcohol + tobacco', () => {
    for (const id of ['beer', 'wine', 'cocktails', 'cigarettes', 'zyn'] as ViceId[]) {
      expect(viceRequiresAge(id)).toBe(true);
      expect(RESTRICTED_VICE_IDS.has(id)).toBe(true);
    }
  });

  test('does not flag unrestricted vices', () => {
    for (const id of ['coffee', 'energy', 'pastries', 'donuts', 'ice_cream', 'boba', 'matcha'] as ViceId[]) {
      expect(viceRequiresAge(id)).toBe(false);
    }
  });
});

describe('filterVicesForAge', () => {
  test('strips restricted entries when age < threshold', () => {
    const filtered = filterVicesForAge(VICE_CATEGORIES, AGE_THRESHOLD - 1);
    expect(filtered.length).toBeLessThan(VICE_CATEGORIES.length);
    expect(filtered.find((v) => v.id === 'beer')).toBeUndefined();
    expect(filtered.find((v) => v.id === 'cigarettes')).toBeUndefined();
    expect(filtered.find((v) => v.id === 'coffee')).toBeDefined();
  });

  test('keeps everything when age >= threshold', () => {
    const filtered = filterVicesForAge(VICE_CATEGORIES, AGE_THRESHOLD);
    expect(filtered).toEqual(VICE_CATEGORIES);
    const filtered2 = filterVicesForAge(VICE_CATEGORIES, 99);
    expect(filtered2).toEqual(VICE_CATEGORIES);
  });

  test('strips restricted entries when age is unknown (null)', () => {
    // Conservative default: hide restricted until DOB is captured.
    const filtered = filterVicesForAge(VICE_CATEGORIES, null);
    expect(filtered.find((v) => v.id === 'beer')).toBeUndefined();
    expect(filtered.find((v) => v.id === 'coffee')).toBeDefined();
  });
});

describe('filterViceIdsForAge', () => {
  test('parallel behavior on raw id arrays', () => {
    const ids: ViceId[] = ['coffee', 'beer', 'matcha', 'zyn', 'donuts'];
    expect(filterViceIdsForAge(ids, AGE_THRESHOLD)).toEqual(ids);
    expect(filterViceIdsForAge(ids, 18)).toEqual(['coffee', 'matcha', 'donuts']);
    expect(filterViceIdsForAge(ids, null)).toEqual(['coffee', 'matcha', 'donuts']);
  });
});
