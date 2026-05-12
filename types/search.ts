import type { ViceId } from './index';

export type PriceLevel = 1 | 2 | 3 | 4;
export type RatingTier = 3 | 4 | 4.5;

export interface SearchFilters {
  radiusMeters: number;
  openNow: boolean;
  minRating: RatingTier | null;
  priceLevels: PriceLevel[];
}

interface ViceSearchConfig {
  kind: 'vice';
  viceId: ViceId;
  label: string;
  searchQuery: string;
  placeTypes?: string[];
  filters: SearchFilters;
}

interface QuerySearchConfig {
  kind: 'query';
  query: string;
  label: string;
  filters: SearchFilters;
}

export type SearchConfig = ViceSearchConfig | QuerySearchConfig;

// Serialized form persisted to jsonb / AsyncStorage. Versioned so future
// schema migrations are a single switch on `v`.
export interface SerializedSearchConfig {
  v: 1;
  config: SearchConfig;
}
