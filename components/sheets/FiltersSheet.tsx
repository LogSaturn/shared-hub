import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import {
  MIN_TOUCH,
  bottomSafePadding,
  topSafePadding,
  edgeHorizontal,
} from '../../constants/layout';
import {
  PRICE_LEVELS,
  PRICE_LEVEL_LABELS,
  RADIUS_LABELS,
  RADIUS_PRESETS_M,
  RATING_TIERS,
} from '../../constants/filters';
import type { PriceLevel, RatingTier } from '../../types/search';
import { useAppStore } from '../../store';
import { Label } from '../ui';
import { filtersEqual } from '../../lib/searchConfig';

// Solid gold stroke. We tried rgba(217,179,112,0.65) and a Fabric layer
// quirk dropped the border on Pressable-styled pills; using the solid
// gold + an inner View wrapper makes the stroke unambiguously visible.
const STROKE_COLOR = '#d9b370';
const STROKE_W = 2;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function FiltersSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const pendingFilters = useAppStore((s) => s.pendingFilters);
  const activeSearch = useAppStore((s) => s.activeSearch);
  const lastUsedFilters = useAppStore((s) => s.lastUsedFilters);
  const setPendingFilter = useAppStore((s) => s.setPendingFilter);
  const commitPendingFilters = useAppStore((s) => s.commitPendingFilters);
  const resetPendingFilters = useAppStore((s) => s.resetPendingFilters);

  const baseline = activeSearch?.filters ?? lastUsedFilters;
  const dirty = !filtersEqual(pendingFilters, baseline);

  function togglePrice(p: PriceLevel) {
    Haptics.selectionAsync().catch(() => {});
    const cur = new Set(pendingFilters.priceLevels);
    if (cur.has(p)) cur.delete(p);
    else cur.add(p);
    setPendingFilter({
      priceLevels: PRICE_LEVELS.filter((lvl) => cur.has(lvl)),
    });
  }

  function setRating(r: RatingTier | null) {
    Haptics.selectionAsync().catch(() => {});
    setPendingFilter({ minRating: pendingFilters.minRating === r ? null : r });
  }

  function setRadius(m: number) {
    Haptics.selectionAsync().catch(() => {});
    setPendingFilter({ radiusMeters: m });
  }

  function saveOrClose() {
    if (dirty) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      commitPendingFilters();
    } else {
      Haptics.selectionAsync().catch(() => {});
    }
    onClose();
  }

  function reset() {
    Haptics.selectionAsync().catch(() => {});
    resetPendingFilters();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Custom safe-area handling — full-screen modal under a translucent
          status bar means we own the top inset; SafeAreaView edges=['top']
          on Android can come back as 0 even when the status bar is visible.
          topSafePadding clamps to a sensible floor so the close button is
          never tucked under the clock. */}
      <View
        style={[
          styles.root,
          {
            paddingTop: topSafePadding(insets, SPACING.xs),
            paddingHorizontal: edgeHorizontal(insets) - SPACING.lg,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.5 }]}
          >
            <MaterialCommunityIcons name="close" size={22} color={COLORS.fg} />
          </Pressable>
          <Text style={styles.headerTitle}>Filters</Text>
          <Pressable
            onPress={reset}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Reset filters"
            style={({ pressed }) => [styles.headerTextBtn, pressed && { opacity: 0.5 }]}
          >
            <Text style={styles.headerBtnReset}>Reset</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Section label="Distance">
            <Row>
              {RADIUS_PRESETS_M.map((m) => {
                const active = pendingFilters.radiusMeters === m;
                return (
                  <Chip
                    key={m}
                    label={RADIUS_LABELS[m] ?? `${m}m`}
                    active={active}
                    onPress={() => setRadius(m)}
                  />
                );
              })}
            </Row>
          </Section>

          <Section label="Availability">
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Open now</Text>
              <Switch
                value={pendingFilters.openNow}
                onValueChange={(v) => {
                  Haptics.selectionAsync().catch(() => {});
                  setPendingFilter({ openNow: v });
                }}
                trackColor={{ false: COLORS.surface, true: COLORS.gold }}
                thumbColor={pendingFilters.openNow ? COLORS.bg : COLORS.muted55}
                ios_backgroundColor={COLORS.surface}
              />
            </View>
          </Section>

          <Section label="Minimum rating">
            <Row>
              {RATING_TIERS.map((r) => {
                const active = pendingFilters.minRating === r;
                return (
                  <Chip
                    key={r}
                    label={`${r}★+`}
                    active={active}
                    onPress={() => setRating(r)}
                  />
                );
              })}
            </Row>
          </Section>

          <Section label="Price level">
            <Row>
              {PRICE_LEVELS.map((p) => {
                const active = pendingFilters.priceLevels.includes(p);
                return (
                  <Chip
                    key={p}
                    label={PRICE_LEVEL_LABELS[p]}
                    active={active}
                    onPress={() => togglePrice(p)}
                  />
                );
              })}
            </Row>
            <Text style={styles.helper}>
              Pick one or more. Leave empty for any price.
            </Text>
          </Section>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: bottomSafePadding(insets, SPACING.xs) },
          ]}
        >
          <Pressable
            onPress={saveOrClose}
            accessibilityRole="button"
            accessibilityLabel={dirty ? 'Save filters' : 'Close filters'}
            style={({ pressed }) => [
              styles.ctaBtn,
              dirty ? styles.ctaBtnFilled : styles.ctaBtnOutlined,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.ctaText, dirty ? styles.ctaTextFilled : styles.ctaTextOutlined]}>
              {dirty ? 'Save filters' : 'Close filters'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Label style={styles.sectionLabel}>{label}</Label>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  // Touch on outer Pressable, visuals on inner View. Under Fabric (New
  // Architecture), styling borders/fills directly on Pressable can have
  // them dropped by the inner press-state clip layer — separating the
  // two avoids that entirely.
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.chipHit, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.chip, active && styles.chipActive]}>
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {label}
        </Text>
      </View>
    </Pressable>
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
    borderBottomColor: COLORS.border10,
    borderBottomWidth: 1,
  },
  headerIconBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTextBtn: {
    minWidth: 64,
    minHeight: MIN_TOUCH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 17,
  },
  headerBtnReset: {
    color: COLORS.gold,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  scrollFlex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    flexGrow: 1,
  },
  section: {
    marginBottom: SPACING.xl + SPACING.xs,
  },
  sectionLabel: {
    marginBottom: SPACING.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  // Outer hit area — no visuals, just touch & opacity feedback.
  chipHit: {
    borderRadius: 18,
  },
  // Inner visual — fixed height, safe radius (<half-height to dodge the
  // pill-mode render bug), explicit bg so Fabric always allocates a layer.
  chip: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    borderColor: STROKE_COLOR,
    borderWidth: STROKE_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  chipText: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  chipTextActive: {
    color: COLORS.bg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    borderColor: STROKE_COLOR,
    borderWidth: STROKE_W,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 60,
  },
  switchLabel: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 15,
  },
  helper: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
    marginTop: SPACING.md,
    letterSpacing: 0.2,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    borderTopColor: COLORS.border10,
    borderTopWidth: 1,
  },
  ctaBtn: {
    borderRadius: 27,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  ctaBtnFilled: {
    backgroundColor: COLORS.gold,
    borderWidth: STROKE_W,
    borderColor: COLORS.gold,
  },
  ctaBtnOutlined: {
    backgroundColor: COLORS.bg,
    borderWidth: STROKE_W,
    borderColor: STROKE_COLOR,
  },
  ctaText: {
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  ctaTextFilled: {
    color: COLORS.bg,
  },
  ctaTextOutlined: {
    color: COLORS.gold,
  },
});
