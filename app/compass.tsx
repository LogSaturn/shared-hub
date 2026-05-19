import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useAnimatedSensor,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
  SensorType,
} from 'react-native-reanimated';
import Svg, { Defs, Filter, FeGaussianBlur, Ellipse } from 'react-native-svg';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { CompassRose } from '../components/compass';
import { useCompass } from '../hooks/useCompass';
import { Label } from '../components/ui';
import { NearbySheet, PlaceDetailSheet } from '../components/sheets';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';
import { MIN_TOUCH } from '../constants/layout';
import { useAppStore } from '../store';
import { formatDistance, bearingToCardinal } from '../lib/bearing';

const log = (...args: unknown[]) => console.log('[compass]', ...args);

const RAD_TO_DEG = 180 / Math.PI;
const TILT_SPRING = { damping: 18, stiffness: 130, mass: 0.6 };
const MAX_TILT_DEG = 12;
// Shadow shift per radian of sensor tilt. Shadow moves OPPOSITE to disc tilt
// to sell the illusion of a light source in front of the viewer.
const SHADOW_SHIFT_X = 52;
const SHADOW_SHIFT_Y = 52;
const MAX_SHADOW_PX = 36; // hard cap so the shadow never travels too far

// Circular dark glow — centred behind the disc, same plane. Never re-renders;
// only moves via transform (UI thread). The 500×500 SVG gives the heavy blur
// plenty of room to feather well past the 300px disc edges.
function ShadowDisc() {
  return (
    <Svg width={500} height={500} viewBox="0 0 500 500">
      <Defs>
        <Filter id="tilt-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <FeGaussianBlur in="SourceGraphic" stdDeviation="72" />
        </Filter>
      </Defs>
      <Ellipse
        cx={250}
        cy={250}
        rx={148}
        ry={148}
        fill="rgba(0,0,0,0.35)"
        filter="url(#tilt-shadow)"
      />
    </Svg>
  );
}

