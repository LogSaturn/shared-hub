import { useCallback } from 'react';
import { useAppStore } from '../store';
import { nearbySearch, RawNearbyPlace } from '../lib/placesApi';
import { bearingBetween, distanceBetween } from '../lib/bearing';
import { Place, UserLocation, Vice } from '../types';

const M_PER_MI = 1609.34;

const log = (...args: unknown[]) => console.log('[usePlaces]', ...args);
const warn = (...args: unknown[]) => console.warn('[usePlaces]', ...args);

function enrich(raw: RawNearbyPlace, origin: UserLocation): Place {
  const distance = distanceBetween(origin.lat, origin.lng, raw.lat, raw.lng);
  const bearing = bearingBetween(origin.lat, origin.lng, raw.lat, raw.lng);
  return {
    placeId: raw.placeId,
    name: raw.name,
    address: raw.address,
    lat: raw.lat,
    lng: raw.lng,
    isOpen: raw.isOpen,
    rating: raw.rating,
    priceLevel: raw.priceLevel,
    photoRef: raw.photoRef,
    distance,
    bearing,
    distanceMi: distance / M_PER_MI,
  };
}

export interface UsePlacesResult {
  fetch: (vice: Vice, origin: UserLocation) => Promise<Place[]>;
}

export function usePlaces(): UsePlacesResult {
  const setPlaces = useAppStore((s) => s.setPlaces);
  const setTargetPlace = useAppStore((s) => s.setTargetPlace);
  const setPlacesLoading = useAppStore((s) => s.setPlacesLoading);
  const setPlacesError = useAppStore((s) => s.setPlacesError);
  const filters = useAppStore((s) => s.filters);

  const fetch = useCallback(
    async (vice: Vice, origin: UserLocation): Promise<Place[]> => {
      setPlacesLoading(true);
      setPlacesError(null);
      const args = {
        lat: origin.lat,
        lng: origin.lng,
        radius: filters.radiusMeters,
        query: vice.searchQuery,
        placeTypes: vice.placeTypes,
        openNow: filters.openNow,
        maxResults: 20,
      };
      log('fetch() invoked with', { vice: vice.id, ...args });
      const t0 = Date.now();
      try {
        const raw = await nearbySearch(args);
        log(`nearbySearch returned ${raw.length} place(s) in ${Date.now() - t0}ms`);

        const enriched = raw
          .map((p) => enrich(p, origin))
          .sort((a, b) => a.distance - b.distance);

        if (enriched.length > 0) {
          log('top result', {
            name: enriched[0].name,
            distM: Math.round(enriched[0].distance),
            bearing: Math.round(enriched[0].bearing),
          });
          setTargetPlace(enriched[0]);
        } else {
          warn('no places returned');
        }
        setPlaces(enriched);
        return enriched;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        warn('fetch failed:', message);
        setPlacesError(message);
        setPlaces([]);
        throw err;
      } finally {
        setPlacesLoading(false);
      }
    },
    [filters.radiusMeters, filters.openNow, setPlaces, setPlacesLoading, setPlacesError, setTargetPlace],
  );

  return { fetch };
}
