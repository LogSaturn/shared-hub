import { useMemo, useState } from 'react';
import {
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
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../constants';
import { VICE_CATEGORIES } from '../constants/vices';
import { Label } from '../components/ui';
import { useAppStore } from '../store';
import { Vice, ViceId } from '../types';

export default function Search() {
  const router = useRouter();
  const setSelectedVice = useAppStore((s) => s.setSelectedVice);
  const addRecentVice = useAppStore((s) => s.addRecentVice);
  const recentViceIds = useAppStore((s) => s.recentViceIds);

  const [query, setQuery] = useState('');
  const trimmed = query.trim();

  const recentVices = useMemo(
    () =>
      recentViceIds
        .map((id) => VICE_CATEGORIES.find((v) => v.id === id))
        .filter((v): v is Vice => Boolean(v)),
    [recentViceIds],
  );

  const filtered = useMemo(() => {
    if (!trimmed) return VICE_CATEGORIES;
    const q = trimmed.toLowerCase();
    return VICE_CATEGORIES.filter((v) => v.label.toLowerCase().includes(q));
  }, [trimmed]);

  const showRecents = !trimmed && recentVices.length > 0;

  function pick(vice: Vice) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedVice(vice);
    addRecentVice(vice.id);
    router.push('/loading');
  }

  function submitQuery() {
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    const match = VICE_CATEGORIES.find(
      (v) => v.label.toLowerCase() === lower || v.id === (lower as ViceId),
    );
    if (match) {
      pick(match);
      return;
    }
    pick({
      id: 'custom',
      label: trimmed,
      icon: 'magnify',
      searchQuery: trimmed,
    });
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Label>Step 01</Label>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.heading}>What are you{'\n'}craving?</Text>
        <Text style={styles.subhead}>Pick one — or type your own.</Text>

        <View style={styles.searchBar}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={COLORS.muted55}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitQuery}
            placeholder="Search vices…"
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
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={COLORS.muted55}
              />
            </Pressable>
          )}
        </View>

        {showRecents && (
          <View style={styles.section}>
            <Label style={styles.sectionLabel}>Recent</Label>
            {recentVices.map((v) => (
              <ViceRow key={`recent-${v.id}`} vice={v} onPress={() => pick(v)} />
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Label style={styles.sectionLabel}>
            {showRecents ? 'Browse' : 'All vices'}
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
                  <MaterialCommunityIcons
                    name="magnify"
                    size={22}
                    color={COLORS.gold}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Search "{trimmed}"</Text>
                  <Text style={styles.rowSubLabel}>
                    No matches — search anyway
                  </Text>
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
              <ViceRow key={v.id} vice={v} onPress={() => pick(v)} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ViceRow({ vice, onPress }: { vice: Vice; onPress: () => void }) {
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
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={COLORS.muted55}
        />
      </Pressable>
    </View>
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
  heading: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
    marginTop: SPACING.sm,
  },
  subhead: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
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
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xl,
    minHeight: 52,
  },
  searchInput: {
    flex: 1,
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 16,
    paddingVertical: 0,
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
});