export default function Compass() {
  const router = useRouter();
  const activeSearch = useAppStore((s) => s.activeSearch);
  const targetPlace = useAppStore((s) => s.targetPlace);
  const places = useAppStore((s) => s.places);
  const units = useAppStore((s) => s.units);

  const targetBearing = targetPlace?.bearing ?? 0;
  const { needleRotation, dialRotation } = useCompass(targetBearing);

  // Physical tilt sensor — runs entirely on UI thread.
  const rotationSensor = useAnimatedSensor(SensorType.ROTATION, { interval: 'auto' });
  const smoothRoll = useSharedValue(0);
  const smoothPitch = useSharedValue(0);

  // Spring-smooth the raw sensor values on the UI thread. Two reactions keep
  // dependency tracking independent so one axis doesn't block the other.
  useAnimatedReaction(
    () => rotationSensor.sensor.value.roll,
    (roll) => { smoothRoll.value = withSpring(roll, TILT_SPRING); },
  );
  useAnimatedReaction(
    () => rotationSensor.sensor.value.pitch,
    (pitch) => { smoothPitch.value = withSpring(pitch, TILT_SPRING); },
  );

  // 3D perspective tilt on the compass disc.
  const compassTiltStyle = useAnimatedStyle(() => {
    const clamp = (v: number) => Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, v));
    return {
      transform: [
        { perspective: 800 },
        { rotateX: `${clamp(-smoothPitch.value * RAD_TO_DEG * 0.4)}deg` },
        { rotateY: `${clamp(smoothRoll.value * RAD_TO_DEG * 0.4)}deg` },
      ],
    };
  });

  // Shadow slides opposite to disc tilt — simulates fixed light source above.
  const shadowStyle = useAnimatedStyle(() => {
    const clampPx = (v: number) => Math.max(-MAX_SHADOW_PX, Math.min(MAX_SHADOW_PX, v));
    return {
      transform: [
        { translateX: clampPx(-smoothRoll.value * SHADOW_SHIFT_X) },
        { translateY: clampPx(-smoothPitch.value * SHADOW_SHIFT_Y) },
      ],
    };
  });

  const nearbyRef = useRef<BottomSheetModal>(null);
  const detailRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (!targetPlace) {
      log('no targetPlace — redirecting to home');
      router.replace('/(tabs)');
      return;
    }
    log(
      `target=${targetPlace.name} bearing=${targetBearing.toFixed(1)}° ` +
        `dist=${Math.round(targetPlace.distance)}m (${places.length} total)`,
    );
  }, [targetPlace, targetBearing, places.length, router]);

  if (!targetPlace) return null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Restart"
          style={styles.backBtn}
        >
          <Text style={styles.back}>‹ Restart</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Label>Vice</Label>
          <Text style={styles.vice}>{activeSearch?.label ?? '—'}</Text>
        </View>

        <Pressable
          onPress={() => {
            log('hamburger pressed → present NearbySheet');
            nearbyRef.current?.present();
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Show nearby places"
          style={styles.menuBtn}
        >
          <MaterialCommunityIcons name="menu" size={24} color={COLORS.fg} />
        </Pressable>
      </View>

      <View style={styles.center}>
        {/*
          compassArea is sized by the 300×300 compass disc (its only flow child).
          The shadow View is absolute so it doesn't affect layout; JSX order
          (shadow first) puts it behind the disc on the same z-plane.
        */}
        <View style={styles.compassArea}>
          <Animated.View
            style={[styles.shadowWrap, shadowStyle]}
            pointerEvents="none"
          >
            <ShadowDisc />
          </Animated.View>

          <Pressable
            onPress={() => {
              log('compass pressed → present PlaceDetailSheet');
              detailRef.current?.present();
            }}
          >
            <Animated.View style={[styles.compassDisc, compassTiltStyle]}>
              <CompassRose
                size={330}
                needleRotation={needleRotation}
                dialRotation={dialRotation}
              />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={() => {
          log('Heading-to block pressed → present PlaceDetailSheet');
          detailRef.current?.present();
        }}
        style={({ pressed }) => [styles.target, pressed && { opacity: 0.7 }]}
      >
        <Label style={styles.targetLabel}>Heading to</Label>
        <Text style={styles.targetName} numberOfLines={1}>
          {targetPlace.name}
        </Text>
        <Text style={styles.targetMeta}>
          {formatDistance(targetPlace.distance, units)} ·{' '}
          {bearingToCardinal(targetBearing)} · {Math.round(targetBearing)}°
        </Text>
      </Pressable>

      <NearbySheet ref={nearbyRef} />
      <PlaceDetailSheet ref={detailRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  backBtn: {
    minWidth: 80,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  back: {
    color: COLORS.muted40,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
  },
  headerCenter: {
    alignItems: 'center',
  },
  vice: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 15,
    marginTop: 4,
  },
  menuBtn: {
    minWidth: 80,
    minHeight: MIN_TOUCH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sized by the 300×300 compass disc — shadow is absolute inside it.
  compassArea: {
    alignItems: 'center',
  },
  // Shadow is centred exactly behind the 330px disc. The SVG is 500×500 so
  // left/top = -(500-330)/2 = -85 keeps it centred while giving the heavy
  // blur 85px of feather room past every edge.
  shadowWrap: {
    position: 'absolute',
    left: -85,
    top: -85,
    width: 500,
    height: 500,
  },
  compassDisc: {
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: COLORS.bg,
  },
  target: {
    alignSelf: 'stretch',
    width: '100%',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetLabel: {
    textAlign: 'center',
    alignSelf: 'center',
  },
  targetName: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 22,
    marginTop: SPACING.sm,
    letterSpacing: -0.3,
    textAlign: 'center',
    alignSelf: 'center',
    maxWidth: '100%',
  },
  targetMeta: {
    color: COLORS.muted40,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
    marginTop: SPACING.xs,
    letterSpacing: 0.4,
    textAlign: 'center',
    alignSelf: 'center',
  },
});
