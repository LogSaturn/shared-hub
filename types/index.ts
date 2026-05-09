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

export interface SearchFilters {
  radiusMeters: number;
  openNow: boolean;
  preferredBrands: string[];
  avoidTypes: string[];
}

export type Units = 'mi' | 'km';

export interface AppState {
  selectedVice: Vice | null;
  setSelectedVice: (vice: Vice) => void;

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

  filters: SearchFilters;
  setFilters: (filters: Partial<SearchFilters>) => void;

  recentViceIds: ViceId[];
  addRecentVice: (id: ViceId) => void;

  units: Units;
  setUnits: (units: Units) => void;
}
