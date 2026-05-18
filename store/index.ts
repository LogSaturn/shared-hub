import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from '../types';
import { QUICK_FILTERS } from '../constants/filters';
import {
  defaultFilters,
  fromQuery,
  fromVice,
} from '../lib/searchConfig';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeSearch: null,
      setActiveSearch: (cfg) => set({ activeSearch: cfg }),

      selectVice: (vice) => {
        const filters = get().lastUsedFilters;
        set({ activeSearch: fromVice(vice, { ...filters }) });
      },

      selectQuery: (query) => {
        const filters = get().lastUsedFilters;
        set({ activeSearch: fromQuery(query, { ...filters }) });
      },

      updateActiveFilters: (patch) => {
        const cur = get().activeSearch;
        const next = { ...get().lastUsedFilters, ...patch };
        set({
          lastUsedFilters: next,
          activeSearch: cur ? { ...cur, filters: next } : cur,
        });
      },

      toggleQuickFilter: (id) => {
        const def = QUICK_FILTERS.find((q) => q.id === id);
        if (!def) return;
        const cur = get().activeSearch;
        const base = cur ? cur.filters : get().lastUsedFilters;
        const next = def.toggle(base);
        set({
          lastUsedFilters: next,
          activeSearch: cur ? { ...cur, filters: next } : cur,
        });
      },

      pendingFilters: defaultFilters(),
      setPendingFilters: (f) => set({ pendingFilters: f }),
      setPendingFilter: (patch) =>
        set((s) => ({ pendingFilters: { ...s.pendingFilters, ...patch } })),
      openFilterOverlay: () => {
        const cur = get().activeSearch;
        const base = cur ? cur.filters : get().lastUsedFilters;
        set({ pendingFilters: { ...base, priceLevels: [...base.priceLevels] } });
      },
      commitPendingFilters: () => {
        const next = get().pendingFilters;
        const cur = get().activeSearch;
        set({
          lastUsedFilters: next,
          activeSearch: cur ? { ...cur, filters: next } : cur,
        });
      },
      resetPendingFilters: () => set({ pendingFilters: defaultFilters() }),

      lastUsedFilters: defaultFilters(),

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

      recentViceIds: [],
      addRecentVice: (id) =>
        set((s) => ({
          recentViceIds: [id, ...s.recentViceIds.filter((r) => r !== id)].slice(0, 5),
        })),
      setRecentViceIds: (ids) => set({ recentViceIds: ids.slice(0, 5) }),

      recentCustomQueries: [],
      addRecentCustomQuery: (q) => {
        const trimmed = q.trim();
        if (!trimmed) return;
        set((s) => ({
          recentCustomQueries: [
            trimmed,
            ...s.recentCustomQueries.filter(
              (r) => r.toLowerCase() !== trimmed.toLowerCase(),
            ),
          ].slice(0, 5),
        }));
      },

      units: 'mi',
      setUnits: (units) => set({ units }),

      cachedProfile: null,
      setCachedProfile: (profile) => set({ cachedProfile: profile }),
      profileReady: false,
      setProfileReady: (ready) => set({ profileReady: ready }),

      reset: () => set({
        activeSearch: null,
        recentViceIds: [],
        recentCustomQueries: [],
        places: [],
        targetPlace: null,
        userLocation: null,
      }),
    }),
    {
      name: 'vice-storage',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        recentViceIds: s.recentViceIds,
        recentCustomQueries: s.recentCustomQueries,
        units: s.units,
        lastUsedFilters: s.lastUsedFilters,
      }),
      // v1 → v2 dropped `selectedVice`/`filters` from persisted shape.
      // The new persist subset is a strict subset of v1's, so the safest
      // migration is to start fresh — drops stale partialize keys without
      // a hand-written mapper.
      migrate: () => ({} as Partial<AppState>),
    },
  ),
);
