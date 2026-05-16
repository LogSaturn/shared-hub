import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import { VICE_CATEGORIES } from '../../constants/vices';
import { Label } from '../../components/ui';
import { QuickFilterPills } from '../../components/filters';
import { FiltersSheet } from '../../components/sheets';
import { useAppStore } from '../../store';
import { Vice } from '../../types';
import { logViceSearch } from '../../lib/viceSearches';
import { useFavorites, useSession, useUserAge } from '../../hooks';
import { viceToSnapshot } from '../../lib/favorites';
import { filterVicesForAge } from '../../lib/age';

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

  const [query, setQuery] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const trimmed = query.trim();

  // The catalog is filtered before everything else so age-restricted vices
  // never appear in browse, recents, or empty-state suggestions.
  const visibleCatalog = useMemo(
    () => filterVicesForAge(VICE_CATEGORIES, age),
    [age],
  );

  const recentVices = useMemo(
    () =>
      recentViceIds
        .map((id) => visibleCatalog.find((v) => v.id === id))
        .filter((v): v is Vice => Boolean(v)),
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
        'Create an account to save your favorite vices.',
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
      location: userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : null,
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
      location: userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : null,
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Label>Vices</Label>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              router.push('/(onboarding)');
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Help"
            style={({ pressed }) => [styles.helpBtn, pressed && { opacity: 0.5 }]}
          >
            <Text style={styles.helpText}>Help?</Text>
          </Pressable>
        </View>

        <Text style={styles.heading}>What are you{'\n'}craving?</Text>

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
                <Text style={styles.queryText} numberOfLines={1}>
                  {q}
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color={COLORS.muted55} />
              </Pressable>
            ))}
          </View>
        )}

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
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color={COLORS.muted55}
                />
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
        <Text style={styles.rowLabel} numberOfLines={1}>
          {vice.label}
        </Text>
        <Pressable
          onPress={onToggleFavorite}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={favorited ? 'Remove from favorites' : 'Save vice to favorites'}
          accessibilityState={{ selected: favorited }}
          style={({ pressed }) => [styles.heartBtn, pressed && { opacity: 0.6 }]}
        >
          <MaterialCommunityIcons
            name={favorited ? 'heart' : 'heart-outline'}
            size={20}
            color={favorited ? COLORS.gold : COLORS.muted55}
          />
        </Pressable>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted55} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  headerSpacer: {
    width: 48,
  },
  helpBtn: {
    width: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 36,
  },
  helpText: {
    color: COLORS.gold,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
  },
  heading: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    marginTop: SPACING.sm,
  },
  searchBar: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    minHeight: 52,
  },
  searchInput: {
    flex: 1,
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 16,
    paddingVertical: 0,
  },
  tip: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    marginTop: SPACING.sm,
    marginLeft: SPACING.xs,
    letterSpacing: 0.1,
  },
  pillsWrap: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
  },
  cardOuter: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  cardPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    minHeight: 76,
  },
  emptyRow: {
    borderStyle: 'dashed',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 16,
    letterSpacing: -0.1,
  },
  rowSubLabel: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  heartBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
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
    minHeight: 56,
  },
  queryIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queryText: {
    flex: 1,
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 15,
    letterSpacing: -0.1,
  },
});
