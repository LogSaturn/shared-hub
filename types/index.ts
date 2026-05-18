export type ViceId =
  | 'coffee'
  | 'energy'
  | 'zyn'
  | 'cigarettes'
  | 'beer'
  | 'wine'
  | 'cocktails'
  | 'pastries'
  | 'donuts'
  | 'ice_cream'
  | 'boba'
  | 'matcha'
  | 'custom';

export interface Vice {
  id: ViceId;
  label: string;
  // MaterialCommunityIcons icon name (e.g. "coffee", "beer").
  icon: string;
  searchQuery: string;
  placeTypes?: string[];
}

export interface Place {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isOpen: boolean | null;
  rating: number | null;
  priceLevel: number | null;
  photoRef: string | null;
  distance: number;
  bearing: number;
  distanceMi: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export type Units = 'mi' | 'km';

export type { SearchConfig, SearchFilters, PriceLevel, RatingTier } from './search';

import type { SearchConfig, SearchFilters } from './search';
import type { QuickFilterId } from '../constants/filters';
import type { Profile } from '../lib/profile';

export interface AppState {
  // The search currently driving the compass. Null until the user picks a
  // vice or submits a free-text query.
  activeSearch: SearchConfig | null;
  setActiveSearch: (cfg: SearchConfig | null) => void;
  // Commit a vice / query selection. Uses lastUsedFilters so filter state
  // carries between searches within a session.
  selectVice: (vice: Vice) => void;
  selectQuery: (query: string) => void;
  // Commit a filter change into activeSearch.filters AND lastUsedFilters.
  updateActiveFilters: (patch: Partial<SearchFilters>) => void;
  toggleQuickFilter: (id: QuickFilterId) => void;

  // Pending filters live here while the full filter overlay is open. Apply
  // copies these into activeSearch.filters; Cancel discards them; Reset
  // returns them to defaults.
  pendingFilters: SearchFilters;
  setPendingFilters: (f: SearchFilters) => void;
  setPendingFilter: (patch: Partial<SearchFilters>) => void;
  openFilterOverlay: () => void;
  commitPendingFilters: () => void;
  resetPendingFilters: () => void;

  // Persisted across sessions so the next search remembers prior filter choices.
  lastUsedFilters: SearchFilters;

  userLocation: UserLocation | null;
  setUserLocation: (loc: UserLocation) => void;

  places: Place[];
  placesLoading: boolean;
  placesError: string | null;
  setPlaces: (places: Place[]) => void;
  setPlacesLoading: (loading: boolean) => void;
  setPlacesError: (error: string | null) => void;

  targetPlace: Place | null;
  setTargetPlace: (place: Place) => void;

  recentViceIds: ViceId[];
  addRecentVice: (id: ViceId) => void;
  setRecentViceIds: (ids: ViceId[]) => void;

  recentCustomQueries: string[];
  addRecentCustomQuery: (q: string) => void;

  units: Units;
  setUnits: (units: Units) => void;

  // Prefetched during the splash so tabs render instantly with profile data.
  cachedProfile: Profile | null;
  setCachedProfile: (profile: Profile | null) => void;
  // True once the profile fetch completes (or session is absent). Lets the
  // splash screen gate navigation until data is ready.
  profileReady: boolean;
  setProfileReady: (ready: boolean) => void;

  reset: () => void;
}
