import { forwardRef, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetModal,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants';
import { Label } from '../ui';
import { useAppStore } from '../../store';
import { Place } from '../../types';
import { formatDistance } from '../../lib/bearing';

interface Props {
  onPick?: (place: Place) => void;
}

export const NearbySheet = forwardRef<BottomSheetModal, Props>(function NearbySheet(
  { onPick },
  ref,
) {
  const places = useAppStore((s) => s.places);
  const targetPlace = useAppStore((s) => s.targetPlace);
  const setTargetPlace = useAppStore((s) => s.setTargetPlace);
  const units = useAppStore((s) => s.units);

  const snapPoints = useMemo(() => ['55%', '92%'], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.55}
      />
    ),
    [],
  );

  const handlePick = (place: Place) => {
    Haptics.selectionAsync().catch(() => {});
    setTargetPlace(place);
    onPick?.(place);
    const modalRef = ref as React.RefObject<BottomSheetModal | null> | null;
    modalRef?.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      enablePanDownToClose
    >
      <View style={styles.header}>
        <Label>Nearby</Label>
        <Text style={styles.title}>{places.length} place{places.length === 1 ? '' : 's'}</Text>
      </View>

      <BottomSheetFlatList
        data={places}
        keyExtractor={(p) => p.placeId}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => {
          const active = targetPlace?.placeId === item.placeId;
          const a11yLabel = [
            item.name,
            formatDistance(item.distance, units),
            item.isOpen != null ? (item.isOpen ? 'Open' : 'Closed') : null,
            active ? 'Currently selected' : null,
          ]
            .filter(Boolean)
            .join('. ');
          return (
            <Pressable
              onPress={() => handlePick(item)}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.row,
                active && styles.rowActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.body}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {active && <View style={styles.activeDot} />}
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.distance}>
                    {formatDistance(item.distance, units)}
                  </Text>
                  {item.isOpen != null && (
                    <View
                      style={[
                        styles.statusPill,
                        item.isOpen ? styles.openPill : styles.closedPill,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          item.isOpen ? styles.openText : styles.closedText,
                        ]}
                      >
                        {item.isOpen ? 'Open' : 'Closed'}
                      </Text>
                    </View>
                  )}
                  {item.rating != null && (
                    <Text style={styles.subMeta}>★ {item.rating.toFixed(1)}</Text>
                  )}
                  {item.priceLevel != null && (
                    <Text style={styles.subMeta}>
                      {'$'.repeat(Math.max(1, item.priceLevel))}
                    </Text>
                  )}
                </View>

                {item.address ? (
                  <Text style={styles.addr} numberOfLines={1}>
                    {item.address}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No places loaded.</Text>
          </View>
        }
      />
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  background: {
    backgroundColor: COLORS.card,
  },
  handle: {
    backgroundColor: COLORS.muted32,
    width: 36,
    height: 4,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border06,
    gap: 4,
  },
  title: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl + SPACING.lg,
    paddingTop: SPACING.md,
  },
  sep: {
    height: 1,
    backgroundColor: COLORS.border05,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  rowActive: {
    backgroundColor: 'rgba(217,179,112,0.04)',
  },
  body: {
    flex: 1,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  name: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 16,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  distance: {
    color: COLORS.gold,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  subMeta: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  openPill: {
    backgroundColor: 'rgba(106,191,105,0.14)',
    borderColor: 'rgba(106,191,105,0.5)',
  },
  openText: {
    color: '#7fd089',
  },
  closedPill: {
    backgroundColor: 'rgba(245,235,220,0.04)',
    borderColor: COLORS.muted20,
  },
  closedText: {
    color: COLORS.muted55,
  },
  addr: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
  },
  empty: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
  },
});
