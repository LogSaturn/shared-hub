import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from '../types';
import { DEFAULT_SEARCH_RADIUS_M } from '../constants/config';

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedVice: null,
      setSelectedVice: (vice) => set({ selectedVice: vice }),

      userLocation: null,
      setUserLocation: (loc) => set({ userLocation: loc }),

      places: [],
      placesLoading: false,
      placesError: null,
      setPlaces: (places) => set({ places }),
      setPlacesLoading: (loading) => set({ placesLoading: loading }),
      setPlacesError: (error) => set({ placesError: error }),

      targetPlace: null,
      setTargetPlace: (place) => set({ targetPlace: place }),

      filters: {
        radiusMeters: DEFAULT_SEARCH_RADIUS_M,
        openNow: false,
        preferredBrands: [],
        avoidTypes: [],
      },
      setFilters: (f) =>
        set((s) => ({ filters: { ...s.filters, ...f } })),

      recentViceIds: [],
      addRecentVice: (id) =>
        set((s) => ({
          recentViceIds: [id, ...s.recentViceIds.filter((r) => r !== id)].slice(0, 5),
        })),
      setRecentViceIds: (ids) => set({ recentViceIds: ids.slice(0, 5) }),

      units: 'mi',
      setUnits: (units) => set({ units }),
    }),
    {
      name: 'vice-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        recentViceIds: s.recentViceIds,
        units: s.units,
        filters: s.filters,
      }),
    },
  ),
);
