import type {
  PriceLevel,
  RatingTier,
  SearchFilters,
} from '../types/search';

// Meters per mile, used to convert presets and label radii.
export const M_PER_MI = 1609.34;

// Radius presets shown in the full filter overlay.
export const RADIUS_PRESETS_M = [805, 1609, 8047, 16093] as const;
export const RADIUS_LABELS: Record<number, string> = {
  805: '0.5 mi',
  1609: '1 mi',
  8047: '5 mi',
  16093: '10 mi',
};

export const RATING_TIERS: RatingTier[] = [3, 4, 4.5];
export const PRICE_LEVELS: PriceLevel[] = [1, 2, 3, 4];
export const PRICE_LEVEL_LABELS: Record<PriceLevel, string> = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
};

export const DEFAULT_FILTERS: SearchFilters = {
  radiusMeters: 1609,
  openNow: false,
  minRating: null,
  priceLevels: [],
};

// ────────────────────────────────────────────────────────────
// Quick filter pills — single source of truth for the row.
//
// Each pill is a pure toggle: tapping flips its `isActive` state by
// applying / removing one constraint. `apply` returns a new filters
// object — never mutates.
// ────────────────────────────────────────────────────────────
export type QuickFilterId =
  | 'within_1mi'
  | 'open_now'
  | 'rating_4plus'
  | 'price_low';

export interface QuickFilterDef {
  id: QuickFilterId;
  label: string;
  isActive: (f: SearchFilters) => boolean;
  toggle: (f: SearchFilters) => SearchFilters;
}

// "Within 1 mi" tightens the radius to 1mi when off, broadens to 5mi when on.
// Default state (1609m) is treated as already active.
const within1mi: QuickFilterDef = {
  id: 'within_1mi',
  label: 'Within 1 mi',
  isActive: (f) => f.radiusMeters <= 1609,
  toggle: (f) => ({
    ...f,
    radiusMeters: f.radiusMeters <= 1609 ? 8047 : 1609,
  }),
};

const openNow: QuickFilterDef = {
  id: 'open_now',
  label: 'Open Now',
  isActive: (f) => f.openNow,
  toggle: (f) => ({ ...f, openNow: !f.openNow }),
};

const rating4plus: QuickFilterDef = {
  id: 'rating_4plus',
  label: '4★+',
  isActive: (f) => f.minRating !== null && f.minRating >= 4,
  toggle: (f) => ({
    ...f,
    minRating: f.minRating !== null && f.minRating >= 4 ? null : 4,
  }),
};

// "$$ or less" — price levels 1 or 2.
const priceLow: QuickFilterDef = {
  id: 'price_low',
  label: '$$ or less',
  isActive: (f) =>
    f.priceLevels.length > 0 && f.priceLevels.every((p) => p <= 2),
  toggle: (f) => {
    const alreadyLow =
      f.priceLevels.length > 0 && f.priceLevels.every((p) => p <= 2);
    return { ...f, priceLevels: alreadyLow ? [] : [1, 2] };
  },
};

export const QUICK_FILTERS: QuickFilterDef[] = [
  within1mi,
  openNow,
  rating4plus,
  priceLow,
];
