import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import { VICE_CATEGORIES } from '../../constants/vices';
import { Label } from '../../components/ui';
import { useSession, useFavorites } from '../../hooks';
import { signOut } from '../../lib/auth';
import { getProfile, type Profile } from '../../lib/profile';
import {
  getViceSearchStats,
  type ViceSearchStats,
} from '../../lib/viceSearches';
import {
  FavoriteRow,
  PlaceSnapshot,
  ViceSnapshot,
  refIdToViceId,
} from '../../lib/favorites';
import { useAppStore } from '../../store';
import type { Place, Vice } from '../../types';
import { distanceBetween, bearingBetween } from '../../lib/bearing';

const GOLD = '#d9b370';
const DARK = '#0e0f11';

type Tab = 'places' | 'vices';

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, user, loading } = useSession();
  const { favorites, loading: favLoading } = useFavorites();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ViceSearchStats>({
    totalTrips: 0,
    distinctVices: 0,
    distanceMeters: 0,
  });
  const [tab, setTab] = useState<Tab>('places');

  const selectVice = useAppStore((s) => s.selectVice);
  const setTargetPlace = useAppStore((s) => s.setTargetPlace);
  const setPlaces = useAppStore((s) => s.setPlaces);
  const userLocation = useAppStore((s) => s.userLocation);
  const units = useAppStore((s) => s.units);

  useEffect(() => {
    if (!loading && !session) router.replace('/(auth)/sign-in');
  }, [loading, session, router]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getProfile().then((r) => {
      if (cancelled || !r.ok) return;
      setProfile(r.data);
    });
    getViceSearchStats().then((r) => {
      if (cancelled || !r.ok) return;
      setStats(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, [session, favorites.size]);

  const { placeRows, viceRows } = useMemo(() => {
    const places: FavoriteRow[] = [];
    const vices: FavoriteRow[] = [];
    for (const row of favorites.values()) {
      if (row.kind === 'place') places.push(row);
      else if (row.kind === 'vice') vices.push(row);
    }
    const byDateDesc = (a: FavoriteRow, b: FavoriteRow) =>
      b.created_at.localeCompare(a.created_at);
    return {
      placeRows: places.sort(byDateDesc),
      viceRows: vices.sort(byDateDesc),
    };
  }, [favorites]);

  async function handleSignOut() {
    const r = await signOut();
    if (!r.ok) return Alert.alert('Sign out failed', r.error);
    router.replace('/');
  }

  function pickPlace(row: FavoriteRow) {
    const snap = row.snapshot as PlaceSnapshot;
    if (!userLocation) {
      Alert.alert(
        'Location needed',
        'Open the compass first so we can navigate from your current spot.',
      );
      return;
    }
    const distance = distanceBetween(
      userLocation.lat,
      userLocation.lng,
      snap.lat,
      snap.lng,
    );
    const bearing = bearingBetween(
      userLocation.lat,
      userLocation.lng,
      snap.lat,
      snap.lng,
    );
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
      distance,
      bearing,
      distanceMi: distance / 1609.34,
    };
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
    selectVice(vice);
    router.push('/loading');
  }

  if (loading || !session) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.loading}>
          <ActivityIndicator color={GOLD} />
        </View>
      </View>
    );
  }

  const displayName =
    profile?.display_name ?? profile?.username ?? user?.email ?? '—';
  const hasName = Boolean(profile?.display_name || profile?.username);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Label>Account</Label>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: SPACING.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={48} color={GOLD} />
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {hasName && <Text style={styles.email}>{user?.email}</Text>}
          {profile?.entitlement === 'premium' && (
            <View style={styles.premiumPill}>
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <StatCard value={String(stats.distinctVices)} label="Vices" />
          <StatCard value={String(placeRows.length)} label="Places" />
          <StatCard
            value={formatStatDistance(stats.distanceMeters, units)}
            label={`Distance (${units})`}
          />
        </View>

        <View style={styles.tabs}>
          <TabBtn
            label={`Places · ${placeRows.length}`}
            active={tab === 'places'}
            onPress={() => setTab('places')}
          />
          <TabBtn
            label={`Vices · ${viceRows.length}`}
            active={tab === 'vices'}
            onPress={() => setTab('vices')}
          />
        </View>

        {favLoading && favorites.size === 0 ? (
          <View style={styles.empty}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : tab === 'places' ? (
          placeRows.length === 0 ? (
            <EmptyState
              icon="map-marker-outline"
              title="No saved places"
              sub="Tap the heart on any place to save it here."
            />
          ) : (
            placeRows.map((row) => (
              <PlaceRow key={row.id} row={row} onPress={() => pickPlace(row)} />
            ))
          )
        ) : viceRows.length === 0 ? (
          <EmptyState
            icon="heart-outline"
            title="No saved vices"
            sub="Tap the heart on any vice on the Vices tab to save it."
          />
        ) : (
          viceRows.map((row) => (
            <ViceFavRow key={row.id} row={row} onPress={() => pickVice(row)} />
          ))
        )}

        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={styles.signOut}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TabBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.tabBtn, active && styles.tabBtnActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function EmptyState({
  icon,
  title,
  sub,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  sub: string;
}) {
  return (
    <View style={styles.empty}>
      <MaterialCommunityIcons name={icon} size={40} color={COLORS.muted40} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

function PlaceRow({
  row,
  onPress,
}: {
  row: FavoriteRow;
  onPress: () => void;
}) {
  const snap = row.snapshot as PlaceSnapshot;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.favRow}
    >
      <View style={styles.favIcon}>
        <MaterialCommunityIcons name="map-marker-outline" size={22} color={GOLD} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.favTitle} numberOfLines={1}>
          {snap.name}
        </Text>
        {snap.address ? (
          <Text style={styles.favSub} numberOfLines={1}>
            {snap.address}
          </Text>
        ) : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted55} />
    </TouchableOpacity>
  );
}

function ViceFavRow({
  row,
  onPress,
}: {
  row: FavoriteRow;
  onPress: () => void;
}) {
  const snap = row.snapshot as ViceSnapshot;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.favRow}
    >
      <View style={styles.favIcon}>
        <MaterialCommunityIcons
          name={snap.icon as keyof typeof MaterialCommunityIcons.glyphMap}
          size={22}
          color={GOLD}
        />
      </View>
      <Text style={styles.favTitle} numberOfLines={1}>
        {snap.label}
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted55} />
    </TouchableOpacity>
  );
}

function formatStatDistance(meters: number, units: 'mi' | 'km'): string {
  if (units === 'mi') {
    const mi = meters / 1609.34;
    if (mi === 0) return '0';
    if (mi < 10) return mi.toFixed(1);
    return Math.round(mi).toString();
  }
  const km = meters / 1000;
  if (km === 0) return '0';
  if (km < 10) return km.toFixed(1);
  return Math.round(km).toString();
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  name: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 22,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  email: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
    marginTop: 4,
  },
  premiumPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  premiumText: {
    color: GOLD,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 76,
  },
  statValue: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  statLabel: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    padding: 4,
    marginBottom: SPACING.lg,
    borderColor: COLORS.border10,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
  },
  tabBtnActive: {
    backgroundColor: GOLD,
  },
  tabText: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: DARK,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 16,
    marginTop: SPACING.sm,
  },
  emptySub: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  favRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: 64,
  },
  favIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favTitle: {
    flex: 1,
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 15,
  },
  favSub: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
    marginTop: 2,
  },
  signOut: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.card,
    borderColor: COLORS.accentBorder,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  signOutText: {
    color: COLORS.accent,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 15,
  },
});
