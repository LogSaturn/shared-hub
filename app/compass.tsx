import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { CompassRose } from '../components/compass';
import { useCompass } from '../hooks/useCompass';
import { Label } from '../components/ui';
import { NearbySheet, PlaceDetailSheet } from '../components/sheets';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';
import { useAppStore } from '../store';
import { formatDistance, bearingToCardinal } from '../lib/bearing';

const log = (...args: unknown[]) => console.log('[compass]', ...args);

export default function Compass() {
  const router = useRouter();
  const activeSearch = useAppStore((s) => s.activeSearch);
  const targetPlace = useAppStore((s) => s.targetPlace);
  const places = useAppStore((s) => s.places);
  const units = useAppStore((s) => s.units);

  const targetBearing = targetPlace?.bearing ?? 0;
  const { needleRotation, dialRotation } = useCompass(targetBearing);

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
        <Pressable onPress={() => router.replace('/(tabs)')} hitSlop={12}>
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
          style={styles.menuBtn}
        >
          <MaterialCommunityIcons name="menu" size={24} color={COLORS.fg} />
        </Pressable>
      </View>

      <Pressable
        style={styles.center}
        onPress={() => {
          log('compass pressed → present PlaceDetailSheet');
          detailRef.current?.present();
        }}
      >
        <CompassRose
          size={300}
          needleRotation={needleRotation}
          dialRotation={dialRotation}
        />
      </Pressable>

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
  back: {
    color: COLORS.muted40,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
    minWidth: 64,
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
    minWidth: 64,
    alignItems: 'flex-end',
    paddingVertical: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
