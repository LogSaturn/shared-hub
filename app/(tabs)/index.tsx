import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import { MIN_TOUCH } from '../../constants/layout';
import { VICE_CATEGORIES } from '../../constants/vices';
import { Label } from '../../components/ui';
import { ViceNeedle } from '../../components/compass';
import { QuickFilterPills } from '../../components/filters';
import { FiltersSheet } from '../../components/sheets';
import { useAppStore } from '../../store';
import { Vice } from '../../types';
import { logViceSearch } from '../../lib/viceSearches';
import { useFavorites, useSession, useUserAge } from '../../hooks';
import { viceToSnapshot } from '../../lib/favorites';
import { filterVicesForAge } from '../../lib/age';
import { getProfile } from '../../lib/profile';

// ─── Rotating titles ──────────────────────────────────────────────────────────

type TitleDef = { lines: string[]; fontSize: number; lineHeight: number };

// Maps longest-line character count to a display font size that keeps every
// title readable without overflow on a ~340px content column.
function sizeForTitle(lines: string[], nameEst = 0): TitleDef {
  const longest = Math.max(
    ...lines.map((l) => l.replace('{name}', 'x'.repeat(nameEst)).length),
  );
  let fontSize: number;
  if (longest <= 8)       fontSize = 66;
  else if (longest <= 11) fontSize = 58;
  else if (longest <= 14) fontSize = 52;
  else if (longest <= 18) fontSize = 46;
  else                    fontSize = 40;
  return { lines, fontSize, lineHeight: Math.ceil(fontSize * 1.38) };
}

// prettier-ignore
const TITLES_ANON: TitleDef[] = [
  sizeForTitle(['What are you',     "cravin'?"]),           // 12 → 40
  sizeForTitle(["What's your fix",  'tonight?']),           // 15 → 34
  sizeForTitle(['Time to',          'indulge.']),            //  8 → 54
  sizeForTitle(['What vice',        'today?']),              //  9 → 46
  sizeForTitle(['Follow your',      'cravings.']),           // 11 → 46
  sizeForTitle(['What are you',     'feeling?']),            // 12 → 40
  sizeForTitle(['Point me at',      'something good.']),     // 15 → 34
  sizeForTitle(['Ready to',         'find it?']),            //  8 → 54
  sizeForTitle(['What are you',     'hungry for?']),         // 12 → 40
  sizeForTitle(['Where to',         'next?']),               //  8 → 54
  sizeForTitle(['Name your',        'vice.']),               //  9 → 46
  sizeForTitle(["What's calling",   'your name?']),          // 14 → 40
  sizeForTitle(['Feeling something?',"Let's find it."]),     // 18 → 34
  sizeForTitle(['Your compass',     'awaits.']),             // 12 → 40
  sizeForTitle(['Something is',     'calling.']),            // 12 → 40
];

