import { useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import { ViceLogChart } from '../../components/charts/ViceLogChart';
import { useSession, useFavorites } from '../../hooks';
import { signOut } from '../../lib/auth';
import { getProfile, type Profile } from '../../lib/profile';
import { pickAndUploadAvatar, removeAvatar, type AvatarSource } from '../../lib/avatar';
import { getViceSearchStats, type ViceSearchStats } from '../../lib/viceSearches';
import {
  FavoriteRow,
  PlaceSnapshot,
  ViceSnapshot,
  refIdToViceId,
} from '../../lib/favorites';
import { addViceLog, getViceLogs, type ViceLog, type TimeRange } from '../../lib/viceLogs';
import { useAppStore } from '../../store';
import type { Place, Vice } from '../../types';
import { distanceBetween, bearingBetween } from '../../lib/bearing';

const GOLD = '#d9b370';
const DARK = '#0e0f11';

type Tab = 'places' | 'vices';

const RANGE_LABELS: { key: TimeRange; label: string }[] = [
  { key: 'wtd', label: 'WTD' },
  { key: 'mtd', label: 'MTD' },
  { key: 'ytd', label: 'YTD' },
  { key: 'all', label: 'All' },
];

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
  const [avatarBusy, setAvatarBusy] = useState(false);

  // Vice logs state
  const [logsRange, setLogsRange] = useState<TimeRange>('wtd');
  const [viceLogs, setViceLogs] = useState<ViceLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Log Vice modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedViceId, setSelectedViceId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [logBusy, setLogBusy] = useState(false);

  const selectVice = useAppStore((s) => s.selectVice);
  const setTargetPlace = useAppStore((s) => s.setTargetPlace);
  const setPlaces = useAppStore((s) => s.setPlaces);
  const userLocation = useAppStore((s) => s.userLocation);

  useEffect(() => {
    if (!loading && !session) router.replace('/(auth)/sign-in');
  }, [loading, session, router]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getProfile().then((r) => { if (!cancelled && r.ok) setProfile(r.data); });
    getViceSearchStats().then((r) => { if (!cancelled && r.ok) setStats(r.data); });
    return () => { cancelled = true; };
  }, [session, favorites.size]);

  useEffect(() => {
    if (!session) return;
    setLogsLoading(true);
    getViceLogs(logsRange).then((r) => {
      if (r.ok) setViceLogs(r.data);
      setLogsLoading(false);
    });
  }, [session, logsRange]);

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

  async function runAvatarAction(action: AvatarSource | 'remove') {
    if (avatarBusy) return;
    setAvatarBusy(true);
    try {
      Haptics.selectionAsync().catch(() => {});
      const r = action === 'remove' ? await removeAvatar() : await pickAndUploadAvatar(action);
      if (!r.ok) {
        if (r.error !== 'Cancelled.') Alert.alert('Could not update photo', r.error);
        return;
      }
      setProfile((p) =>
        p ? { ...p, avatar_url: action === 'remove' ? null : (r.data as string) } : p,
      );
    } finally {
      setAvatarBusy(false);
    }
  }

  function openAvatarSheet() {
    if (avatarBusy) return;
    const hasAvatar = Boolean(profile?.avatar_url);
    if (Platform.OS === 'ios') {
      const options = hasAvatar
        ? ['Take photo', 'Choose from library', 'Remove photo', 'Cancel']
        : ['Take photo', 'Choose from library', 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: hasAvatar ? 2 : undefined, userInterfaceStyle: 'dark' },
        (idx) => {
          if (idx === 0) runAvatarAction('camera');
          else if (idx === 1) runAvatarAction('library');
          else if (hasAvatar && idx === 2) runAvatarAction('remove');
        },
      );
      return;
    }
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Take photo', onPress: () => runAvatarAction('camera') },
      { text: 'Choose from library', onPress: () => runAvatarAction('library') },
    ];
    if (hasAvatar) buttons.push({ text: 'Remove photo', style: 'destructive', onPress: () => runAvatarAction('remove') });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile photo', 'Update or remove your photo.', buttons);
  }

  async function handleSignOut() {
    const r = await signOut();
    if (!r.ok) return Alert.alert('Sign out failed', r.error);
    router.replace('/');
  }

  async function handleLogVice() {
    if (!selectedViceId || logBusy) return;
    const vice = VICE_CATEGORIES.find((v) => v.id === selectedViceId);
    if (!vice) return;

    setLogBusy(true);
    const r = await addViceLog({ vice_id: vice.id, vice_label: vice.label, vice_icon: vice.icon, quantity });
    setLogBusy(false);

    if (!r.ok) {
      Alert.alert('Could not log vice', r.error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setShowLogModal(false);
    setSelectedViceId(null);
    setQuantity(1);

    // Refresh chart data
    getViceLogs(logsRange).then((res) => { if (res.ok) setViceLogs(res.data); });
  }

  function pickPlace(row: FavoriteRow) {
    const snap = row.snapshot as PlaceSnapshot;
    if (!userLocation) {
      Alert.alert('Location needed', 'Open the compass first so we can navigate from your current spot.');
      return;
    }
    const distance = distanceBetween(userLocation.lat, userLocation.lng, snap.lat, snap.lng);
    const bearing = bearingBetween(userLocation.lat, userLocation.lng, snap.lat, snap.lng);
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
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={GOLD} />
        </View>
      </View>
    );
  }

  const displayName = profile?.display_name ?? profile?.username ?? user?.email ?? '—';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ width: 44 }} />
        <Label>Account</Label>
        <Pressable
          onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push('/settings'); }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.5 }]}
        >
          <MaterialCommunityIcons name="cog-outline" size={22} color={COLORS.muted70} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: SPACING.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile header ──────────────────────────────────────────── */}
        <View style={styles.profileHeader}>
          <Pressable
            onPress={openAvatarSheet}
            accessibilityRole="button"
            accessibilityLabel="Edit profile photo"
            disabled={avatarBusy}
            hitSlop={10}
            style={({ pressed }) => [styles.avatarHit, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.avatar}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} accessibilityIgnoresInvertColors />
              ) : (
                <MaterialCommunityIcons name="account" size={48} color={GOLD} />
              )}
              {avatarBusy && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color={GOLD} />
                </View>
              )}
            </View>
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons name="pencil" size={14} color={DARK} />
            </View>
          </Pressable>

          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>

          {profile?.username ? (
            <Text style={styles.username}>@{profile.username}</Text>
          ) : user?.email ? (
            <Text style={styles.username}>{user.email}</Text>
          ) : null}

          {profile?.entitlement === 'premium' && (
            <View style={styles.premiumPill}>
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}
        </View>

        {/* ── Stats row ───────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard value={String(stats.distinctVices)} label="Vices" />
          <StatCard value={String(placeRows.length)} label="Places" />
        </View>

        {/* ── Log a Vice CTA ──────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setShowLogModal(true); }}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Log a Vice"
          style={styles.logViceBtn}
        >
          <MaterialCommunityIcons name="plus-circle-outline" size={20} color={DARK} />
          <Text style={styles.logViceBtnText}>Log a Vice</Text>
        </TouchableOpacity>

        {/* ── Vice history chart ─────────────────────────────────────── */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Vice History</Text>
            <View style={styles.rangeRow}>
              {RANGE_LABELS.map(({ key, label }) => (
                <Pressable
                  key={key}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setLogsRange(key); }}
                  style={({ pressed }) => [
                    styles.rangeBtn,
                    logsRange === key && styles.rangeBtnActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.rangeBtnText, logsRange === key && styles.rangeBtnTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {logsLoading ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator color={GOLD} size="small" />
            </View>
          ) : (
            <ViceLogChart logs={viceLogs} range={logsRange} />
          )}
        </View>

        {/* ── Favorites tabs ──────────────────────────────────────────── */}
        <View style={styles.tabs}>
          <TabBtn label={`Places · ${placeRows.length}`} active={tab === 'places'} onPress={() => setTab('places')} />
          <TabBtn label={`Vices · ${viceRows.length}`} active={tab === 'vices'} onPress={() => setTab('vices')} />
        </View>

        {favLoading && favorites.size === 0 ? (
          <View style={styles.empty}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : tab === 'places' ? (
          placeRows.length === 0 ? (
            <EmptyState icon="map-marker-outline" title="No saved places" sub="Tap the heart on any place to save it here." />
          ) : (
            placeRows.map((row) => <PlaceRow key={row.id} row={row} onPress={() => pickPlace(row)} />)
          )
        ) : viceRows.length === 0 ? (
          <EmptyState icon="heart-outline" title="No saved vices" sub="Tap the heart on any vice on the Vices tab to save it." />
        ) : (
          viceRows.map((row) => <ViceFavRow key={row.id} row={row} onPress={() => pickVice(row)} />)
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

      {/* ── Log Vice Modal ─────────────────────────────────────────────── */}
      <Modal visible={showLogModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLogModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalRoot}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => { Haptics.selectionAsync().catch(() => {}); setShowLogModal(false); setSelectedViceId(null); setQuantity(1); }}
                hitSlop={10}
                style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.5 }]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Log a Vice</Text>
              <View style={{ width: 64 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Vice selector */}
              <Text style={styles.modalSectionLabel}>Select a vice</Text>
              <View style={styles.viceGrid}>
                {Array.from({ length: Math.ceil(VICE_CATEGORIES.length / 2) }, (_, row) => (
                  <View key={row} style={styles.viceRow}>
                    {VICE_CATEGORIES.slice(row * 2, row * 2 + 2).map((vice) => {
                      const active = selectedViceId === vice.id;
                      return (
                        <TouchableOpacity
                          key={vice.id}
                          onPress={() => { Haptics.selectionAsync().catch(() => {}); setSelectedViceId(vice.id); }}
                          activeOpacity={0.75}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          style={[styles.viceCell, active && styles.viceCellActive]}
                        >
                          <View style={styles.viceCellIconBox}>
                            <MaterialCommunityIcons
                              name={vice.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                              size={20}
                              color={GOLD}
                            />
                          </View>
                          <Text style={[styles.viceCellLabel, active && styles.viceCellLabelActive]} numberOfLines={1}>
                            {vice.label}
                          </Text>
                          {active && (
                            <MaterialCommunityIcons name="check-circle" size={15} color={GOLD} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Quantity stepper */}
              <Text style={styles.modalSectionLabel}>How many?</Text>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => { if (quantity > 1) { Haptics.selectionAsync().catch(() => {}); setQuantity((q) => q - 1); } }}
                  disabled={quantity <= 1}
                  style={({ pressed }) => [styles.stepBtn, quantity <= 1 && styles.stepBtnDisabled, pressed && { opacity: 0.6 }]}
                  accessibilityLabel="Decrease quantity"
                >
                  <MaterialCommunityIcons name="minus" size={20} color={quantity <= 1 ? COLORS.muted40 : COLORS.fg} />
                </Pressable>
                <View style={styles.stepValue}>
                  <Text style={styles.stepValueText}>{quantity}</Text>
                </View>
                <Pressable
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setQuantity((q) => q + 1); }}
                  style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.6 }]}
                  accessibilityLabel="Increase quantity"
                >
                  <MaterialCommunityIcons name="plus" size={20} color={COLORS.fg} />
                </Pressable>
              </View>

              {/* Submit */}
              <TouchableOpacity
                onPress={handleLogVice}
                disabled={!selectedViceId || logBusy}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Log vice"
                style={[styles.logBtn, (!selectedViceId || logBusy) && styles.logBtnDisabled]}
              >
                {logBusy ? (
                  <ActivityIndicator color={selectedViceId ? DARK : COLORS.muted55} />
                ) : (
                  <Text style={[styles.logBtnText, (!selectedViceId || logBusy) && styles.logBtnTextDisabled]}>
                    {selectedViceId
                      ? `Log ${quantity > 1 ? `${quantity}x ` : ''}${VICE_CATEGORIES.find((v) => v.id === selectedViceId)?.label ?? 'Vice'}`
                      : 'Select a vice above'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyState({ icon, title, sub }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; sub: string }) {
  return (
    <View style={styles.empty}>
      <MaterialCommunityIcons name={icon} size={40} color={COLORS.muted40} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

function PlaceRow({ row, onPress }: { row: FavoriteRow; onPress: () => void }) {
  const snap = row.snapshot as PlaceSnapshot;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.favRow}>
      <View style={styles.favIcon}>
        <MaterialCommunityIcons name="map-marker-outline" size={22} color={GOLD} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.favTitle} numberOfLines={1}>{snap.name}</Text>
        {snap.address ? <Text style={styles.favSub} numberOfLines={1}>{snap.address}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted55} />
    </TouchableOpacity>
  );
}

function ViceFavRow({ row, onPress }: { row: FavoriteRow; onPress: () => void }) {
  const snap = row.snapshot as ViceSnapshot;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.favRow}>
      <View style={styles.favIcon}>
        <MaterialCommunityIcons name={snap.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={22} color={GOLD} />
      </View>
      <Text style={styles.favTitle} numberOfLines={1}>{snap.label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted55} />
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  settingsBtn: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },

  // Profile header
  profileHeader: { alignItems: 'center', marginBottom: SPACING.xl },
  avatarHit: { width: 88, height: 88, marginBottom: SPACING.md, position: 'relative' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,15,17,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GOLD,
    borderColor: DARK,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 22,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  username: {
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

  // Stats row
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
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
  logViceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: GOLD,
    borderRadius: RADIUS.md,
    height: 52,
    marginBottom: SPACING.xl,
  },
  logViceBtnText: {
    color: DARK,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 16,
  },

  // Chart section
  chartSection: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border10,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  chartTitle: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  rangeRow: { flexDirection: 'row', gap: 4 },
  rangeBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: 'transparent',
  },
  rangeBtnActive: { backgroundColor: COLORS.accentDim },
  rangeBtnText: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  rangeBtnTextActive: { color: GOLD },
  chartLoading: { height: 120, alignItems: 'center', justifyContent: 'center' },

  // Favorites tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    padding: 4,
    marginBottom: SPACING.lg,
    borderColor: COLORS.border10,
    borderWidth: 1,
  },
  tabBtn: { flex: 1, paddingVertical: SPACING.sm + 2, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.pill },
  tabBtnActive: { backgroundColor: GOLD },
  tabText: { color: COLORS.muted70, fontFamily: TYPOGRAPHY.fontFamilyMedium, fontSize: 13, letterSpacing: 0.3 },
  tabTextActive: { color: DARK, fontFamily: TYPOGRAPHY.fontFamilySemiBold },

  // Empty + fav rows
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { color: COLORS.fg, fontFamily: TYPOGRAPHY.fontFamilyMedium, fontSize: 16, marginTop: SPACING.sm },
  emptySub: { color: COLORS.muted70, fontFamily: TYPOGRAPHY.fontFamily, fontSize: 13, lineHeight: 18, textAlign: 'center' },
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
  favTitle: { flex: 1, color: COLORS.fg, fontFamily: TYPOGRAPHY.fontFamilyMedium, fontSize: 15 },
  favSub: { color: COLORS.muted55, fontFamily: TYPOGRAPHY.fontFamily, fontSize: 12, marginTop: 2 },

  // Sign out
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
  signOutText: { color: COLORS.accent, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontSize: 15 },

  // Log Vice Modal
  modalRoot: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border10,
  },
  modalCancel: { paddingVertical: 6 },
  modalCancelText: { color: COLORS.muted70, fontFamily: TYPOGRAPHY.fontFamilyMedium, fontSize: 15 },
  modalTitle: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  modalScroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  modalSectionLabel: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  viceGrid: {
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  viceRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  viceCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border10,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    minHeight: 56,
  },
  viceCellActive: {
    borderColor: GOLD,
    backgroundColor: 'rgba(217,179,112,0.10)',
  },
  viceCellIconBox: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  viceCellLabel: {
    flex: 1,
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 13,
  },
  viceCellLabelActive: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
  },

  // Quantity stepper
  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.xl },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepValue: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValueText: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 22,
    letterSpacing: -0.5,
  },

  // Log button (inside scroll, at bottom)
  logBtn: {
    backgroundColor: GOLD,
    borderRadius: RADIUS.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  logBtnDisabled: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border10,
  },
  logBtnText: {
    color: DARK,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 16,
  },
  logBtnTextDisabled: {
    color: COLORS.muted55,
  },
});
