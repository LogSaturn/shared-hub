import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../constants';
import { VICE_CATEGORIES } from '../constants/vices';
import { Label } from '../components/ui';
import { useSession, useFavorites } from '../hooks';
import { useAppStore } from '../store';
import {
  FavoriteRow,
  PlaceSnapshot,
  ViceSnapshot,
  refIdToViceId,
} from '../lib/favorites';
import type { Place, Vice } from '../types';

export default function Favorites() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const { favorites, loading } = useFavorites();
  const setSelectedVice = useAppStore((s) => s.setSelectedVice);
  const setTargetPlace = useAppStore((s) => s.setTargetPlace);
  const setPlaces = useAppStore((s) => s.setPlaces);
  const userLocation = useAppStore((s) => s.userLocation);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace('/(auth)/sign-in');
  }, [sessionLoading, session, router]);

  const { placeRows, viceRows } = useMemo(() => {
    const places: FavoriteRow[] = [];
    const vices: FavoriteRow[] = [];
    for (const row of favorites.values()) {
      if (row.kind === 'place') places.push(row);
      else if (row.kind === 'vice') vices.push(row);
    }
    const byDateDesc = (a: FavoriteRow, b: FavoriteRow) =>
      b.created_at.localeCompare(a.created_at);
    return { placeRows: places.sort(byDateDesc), viceRows: vices.sort(byDateDesc) };
  }, [favorites]);

  function pickPlace(row: FavoriteRow) {
    const snap = row.snapshot as PlaceSnapshot;
    if (!userLocation) {
      // No fix yet — can't compute distance/bearing. Send the user to /loading
      // via search, which will gather location and re-fetch with this vice.
      // Practically the favorites screen is usually visited after a session
      // where location is known; this is a safety fallback.
      router.replace('/search');
      return;
    }
    const place: Place = {
      placeId: row.ref_id,
      name: snap.name,
      address: snap.address,
      lat: snap.lat,
      lng: snap.lng,
      isOpen: null,
      rating: snap.rating,
      priceLevel: snap.priceLevel,
      photoRef: snap.photoRef,
      distance: haversineMeters(userLocation.lat, userLocation.lng, snap.lat, snap.lng),
      bearing: bearingDeg(userLocation.lat, userLocation.lng, snap.lat, snap.lng),
      distanceMi: 0,
    };
    place.distanceMi = place.distance / 1609.34;
    Haptics.selectionAsync().catch(() => {});
    setPlaces([place]);
    setTargetPlace(place);
    router.push('/compass');
  }

  function pickVice(row: FavoriteRow) {
    const snap = row.snapshot as ViceSnapshot;
    const id = refIdToViceId(row.ref_id);
    const fromCatalog = VICE_CATEGORIES.find((v) => v.id === id);
    const vice: Vice = fromCatalog ?? {
      id,
      label: snap.label,
      icon: snap.icon,
      searchQuery: snap.searchQuery,
      placeTypes: snap.placeTypes,
    };
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedVice(vice);
    router.push('/loading');
  }

  if (sessionLoading || !session) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.gold} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Label>Favorites</Label>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && favorites.size === 0 ? (
          <View style={styles.empty}>
            <ActivityIndicator color={COLORS.gold} />
          </View>
        ) : favorites.size === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="heart-outline"
              size={48}
              color={COLORS.muted40}
            />
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptySub}>
              Tap the heart on any place or vice to save it here.
            </Text>
          </View>
        ) : (
          <>
            {placeRows.length > 0 && (
              <View style={styles.section}>
                <Label style={styles.sectionLabel}>Places</Label>
                {placeRows.map((row) => {
                  const snap = row.snapshot as PlaceSnapshot;
                  return (
                    <Pressable
                      key={row.id}
                      onPress={() => pickPlace(row)}
                      style={({ pressed }) => [
                        styles.row,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View style={styles.rowIcon}>
                        <MaterialCommunityIcons
                          name="map-marker-outline"
                          size={22}
                          color={COLORS.gold}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {snap.name}
                        </Text>
                        {snap.address ? (
                          <Text style={styles.rowSub} numberOfLines={1}>
                            {snap.address}
                          </Text>
                        ) : null}
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={COLORS.muted55}
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}

            {viceRows.length > 0 && (
              <View style={styles.section}>
                <Label style={styles.sectionLabel}>Vices</Label>
                {viceRows.map((row) => {
                  const snap = row.snapshot as ViceSnapshot;
                  return (
                    <Pressable
                      key={row.id}
                      onPress={() => pickVice(row)}
                      style={({ pressed }) => [
                        styles.row,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View style={styles.rowIcon}>
                        <MaterialCommunityIcons
                          name={
                            snap.icon as keyof typeof MaterialCommunityIcons.glyphMap
                          }
                          size={22}
                          color={COLORS.gold}
                        />
                      </View>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {snap.label}
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={COLORS.muted55}
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Inline haversine + bearing — duplicated from lib/bearing to avoid pulling
// the full module into this screen; they're 6 lines each.
function toRad(d: number) {
  return (d * Math.PI) / 180;
}
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const λ1 = toRad(lng1);
  const λ2 = toRad(lng2);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: 'center',
  },
  back: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  empty: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  emptyTitle: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 18,
    marginTop: SPACING.md,
  },
  emptySub: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
    minHeight: 72,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    flex: 1,
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 15,
  },
  rowSub: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
    marginTop: 2,
  },
});