// User titles are sized with a nameEst=8 (covers typical usernames). At
// runtime {name} is replaced with the actual username before rendering.
// prettier-ignore
const TITLES_USER: TitleDef[] = [
  sizeForTitle(['What are you',       "cravin', {name}?"],    8), // 18 → 34
  sizeForTitle(['Your call,',         '{name}.'],              8), // 10 → 46
  sizeForTitle(['Ready when',         'you are, {name}.'],    8), // 18 → 34
  sizeForTitle(["What's the vice",    'tonight, {name}?'],    8), // 18 → 34
  sizeForTitle(['Where to,',          '{name}?'],              8), //  9 → 46
  sizeForTitle(['Name it,',           '{name}.'],              8), //  9 → 46
  sizeForTitle(['What are you',       "itchin' for, {name}?"],8), // 22 → 30
  sizeForTitle(['Your fix',           'awaits, {name}.'],     8), // 17 → 34
  sizeForTitle(['What vice',          'today, {name}?'],      8), // 16 → 34
  sizeForTitle(['Point the needle,',  '{name}.'],              8), // 17 → 34
  sizeForTitle(['What are you',       'feeling, {name}?'],    8), // 18 → 34
  sizeForTitle(['Good to see',        'you, {name}.'],        8), // 14 → 40
  sizeForTitle(['The compass is',     'ready, {name}.'],      8), // 14 → 40
  sizeForTitle(['Follow your',        'cravings, {name}.'],   8), // 19 → 30
  sizeForTitle(["Something's calling",'your name, {name}.'],  8), // 19 → 30
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function VicesTab() {
  const router = useRouter();
  const selectVice = useAppStore((s) => s.selectVice);
  const selectQuery = useAppStore((s) => s.selectQuery);
  const addRecentVice = useAppStore((s) => s.addRecentVice);
  const addRecentCustomQuery = useAppStore((s) => s.addRecentCustomQuery);
  const recentViceIds = useAppStore((s) => s.recentViceIds);
  const recentCustomQueries = useAppStore((s) => s.recentCustomQueries);
  const userLocation = useAppStore((s) => s.userLocation);
  const openFilterOverlay = useAppStore((s) => s.openFilterOverlay);
  const { session } = useSession();
  const { isFavorited, toggle } = useFavorites();
  const { age } = useUserAge();

  const cachedProfile = useAppStore((s) => s.cachedProfile);

  const [query, setQuery] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Display name is read from the prefetched profile cache. Falls back to a
  // live fetch only when the cache is empty (e.g. deep-link or dev hot-reload).
  // display_name takes priority; username is the fallback.
  function nameFromProfile(p: { display_name: string | null; username: string | null } | null) {
    if (!p) return null;
    return p.display_name ?? p.username ?? null;
  }

  const [displayName, setDisplayName] = useState<string | null>(
    nameFromProfile(cachedProfile),
  );

  // Pick a title index once per mount — changes on every screen remount.
  const [titleIdx] = useState(() => Math.floor(Math.random() * TITLES_ANON.length));

  useEffect(() => {
    if (cachedProfile !== null) {
      setDisplayName(nameFromProfile(cachedProfile));
      return;
    }
    if (!session) { setDisplayName(null); return; }
    let cancelled = false;
    getProfile().then((r) => {
      if (!cancelled && r.ok) setDisplayName(nameFromProfile(r.data));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [session, cachedProfile]);

  const titleDef = displayName ? TITLES_USER[titleIdx] : TITLES_ANON[titleIdx];

  const headingText = useMemo(
    () =>
      titleDef.lines
        .map((l) => (displayName ? l.replace('{name}', displayName) : l))
        .join('\n'),
    [titleDef, displayName],
  );

  const trimmed = query.trim();

  const visibleCatalog = useMemo(
    () => filterVicesForAge(VICE_CATEGORIES, age),
    [age],
  );

  const recentVices = useMemo(
    () =>
      recentViceIds
        .map((id) => visibleCatalog.find((v) => v.id === id))
        .filter((v): v is Vice => Boolean(v))
        .slice(0, 3),
    [recentViceIds, visibleCatalog],
  );

  const filtered = useMemo(() => {
    if (!trimmed) return visibleCatalog;
    const q = trimmed.toLowerCase();
    return visibleCatalog.filter((v) => v.label.toLowerCase().includes(q));
  }, [trimmed, visibleCatalog]);

  const showRecentVices = !trimmed && recentVices.length > 0;
  const showRecentQueries = !trimmed && recentCustomQueries.length > 0;

  async function onToggleViceFavorite(vice: Vice) {
    if (!session) {
      Alert.alert(
        'Sign in to save',
        'Create an account to save your favourite vices.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.push('/profile') },
        ],
      );
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    const r = await toggle('vice', vice.id, viceToSnapshot(vice));
    if (!r.ok && r.error) Alert.alert('Could not save', r.error);
  }

  function pickVice(vice: Vice) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    selectVice(vice);
    addRecentVice(vice.id);
    logViceSearch({
      viceId: vice.id,
      query: null,
      location: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null,
    }).catch(() => {});
    router.push('/loading');
  }

  function pickQuery(q: string) {
    const text = q.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    addRecentCustomQuery(text);
    selectQuery(text);
    logViceSearch({
      viceId: 'custom',
      query: text,
      location: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null,
    }).catch(() => {});
    router.push('/loading');
  }

  function submitQuery() {
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    const match = VICE_CATEGORIES.find(
      (v) => v.label.toLowerCase() === lower || v.id === lower,
    );
    if (match) return pickVice(match);
    pickQuery(trimmed);
  }

  function openFilters() {
    openFilterOverlay();
    setFilterSheetOpen(true);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── Fixed header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <ViceNeedle size={28} orientation="logo" accent={COLORS.gold} />
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            router.push('/(onboarding)');
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Help"
          style={styles.helpBtn}
        >
          <Text style={styles.helpText}>Help?</Text>
        </TouchableOpacity>
      </View>

      {/* ── Scrollable body ─────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: title + search — pushed toward vertical center */}
        <View style={styles.hero}>
          <Text
            style={[
              styles.heading,
              { fontSize: titleDef.fontSize, lineHeight: titleDef.lineHeight },
            ]}
            adjustsFontSizeToFit
            numberOfLines={3}
          >
            {headingText}
          </Text>

          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color={COLORS.muted55} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={submitQuery}
              placeholder="Search vices or type anything…"
              placeholderTextColor={COLORS.muted55}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Search vices"
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                style={({ pressed }) => pressed && { opacity: 0.5 }}
              >
                <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.muted55} />
              </Pressable>
            )}
          </View>

          <Text style={styles.tip}>
            Tip: using a category gives you better tracking and results.
          </Text>

          <View style={styles.pillsWrap}>
            <QuickFilterPills onOpenOverlay={openFilters} />
          </View>
        </View>

        {/* ── Recent vices (max 3) ──────────────────────────────────── */}
        {showRecentVices && (
          <View style={styles.section}>
            <Label style={styles.sectionLabel}>Recent vices</Label>
            {recentVices.map((v) => (
              <ViceRow
                key={`recent-${v.id}`}
                vice={v}
                favorited={isFavorited('vice', v.id)}
                onPress={() => pickVice(v)}
                onToggleFavorite={() => onToggleViceFavorite(v)}
              />
            ))}
          </View>
        )}

        {/* ── Recent searches ───────────────────────────────────────── */}
        {showRecentQueries && (
          <View style={styles.section}>
            <Label style={styles.sectionLabel}>Recent searches</Label>
            {recentCustomQueries.map((q) => (
              <Pressable
                key={`q-${q}`}
                onPress={() => pickQuery(q)}
                accessibilityRole="button"
                accessibilityLabel={`Search ${q}`}
                style={({ pressed }) => [styles.queryRow, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.queryIcon}>
                  <MaterialCommunityIcons name="history" size={20} color={COLORS.muted70} />
                </View>
                <Text style={styles.queryText} numberOfLines={1}>{q}</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color={COLORS.muted55} />
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Catalog ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Label style={styles.sectionLabel}>
            {showRecentVices || showRecentQueries ? 'Browse' : 'All vices'}
          </Label>

          {filtered.length === 0 ? (
            <View style={[styles.cardOuter, styles.emptyRow]}>
              <Pressable
                onPress={submitQuery}
                accessibilityRole="button"
                accessibilityLabel={`Search anyway for ${trimmed}`}
                style={styles.cardPress}
              >
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name="magnify" size={22} color={COLORS.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Search "{trimmed}"</Text>
                  <Text style={styles.rowSubLabel}>No matches — search anyway</Text>
                </View>
                <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.muted55} />
              </Pressable>
            </View>
          ) : (
            filtered.map((v) => (
              <ViceRow
                key={v.id}
                vice={v}
                favorited={isFavorited('vice', v.id)}
                onPress={() => pickVice(v)}
                onToggleFavorite={() => onToggleViceFavorite(v)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <FiltersSheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

// ─── ViceRow ──────────────────────────────────────────────────────────────────

function ViceRow({
  vice,
  favorited,
  onPress,
  onToggleFavorite,
}: {
  vice: Vice;
  favorited: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <View style={styles.cardOuter}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={vice.label}
        android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
        style={styles.cardPress}
      >
        <View style={styles.iconBox}>
          <MaterialCommunityIcons
            name={vice.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={24}
            color={COLORS.gold}
          />
        </View>
        <Text style={styles.rowLabel} numberOfLines={1}>{vice.label}</Text>
        <Pressable
          onPress={onToggleFavorite}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={favorited ? 'Remove from favourites' : 'Save vice to favourites'}
          accessibilityState={{ selected: favorited }}
          style={({ pressed }) => [styles.heartBtn, pressed && { opacity: 0.6 }]}
        >
          <MaterialCommunityIcons
            name={favorited ? 'heart' : 'heart-outline'}
            size={20}
            color={favorited ? COLORS.gold : COLORS.muted55}
          />
        </Pressable>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted40} />
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Fixed header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border06,
  },
  headerSpacer: {
    width: MIN_TOUCH,
  },
  helpBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  helpText: {
    color: COLORS.gold,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
  },

  // Scroll
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  // Hero section — modest top padding keeps title/search in the upper third
  hero: {
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  heading: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyDisplay,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    minHeight: 54,
  },
  searchInput: {
    flex: 1,
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 16,
    paddingVertical: SPACING.md,
  },
  tip: {
    color: COLORS.muted40,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    marginTop: SPACING.sm,
    marginLeft: 2,
    letterSpacing: 0.1,
  },
  pillsWrap: {
    marginTop: SPACING.md,
  },

  // Sections
  section: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    marginBottom: SPACING.md,
    marginLeft: 2,
  },

  // Vice card
  cardOuter: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  cardPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 72,
  },
  emptyRow: {
    borderStyle: 'dashed',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowLabel: {
    flex: 1,
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 16,
    letterSpacing: -0.1,
  },
  rowSubLabel: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  heartBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Recent query row
  queryRow: {
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
    minHeight: 60,
  },
  queryIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  queryText: {
    flex: 1,
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 15,
    letterSpacing: -0.1,
  },
});
