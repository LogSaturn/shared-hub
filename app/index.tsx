import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ViceNeedle } from '../components/compass';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';

export default function Splash() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goNext = () => router.push('/search');

  const pulse = useSharedValue(0.55);
  useEffect(() => {
    pulse.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
          withTiming(0.55, { duration: 1400, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [pulse]);

  const beginAnim = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <ViceNeedle size={88} orientation="logo" />
      </View>

      <Pressable
        onPress={goNext}
        hitSlop={24}
        accessibilityRole="button"
        accessibilityLabel="Tap to begin"
        accessibilityHint="Opens vice selection"
        style={({ pressed }) => [
          styles.beginButton,
          { paddingBottom: Math.max(insets.bottom, SPACING.lg) },
          pressed && styles.beginButtonPressed,
        ]}
      >
        <Animated.View style={beginAnim}>
          <Text style={styles.beginText}>Tap to Begin</Text>
        </Animated.View>
      </Pressable>
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
  beginButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beginButtonPressed: {
    opacity: 0.5,
  },
  beginText: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
});
