import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useAppStore } from '../store';
import { UserLocation } from '../types';

type Status = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export interface UseLocationResult {
  status: Status;
  location: UserLocation | null;
  error: string | null;
  request: () => Promise<UserLocation | null>;
}

const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 4000,
  distanceInterval: 8,
};

const FIX_TIMEOUT_MS = 12_000;

const log = (...args: unknown[]) => console.log('[useLocation]', ...args);
const warn = (...args: unknown[]) => console.warn('[useLocation]', ...args);

// Promise.race wrapper around getCurrentPositionAsync — Android has been
// observed to never resolve when location services are disabled but the
// permission was granted earlier, so we bail out and surface a clear error.
async function getPositionWithTimeout(): Promise<Location.LocationObject> {
  return await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    new Promise<Location.LocationObject>((_, reject) =>
      setTimeout(
        () => reject(new Error(`getCurrentPositionAsync timed out after ${FIX_TIMEOUT_MS}ms`)),
        FIX_TIMEOUT_MS,
      ),
    ),
  ]);
}

export function useLocation(opts: { autoStart?: boolean } = {}): UseLocationResult {
  const { autoStart = false } = opts;

  const setUserLocation = useAppStore((s) => s.setUserLocation);
  const storeLocation = useAppStore((s) => s.userLocation);

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const watchSub = useRef<Location.LocationSubscription | null>(null);

  const startWatch = useCallback(async () => {
    if (watchSub.current) return;
    log('starting watch subscription');
    watchSub.current = await Location.watchPositionAsync(WATCH_OPTIONS, (pos) => {
      setUserLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? 0,
        timestamp: pos.timestamp,
      });
    });
  }, [setUserLocation]);

  const request = useCallback(async (): Promise<UserLocation | null> => {
    log('request() called');
    setStatus('requesting');
    setError(null);
    try {
      const t0 = Date.now();
      const { status: permStatus } =
        await Location.requestForegroundPermissionsAsync();
      log(`permission status=${permStatus} (${Date.now() - t0}ms)`);
      if (permStatus !== 'granted') {
        setStatus('denied');
        setError('Location permission denied');
        return null;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      log(`hasServicesEnabledAsync=${servicesEnabled}`);
      if (!servicesEnabled) {
        setStatus('error');
        setError('Location services are turned off on this device.');
        warn('location services disabled');
        return null;
      }

      const t1 = Date.now();
      const pos = await getPositionWithTimeout();
      log(`getCurrentPositionAsync ok (${Date.now() - t1}ms)`, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        acc: pos.coords.accuracy,
      });

      const loc: UserLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? 0,
        timestamp: pos.timestamp,
      };
      setUserLocation(loc);
      setStatus('granted');
      void startWatch();
      return loc;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warn('request() failed:', msg);
      setStatus('error');
      setError(msg);
      return null;
    }
  }, [setUserLocation, startWatch]);

  useEffect(() => {
    if (autoStart) void request();
    return () => {
      if (watchSub.current) {
        log('removing watch subscription');
        watchSub.current.remove();
        watchSub.current = null;
      }
    };
  }, [autoStart, request]);

  return { status, location: storeLocation, error, request };
}
