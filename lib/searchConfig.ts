import type {
  SearchConfig,
  SearchFilters,
  SerializedSearchConfig,
} from '../types/search';
import type { Vice } from '../types';
import { DEFAULT_FILTERS } from '../constants/filters';

// ────────────────────────────────────────────────────────────
// Construction
// ────────────────────────────────────────────────────────────

export function defaultFilters(): SearchFilters {
  return { ...DEFAULT_FILTERS, priceLevels: [...DEFAULT_FILTERS.priceLevels] };
}

export function fromVice(vice: Vice, filters?: SearchFilters): SearchConfig {
  return {
    kind: 'vice',
    viceId: vice.id,
    label: vice.label,
    searchQuery: vice.searchQuery,
    placeTypes: vice.placeTypes,
    filters: filters ?? defaultFilters(),
  };
}

export function fromQuery(query: string, filters?: SearchFilters): SearchConfig {
  const trimmed = query.trim();
  return {
    kind: 'query',
    query: trimmed,
    label: trimmed,
    filters: filters ?? defaultFilters(),
  };
}

export function isCustom(cfg: SearchConfig): cfg is Extract<SearchConfig, { kind: 'query' }> {
  return cfg.kind === 'query';
}

// ────────────────────────────────────────────────────────────
// Filter math
// ────────────────────────────────────────────────────────────

// Count of constraints that diverge from the default. Drives the badge on
// the filter icon and the "Reset" affordance in the overlay.
export function activeFilterCount(f: SearchFilters): number {
  let n = 0;
  if (f.radiusMeters !== DEFAULT_FILTERS.radiusMeters) n++;
  if (f.openNow !== DEFAULT_FILTERS.openNow) n++;
  if (f.minRating !== DEFAULT_FILTERS.minRating) n++;
  if (f.priceLevels.length !== DEFAULT_FILTERS.priceLevels.length) n++;
  return n;
}

export function filtersEqual(a: SearchFilters, b: SearchFilters): boolean {
  if (a.radiusMeters !== b.radiusMeters) return false;
  if (a.openNow !== b.openNow) return false;
  if (a.minRating !== b.minRating) return false;
  if (a.priceLevels.length !== b.priceLevels.length) return false;
  const aSet = new Set(a.priceLevels);
  for (const p of b.priceLevels) if (!aSet.has(p)) return false;
  return true;
}

// ────────────────────────────────────────────────────────────
// Edge-function payload
// ────────────────────────────────────────────────────────────

export interface PlacesQueryArgs {
  query?: string;
  placeTypes?: string[];
  radius: number;
  openNow: boolean;
  minRating?: number;
  priceLevels?: number[];
  maxResults: number;
}

export function toPlacesQuery(
  cfg: SearchConfig,
  opts: { maxResults?: number } = {},
): PlacesQueryArgs {
  const { filters } = cfg;
  const base: PlacesQueryArgs = {
    radius: filters.radiusMeters,
    openNow: filters.openNow,
    maxResults: opts.maxResults ?? 20,
  };
  if (filters.minRating !== null) base.minRating = filters.minRating;
  if (filters.priceLevels.length > 0) base.priceLevels = filters.priceLevels;

  if (cfg.kind === 'vice') {
    base.query = cfg.searchQuery;
    if (cfg.placeTypes) base.placeTypes = cfg.placeTypes;
  } else {
    base.query = cfg.query;
  }
  return base;
}

// ────────────────────────────────────────────────────────────
// Serialization (jsonb / AsyncStorage)
//
// Always writes a versioned wrapper so future migrations are a single
// switch on `v`. Parsing fills missing filter keys with defaults — adding
// a new filter later does not break old stored configs.
// ────────────────────────────────────────────────────────────

export function serialize(cfg: SearchConfig): SerializedSearchConfig {
  return { v: 1, config: cfg };
}

export function parse(raw: unknown): SearchConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { v?: number; config?: unknown };
  if (obj.v !== 1 || !obj.config || typeof obj.config !== 'object') return null;
  const c = obj.config as Partial<SearchConfig> & { kind?: string };
  const filters = mergeFilters(c.filters);
  if (c.kind === 'vice') {
    const v = c as Extract<SearchConfig, { kind: 'vice' }>;
    if (!v.viceId || !v.label || !v.searchQuery) return null;
    return {
      kind: 'vice',
      viceId: v.viceId,
      label: v.label,
      searchQuery: v.searchQuery,
      placeTypes: v.placeTypes,
      filters,
    };
  }
  if (c.kind === 'query') {
    const q = c as Extract<SearchConfig, { kind: 'query' }>;
    if (!q.query) return null;
    return {
      kind: 'query',
      query: q.query,
      label: q.label ?? q.query,
      filters,
    };
  }
  return null;
}

function mergeFilters(input: Partial<SearchFilters> | undefined): SearchFilters {
  const base = defaultFilters();
  if (!input) return base;
  return {
    radiusMeters:
      typeof input.radiusMeters === 'number' ? input.radiusMeters : base.radiusMeters,
    openNow: typeof input.openNow === 'boolean' ? input.openNow : base.openNow,
    minRating: input.minRating ?? base.minRating,
    priceLevels: Array.isArray(input.priceLevels)
      ? input.priceLevels.filter((p): p is 1 | 2 | 3 | 4 => [1, 2, 3, 4].includes(p as number))
      : base.priceLevels,
  };
}
