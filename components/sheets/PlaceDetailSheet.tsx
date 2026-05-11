import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import { Label } from '../ui';
import { useAppStore } from '../../store';
import { placeDetails, PlaceDetails } from '../../lib/placesApi';
import { formatDistance, bearingToCardinal } from '../../lib/bearing';
import { useSession, useFavorites } from '../../hooks';
import { placeToSnapshot } from '../../lib/favorites';

const log = (...args: unknown[]) => console.log('[PlaceDetailSheet]', ...args);

function buildMapsUrl(lat: number, lng: number, name: string, placeId?: string) {
  const label = encodeURIComponent(name);
  if (Platform.OS === 'ios') {
    // Apple Maps deep-link with a labeled pin at the destination.
    return `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`;
  }
  // Android (and a sensible web fallback): Google Maps directions URL with
  // optional place_id to anchor the destination to the right business.
  const base = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return placeId ? `${base}&destination_place_id=${placeId}` : base;
}

export const PlaceDetailSheet = forwardRef<BottomSheetModal>(function PlaceDetailSheet(
  _props,
  ref,
) {
  const router = useRouter();
  const targetPlace = useAppStore((s) => s.targetPlace);
  const units = useAppStore((s) => s.units);
  const { session } = useSession();
  const { isFavorited, toggle } = useFavorites();

  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const favorited = targetPlace ? isFavorited('place', targetPlace.placeId) : false;

  const onToggleFavorite = async () => {
    if (!targetPlace) return;
    if (!session) {
      Alert.alert(
        'Sign in to save',
        'Create an account to save places to your favorites.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Sign in',
            onPress: () => {
              const modalRef = ref as React.RefObject<BottomSheetModal | null> | null;
              modalRef?.current?.dismiss();
              router.push('/account');
            },
          },
        ],
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const r = await toggle('place', targetPlace.placeId, placeToSnapshot(targetPlace));
    if (!r.ok && r.error) {
      Alert.alert('Could not save', r.error);
    }
  };

  const snapPoints = useMemo(() => ['62%', '92%'], []);

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

  // Fetch details on first open (and whenever target changes). The list view
  // doesn't include hours/website/phone — those come from /places/{id}.
  useEffect(() => {
    if (!targetPlace) return;
    let cancelled = false;
    setDetails(null);
    setDetailsError(null);
    setLoadingDetails(true);
    log('fetching details for', targetPlace.placeId);
    placeDetails(targetPlace.placeId)
      .then((d) => {
        if (cancelled) return;
        log('details loaded');
        setDetails(d);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        log('details failed:', msg);
        setDetailsError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetPlace?.placeId]);

  if (!targetPlace) {
    return null;
  }

  const onNavigate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const url = buildMapsUrl(
      targetPlace.lat,
      targetPlace.lng,
      targetPlace.name,
      targetPlace.placeId,
    );
    log('opening maps:', url);
    try {
      await Linking.openURL(url);
    } catch (err) {
      log('Linking.openURL failed:', err);
    }
  };

  const onClose = () => {
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
      <BottomSheetScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View style={styles.header}>
            <Label>Heading to</Label>
            <Text style={styles.name} numberOfLines={2}>
              {targetPlace.name}
            </Text>
            {targetPlace.address ? (
              <Text style={styles.addr} numberOfLines={2}>
                {targetPlace.address}
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={onToggleFavorite}
            style={({ pressed }) => [
              styles.favoriteBtn,
              favorited && styles.favoriteBtnActive,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={favorited ? 'Remove from favorites' : 'Save to favorites'}
            accessibilityState={{ selected: favorited }}
          >
            <MaterialCommunityIcons
              name={favorited ? 'heart' : 'heart-outline'}
              size={22}
              color={favorited ? COLORS.gold : COLORS.muted70}
            />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <Stat
            label="Distance"
            value={formatDistance(targetPlace.distance, units)}
          />
          <Stat
            label="Bearing"
            value={`${bearingToCardinal(targetPlace.bearing)} · ${Math.round(targetPlace.bearing)}°`}
          />
          {targetPlace.rating != null && (
            <Stat label="Rating" value={`★ ${targetPlace.rating.toFixed(1)}`} />
          )}
          {targetPlace.priceLevel != null && (
            <Stat
              label="Price"
              value={'$'.repeat(Math.max(1, targetPlace.priceLevel))}
            />
          )}
          {targetPlace.isOpen != null && (
            <Stat
              label="Status"
              value={targetPlace.isOpen ? 'Open' : 'Closed'}
              accent={targetPlace.isOpen ? COLORS.gold : COLORS.muted40}
            />
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Label>Hours</Label>
          {loadingDetails && (
            <Text style={styles.muted}>Loading hours…</Text>
          )}
          {detailsError && (
            <Text style={styles.muted}>Hours unavailable.</Text>
          )}
          {details?.weekdayDescriptions?.map((line, i) => (
            <Text key={i} style={styles.hoursLine}>
              {line}
            </Text>
          ))}
          {!loadingDetails && !detailsError && (details?.weekdayDescriptions?.length ?? 0) === 0 && (
            <Text style={styles.muted}>Hours not provided.</Text>
          )}
        </View>

        {(details?.phone || details?.websiteUri) && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Label>Contact</Label>
              {details?.phone && (
                <Text style={styles.contactLine}>{details.phone}</Text>
              )}
              {details?.websiteUri && (
                <Text style={styles.contactLine} numberOfLines={1}>
                  {details.websiteUri}
                </Text>
              )}
            </View>
          </>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={onNavigate}
            style={({ pressed }) => [
              styles.btn,
              styles.btnPrimary,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={styles.btnPrimaryText}>Navigate</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.btn,
              styles.btnGhost,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.btnGhostText}>Close</Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.stat}>
      <Label size={10}>{label}</Label>
      <Text
        style={[
          styles.statValue,
          accent ? { color: accent } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: COLORS.card,
  },
  handle: {
    backgroundColor: COLORS.muted32,
    width: 36,
    height: 4,
  },
  scroll: {
    paddingBottom: SPACING.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  header: {
    flex: 1,
    gap: 6,
  },
  favoriteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteBtnActive: {
    borderColor: COLORS.accentBorder,
    backgroundColor: COLORS.accentDim,
  },
  name: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 24,
    letterSpacing: -0.4,
  },
  addr: {
    color: COLORS.muted40,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  stat: {
    minWidth: 80,
    gap: 4,
  },
  statValue: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border06,
    marginVertical: SPACING.lg,
    marginHorizontal: SPACING.lg,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    gap: 6,
  },
  hoursLine: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
    lineHeight: 20,
  },
  contactLine: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
  },
  muted: {
    color: COLORS.muted40,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.accent,
  },
  btnPrimaryText: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: COLORS.muted32,
  },
  btnGhostText: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
    letterSpacing: 0.4,
  },
});
