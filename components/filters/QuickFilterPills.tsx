import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants';
import { QUICK_FILTERS } from '../../constants/filters';
import { useAppStore } from '../../store';
import { activeFilterCount } from '../../lib/searchConfig';

// Solid gold stroke. rgba on Pressable-styled pills was being dropped by
// Fabric's inner press-state clip layer; solid + inner-View wrapping
// makes the stroke render reliably across iOS/Android + New Architecture.
const STROKE_COLOR = '#d9b370';
const STROKE_W = 2;

interface Props {
  onOpenOverlay: () => void;
}

export function QuickFilterPills({ onOpenOverlay }: Props) {
  const activeSearch = useAppStore((s) => s.activeSearch);
  const lastUsedFilters = useAppStore((s) => s.lastUsedFilters);
  const toggleQuickFilter = useAppStore((s) => s.toggleQuickFilter);

  const filters = activeSearch?.filters ?? lastUsedFilters;
  const count = activeFilterCount(filters);

  return (
    <View style={styles.row}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {QUICK_FILTERS.map((def) => {
          const active = def.isActive(filters);
          return (
            <Pressable
              key={def.id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                toggleQuickFilter(def.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={def.label}
              accessibilityState={{ selected: active }}
              hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
              style={({ pressed }) => [styles.pillHit, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.pill, active && styles.pillActive]}>
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {def.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={onOpenOverlay}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Open filter overlay"
        style={({ pressed }) => [styles.iconHit, pressed && { opacity: 0.6 }]}
      >
        <View style={styles.iconBtn}>
          <MaterialCommunityIcons name="tune-variant" size={20} color={COLORS.fg} />
          {count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  scroll: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingRight: SPACING.xs,
    alignItems: 'center',
  },
  // Outer Pressable — touch + opacity feedback only.
  pillHit: {
    borderRadius: 16,
  },
  // Inner View — all visuals. Fixed height, safe radius (<half-height),
  // explicit bg so Fabric always allocates a paint layer.
  pill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    borderColor: STROKE_COLOR,
    borderWidth: STROKE_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  pillText: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  pillTextActive: {
    color: COLORS.bg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
  },
  iconHit: {
    borderRadius: 18,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    borderColor: STROKE_COLOR,
    borderWidth: STROKE_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  badgeText: {
    color: COLORS.bg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 10,
  },
});
