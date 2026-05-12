import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ViceNeedle } from '../components/compass';
import { Label } from '../components/ui';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';
import { useAppStore } from '../store';
import { useLocation, usePlaces } from '../hooks';

type Step =
  | 'idle'
  | 'requesting_location'
  | 'fetching_places'
  | 'almost_there'
  | 'success'
  | 'denied'
  | 'no_places'
  | 'error';

const STEP_TEXT: Record<Step, string> = {
  idle: 'Starting…',
  requesting_location: 'Locating you…',
  fetching_places: 'Searching nearby…',
  almost_there: 'Pointing the way…',
  success: 'Found it.',
  denied: 'Location permission required.',
  no_places: "Sorry, couldn't find places near you.",
  error: 'Something went wrong.',
};

const MIN_VISIBLE_MS = 1200;
const HARD_TIMEOUT_MS = 30_000;

const log = (...args: unknown[]) => console.log('[loading]', ...args);
const warn = (...args: unknown[]) => console.warn('[loading]', ...args);

export default function Loading() {
  const router = useRouter();
  const activeSearch = useAppStore((s) => s.activeSearch);

  const ringA = useSharedValue(0);
  const ringB = useSharedValue(0);

  const [step, setStep] = useState<Step>('idle');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [placesCount, setPlacesCount] = useState<number | null>(null);
  // Bumped by the Retry button to force the run() effect to re-fire. We can't
  // rely on router.replace('/loading') from inside /loading — same-href replace
  // is a no-op in expo-router and the effect won't re-run.
  const [attempt, setAttempt] = useState(0);

  const { request: requestLocation } = useLocation();
  const { fetch: fetchPlaces } = usePlaces();

  const mountedRef = useRef(true);
  const startedRef = useRef(false);

  // Helper that logs every step transition so we can see exactly where we are.
  const advance = (next: Step, detail?: string | null) => {
    if (!mountedRef.current) {
      log(`(unmounted) refused step → ${next}`);
      return;
    }
    log(`step → ${next}${detail ? ` (${detail})` : ''}`);
    setStep(next);
    if (detail !== undefined) setErrorDetail(detail);
  };

  useEffect(() => {
    log('================ MOUNT ================');
    log('activeSearch =', activeSearch ? `${activeSearch.kind} / ${activeSearch.label}` : 'null');

    if (!activeSearch) {
      warn('no activeSearch — bouncing to tabs');
      router.replace('/(tabs)');
      return;
    }

    ringA.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    ringB.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    const stagger = setTimeout(() => {
      ringB.value = 0;
      ringB.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
    }, 900);

    const hardTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      warn(`HARD TIMEOUT after ${HARD_TIMEOUT_MS}ms — current step:`, step);
      advance('error', `Timed out after ${HARD_TIMEOUT_MS / 1000}s.`);
    }, HARD_TIMEOUT_MS);

    const run = async () => {
      if (startedRef.current) {
        log('run() skipped — already started');
        return;
      }
      startedRef.current = true;
      log('run() start');

      const startedAt = Date.now();

      // ---- step 1: location ----
      advance('requesting_location');
      let loc;
      try {
        loc = await requestLocation();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        warn('requestLocation threw:', msg);
        advance('error', `Location error: ${msg}`);
        return;
      }
      log('requestLocation resolved:', loc);
      if (!mountedRef.current) return;
      if (!loc) {
        advance('denied', 'Location permission was denied or unavailable.');
        return;
      }
      if (
        typeof loc.lat !== 'number' ||
        typeof loc.lng !== 'number' ||
        Number.isNaN(loc.lat) ||
        Number.isNaN(loc.lng) ||
        (loc.lat === 0 && loc.lng === 0)
      ) {
        warn('invalid location:', loc);
        advance('error', `Invalid GPS reading: lat=${loc.lat} lng=${loc.lng}`);
        return;
      }
      log(`location ok: lat=${loc.lat.toFixed(5)} lng=${loc.lng.toFixed(5)} acc=${loc.accuracy}`);

      // ---- step 2: fetch places ----
      advance('fetching_places');
      let places;
      try {
        places = await fetchPlaces(activeSearch, loc);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        warn('fetchPlaces threw:', msg);
        advance('error', msg);
        return;
      }
      log(`fetchPlaces resolved: ${places.length} place(s)`);
      if (!mountedRef.current) return;
      setPlacesCount(places.length);

      if (places.length === 0) {
        advance('no_places');
        return;
      }

      // ---- step 3: hold briefly so the user sees "Pointing the way…" ----
      advance('almost_there');
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      log(`waiting ${wait}ms for min-visible window`);
      setTimeout(() => {
        if (!mountedRef.current) {
          log('unmounted before nav — skipping');
          return;
        }
        advance('success');
        log('navigating → /compass');
        router.replace('/compass');
      }, wait);
    };
    void run();

    return () => {
      log('================ UNMOUNT ================');
      mountedRef.current = false;
      clearTimeout(stagger);
      clearTimeout(hardTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSearch, attempt]);

  const ringStyleA = useAnimatedStyle(() => ({
    opacity: 1 - ringA.value,
    transform: [{ scale: 0.6 + ringA.value * 0.9 }],
  }));
  const ringStyleB = useAnimatedStyle(() => ({
    opacity: 1 - ringB.value,
    transform: [{ scale: 0.6 + ringB.value * 0.9 }],
  }));

  const isFailure = step === 'denied' || step === 'no_places' || step === 'error';

  const onRetry = () => {
    log('retry tapped');
    startedRef.current = false;
    mountedRef.current = true;
    setErrorDetail(null);
    setPlacesCount(null);
    setStep('idle');
    setAttempt((a) => a + 1);
  };

  if (!activeSearch) return null;

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        {!isFailure && <Animated.View style={[styles.ring, ringStyleA]} />}
        {!isFailure && <Animated.View style={[styles.ring, ringStyleB]} />}
        <ViceNeedle size={76} orientation="logo" />
      </View>

      <View style={styles.statusBlock}>
        <Label>{isFailure ? 'Problem' : 'Seeking'}</Label>
        <Text style={styles.viceName}>{activeSearch.label}</Text>
        <Text style={[styles.phase, isFailure && styles.phaseError]}>
          {STEP_TEXT[step]}
        </Text>

        {errorDetail && (
          <Text style={styles.errorDetail} numberOfLines={4}>
            {errorDetail}
          </Text>
        )}

        {placesCount === 0 && step === 'no_places' && (
          <Text style={styles.errorDetail}>0 results returned.</Text>
        )}

        {isFailure && (
          <View style={styles.retryRow}>
            <Pressable
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry"
              hitSlop={8}
              style={({ pressed }) => [
                styles.retryBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/(tabs)')}
              accessibilityRole="button"
              accessibilityLabel="Back to search"
              hitSlop={8}
              style={({ pressed }) => [
                styles.retryBtn,
                styles.retryBtnGhost,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.retryText}>Back</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  center: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: COLORS.accentBorder,
  },
  statusBlock: {
    position: 'absolute',
    bottom: SPACING.xxl * 2 + SPACING.xl,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  viceName: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 22,
    marginTop: SPACING.md,
  },
  phase: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 14,
    marginTop: SPACING.md,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  phaseError: {
    color: '#e07b7b',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  errorDetail: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
    marginTop: SPACING.sm,
    letterSpacing: 0.2,
    textAlign: 'center',
    maxWidth: 280,
  },
  retryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.lg,
  },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 999,
    backgroundColor: COLORS.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  retryText: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
  },
});
