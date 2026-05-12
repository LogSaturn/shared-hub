import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ViceNeedle } from '../components/compass';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';
import { useSession } from '../hooks/useSession';
import { useAppStore } from '../store';

// Minimum time the splash stays visible. Without this, fast cold-boots flash
// the splash for a single frame which looks broken.
const MIN_VISIBLE_MS = 800;

export default function Splash() {
  const router = useRouter();
  const { loading: sessionLoading } = useSession();

  // Zustand persist hydration — gate navigation on it so /(tabs) reads a
  // populated store on first paint (recents, filters, etc.).
  const [hydrated, setHydrated] = useState(
    useAppStore.persist?.hasHydrated() ?? true,
  );
  useEffect(() => {
    if (!useAppStore.persist) return;
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (sessionLoading || !hydrated || !minElapsed) return;
    router.replace('/(tabs)');
  }, [sessionLoading, hydrated, minElapsed, router]);

  // Subtle pulse on the needle so the loading state reads as alive.
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    pulse.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) }),
          withTiming(0.55, { duration: 1200, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [pulse]);

  const labelStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <ViceNeedle size={88} orientation="logo" />
      </View>
      <Animated.View style={[styles.labelWrap, labelStyle]}>
        <Text style={styles.label}>Vice</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    position: 'absolute',
    bottom: SPACING.xxl + SPACING.lg,
    alignItems: 'center',
  },
  label: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
});
