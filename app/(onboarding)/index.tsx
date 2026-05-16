import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import { edgeHorizontal } from '../../constants/layout';
import { ViceNeedle } from '../../components/compass';
import { AGE_THRESHOLD, userAgeFromDob } from '../../lib/age';
import { updateProfile } from '../../lib/profile';
import { markOnboardingComplete, useSession } from '../../hooks';
import { ONBOARDING_DOB_KEY } from '../../hooks/useUserAge';

const TOTAL = 4;
const COPPA_FLOOR = 13;

const HOW_IT_WORKS = [
  {
    icon: 'gesture-tap' as const,
    title: 'Pick a vice',
    body: 'Choose from a category or type your own.',
  },
  {
    icon: 'compass-outline' as const,
    title: 'Point and walk',
    body: 'Hold the phone flat. The needle turns toward the closest match.',
  },
  {
    icon: 'map-marker-radius' as const,
    title: 'Tap to navigate',
    body: 'Open Apple or Google Maps for turn-by-turn at any time.',
  },
];

const LOG_VICE_BULLETS = [
  {
    icon: 'plus-circle-outline' as const,
    title: 'Log what you indulge',
    body: 'Tap + on your Account tab after any find to record it instantly.',
  },
  {
    icon: 'chart-line' as const,
    title: 'Track your patterns',
    body: 'A live chart shows every vice you log — by week, month, year, or all time.',
  },
  {
    icon: 'history' as const,
    title: 'Every vice, one place',
    body: 'Coffee, beer, boba — your full history always at a glance.',
  },
];

const PERMISSION_BULLETS = [
  {
    icon: 'map-marker-radius' as const,
    title: 'Used only for the compass',
    body: 'We translate your coordinates into a bearing and nothing more.',
  },
  {
    icon: 'cellphone-arrow-down' as const,
    title: 'Stays on your device',
    body: 'Coordinates are never written to our servers.',
  },
  {
    icon: 'cog-outline' as const,
    title: 'Change anytime',
    body: 'Disable in Settings whenever you want. The app keeps working, you just will not see distances.',
  },
];

function fillDigits(
  value: string,
  setter: (s: string) => void,
  max: number,
  next: TextInput | null,
) {
  const digits = value.replace(/\D/g, '').slice(0, max);
  setter(digits);
  if (digits.length === max) next?.focus();
}

function parseDob(m: string, d: string, y: string): Date | null {
  if (m.length === 0 || d.length === 0 || y.length !== 4) return null;
  const mi = parseInt(m, 10);
  const di = parseInt(d, 10);
  const yi = parseInt(y, 10);
  if (!Number.isFinite(mi) || !Number.isFinite(di) || !Number.isFinite(yi)) return null;
  if (mi < 1 || mi > 12) return null;
  if (di < 1 || di > 31) return null;
  if (yi < 1900 || yi > new Date().getFullYear()) return null;
  const dt = new Date(yi, mi - 1, di);
  if (
    dt.getFullYear() !== yi ||
    dt.getMonth() !== mi - 1 ||
    dt.getDate() !== di
  ) return null;
  if (dt.getTime() > Date.now()) return null;
  return dt;
}

function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Age gate modal ──────────────────────────────────────────────────────────

function AgeGateModal({
  visible,
  session,
  onComplete,
}: {
  visible: boolean;
  session: ReturnType<typeof useSession>['session'];
  onComplete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const hp = edgeHorizontal(insets);

  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);

  const monthRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const dob = useMemo(() => parseDob(month, day, year), [month, day, year]);
  const userAge = userAgeFromDob(dob);
  const fullyTyped = month.length > 0 && day.length > 0 && year.length === 4;
  const dobValid = dob !== null && userAge !== null;

  async function handleContinue() {
    if (!dobValid || !dob || userAge === null) {
      Alert.alert('Invalid date', 'Enter a real date of birth.');
      return;
    }
    if (userAge < COPPA_FLOOR) {
      Alert.alert(
        'Age requirement',
        `Vice is not available for users under ${COPPA_FLOOR}.`,
      );
      return;
    }
    setBusy(true);
    const iso = formatIsoDate(dob);
    try {
      await AsyncStorage.setItem(ONBOARDING_DOB_KEY, iso);
      if (session) await updateProfile({ birth_date: iso }).catch(() => {});
      onComplete();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <KeyboardAvoidingView
        style={[styles.ageRoot, { backgroundColor: COLORS.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.ageContent, { paddingTop: insets.top + SPACING.xl, paddingHorizontal: hp }]}>
          <Text style={styles.ageTitle}>One last step</Text>
          <Text style={styles.ageSub}>
            {`Enter your date of birth to set up your content filters. ${AGE_THRESHOLD}+ unlocks everything.`}
          </Text>

          <View style={styles.dobRow}>
            <DateField
              label="Month"
              placeholder="MM"
              value={month}
              onChangeText={(v) => fillDigits(v, setMonth, 2, dayRef.current)}
              inputRef={monthRef}
              maxLength={2}
              fieldWidth={88}
              returnKeyType="next"
            />
            <DateField
              label="Day"
              placeholder="DD"
              value={day}
              onChangeText={(v) => fillDigits(v, setDay, 2, yearRef.current)}
              inputRef={dayRef}
              maxLength={2}
              fieldWidth={88}
              returnKeyType="next"
            />
            <DateField
              label="Year"
              placeholder="YYYY"
              value={year}
              onChangeText={(v) => fillDigits(v, setYear, 4, null)}
              inputRef={yearRef}
              maxLength={4}
              fieldWidth={130}
              returnKeyType="done"
            />
          </View>

          {fullyTyped && !dobValid && (
            <Text style={styles.dobError}>That does not look like a real date.</Text>
          )}
          {dobValid && userAge !== null && (
            <Text style={userAge >= AGE_THRESHOLD ? styles.dobGood : styles.dobOk}>
              {userAge >= AGE_THRESHOLD
                ? `You are ${userAge}. All vices unlocked.`
                : `You are ${userAge}. Age-restricted vices will be hidden.`}
            </Text>
          )}

          <Text style={styles.dobPrivacy}>
            Stored on your device and, if signed in, your private profile. Never shared.
          </Text>
        </View>

        <View
          style={[
            styles.ageFooter,
            {
              paddingHorizontal: hp,
              paddingBottom: Math.max(insets.bottom, SPACING.md) + SPACING.md,
            },
          ]}
        >
          <Pressable
            onPress={handleContinue}
            disabled={!dobValid || busy}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            style={[
              styles.ageContinueBtn,
              (!dobValid || busy) && styles.ageContinueBtnDisabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={COLORS.bg} size="small" />
            ) : (
              <Text style={[styles.ageContinueText, !dobValid && styles.ageContinueTextDisabled]}>
                Continue
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Date field sub-component ─────────────────────────────────────────────────

function DateField({
  label,
  placeholder,
  value,
  onChangeText,
  inputRef,
  maxLength,
  fieldWidth,
  returnKeyType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  inputRef: React.RefObject<TextInput | null>;
  maxLength: number;
  fieldWidth: number;
  returnKeyType: 'next' | 'done';
}) {
  return (
    <View style={{ width: fieldWidth }}>
      <Text style={styles.dobLabel}>{label}</Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted40}
        keyboardType="number-pad"
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        accessibilityLabel={label}
        style={styles.dobInput}
      />
    </View>
  );
}

// ─── Main pager ───────────────────────────────────────────────────────────────

export default function OnboardingPager() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);

  function scrollToPage(n: number) {
    scrollRef.current?.scrollTo({ x: n * width, animated: true });
    setPage(n);
  }

  function handleBack() {
    if (page === 0 || busy) return;
    Haptics.selectionAsync().catch(() => {});
    scrollToPage(page - 1);
  }

  async function handleNext() {
    if (busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (page < TOTAL - 2) { scrollToPage(page + 1); return; }
    if (page === TOTAL - 2) { scrollToPage(page + 1); return; }
    if (page === TOTAL - 1) { await finishWith('request'); }
  }

  async function finishWith(action: 'request' | 'skip') {
    setBusy(true);
    try {
      if (action === 'request') {
        await Location.requestForegroundPermissionsAsync().catch(() => null);
      }
      await markOnboardingComplete();
      if (session) await updateProfile({ onboarding_completed: true }).catch(() => {});
      // Skip age gate if DOB is already stored (returning user replaying onboarding)
      const existingDob = await AsyncStorage.getItem(ONBOARDING_DOB_KEY);
      if (existingDob) {
        router.replace('/(tabs)');
      } else {
        setShowAgeGate(true);
      }
    } finally {
      setBusy(false);
    }
  }

  const nextLabels = ['Get started', 'Continue', 'Continue', 'Allow location'];
  const nextLabel = nextLabels[page] ?? 'Continue';
  const hp = edgeHorizontal(insets);

  return (
    <View style={styles.root}>
      {/* Progress dots */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm, paddingHorizontal: hp }]}>
        <View style={styles.dots}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === page && styles.dotActive, i < page && styles.dotPast]}
            />
          ))}
        </View>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setPage(idx);
        }}
        contentContainerStyle={styles.pagerContent}
        style={styles.pager}
      >
        {/* Slide 0: Welcome */}
        <View style={[styles.slide, { width, paddingHorizontal: hp }]}>
          <Text style={styles.slideTitle}>{'Welcome to\nVice.'}</Text>
          <Text style={styles.slideSubtitle}>
            A pocket compass for whatever you're craving: coffee, beer, boba, smoke. Less searching, more finding.
          </Text>
          <View style={styles.artContainer}>
            <ViceNeedle size={180} orientation="logo" />
          </View>
        </View>

        {/* Slide 1: How it works */}
        <View style={[styles.slide, { width, paddingHorizontal: hp }]}>
          <Text style={styles.slideTitle}>How it works</Text>
          <Text style={styles.slideSubtitle}>Three steps from craving to compass.</Text>
          <View style={styles.listContainer}>
            {HOW_IT_WORKS.map((s) => (
              <View key={s.title} style={styles.bulletRow}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name={s.icon} size={24} color={COLORS.gold} />
                </View>
                <View style={styles.bulletText}>
                  <Text style={styles.bulletTitle}>{s.title}</Text>
                  <Text style={styles.bulletBody}>{s.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Slide 2: Log a Vice */}
        <View style={[styles.slide, { width, paddingHorizontal: hp }]}>
          <Text style={styles.slideTitle}>{'Log your\nindulgences.'}</Text>
          <Text style={styles.slideSubtitle}>
            Found your fix? Record it. Vice tracks what you love and shows your patterns over time.
          </Text>
          <View style={styles.listContainer}>
            {LOG_VICE_BULLETS.map((b) => (
              <View key={b.title} style={styles.bulletRow}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name={b.icon} size={22} color={COLORS.gold} />
                </View>
                <View style={styles.bulletText}>
                  <Text style={styles.bulletTitle}>{b.title}</Text>
                  <Text style={styles.bulletBody}>{b.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Slide 3: Permissions */}
        <View style={[styles.slide, { width, paddingHorizontal: hp }]}>
          <Text style={styles.slideTitle}>Find what's nearby</Text>
          <Text style={styles.slideSubtitle}>
            Vice needs your location to point the compass at the closest place. We read it on-device and never store or share it.
          </Text>
          <View style={styles.listContainer}>
            {PERMISSION_BULLETS.map((b) => (
              <View key={b.title} style={styles.bulletRow}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name={b.icon} size={22} color={COLORS.gold} />
                </View>
                <View style={styles.bulletText}>
                  <Text style={styles.bulletTitle}>{b.title}</Text>
                  <Text style={styles.bulletBody}>{b.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer nav */}
      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: hp,
            paddingBottom: Math.max(insets.bottom, SPACING.md) + SPACING.md,
          },
        ]}
      >
        {page === TOTAL - 1 && (
          <Pressable
            onPress={() => { if (!busy) finishWith('skip'); }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
            style={styles.skipBtn}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        )}

        <View style={styles.navRow}>
          {/* Back — invisible on first slide so Next button stays right-aligned */}
          <Pressable
            onPress={handleBack}
            disabled={page === 0 || busy}
            accessibilityRole="button"
            accessibilityLabel="Previous slide"
            style={[styles.backBtnOuter, page === 0 && styles.backBtnInvisible]}
          >
            <View style={styles.backBtnInner}>
              <MaterialCommunityIcons name="chevron-left" size={18} color={COLORS.muted70} />
              <Text style={styles.backBtnText}>Back</Text>
            </View>
          </Pressable>

          {/* Next / action button */}
          <Pressable
            onPress={handleNext}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
            style={[styles.nextBtn, busy && styles.nextBtnDisabled]}
          >
            {busy ? (
              <ActivityIndicator color={COLORS.bg} size="small" />
            ) : (
              <Text style={styles.nextBtnText}>{nextLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Required age gate — shown after onboarding completes */}
      <AgeGateModal
        visible={showAgeGate}
        session={session}
        onComplete={() => router.replace('/(tabs)')}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    alignItems: 'center',
    paddingBottom: SPACING.md,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.muted20,
  },
  dotActive: {
    width: 18,
    backgroundColor: COLORS.gold,
  },
  dotPast: {
    backgroundColor: COLORS.muted40,
  },
  pager: {
    flex: 1,
  },
  pagerContent: {
    alignItems: 'stretch',
  },
  slide: {
    paddingTop: SPACING.lg,
  },
  slideTitle: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  slideSubtitle: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 15,
    lineHeight: 22,
    marginTop: SPACING.sm,
  },
  artContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    marginTop: SPACING.xl,
    gap: SPACING.lg,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
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
  bulletText: {
    flex: 1,
    paddingTop: 4,
  },
  bulletTitle: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 16,
    letterSpacing: -0.1,
  },
  bulletBody: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  // ── Footer ──
  footer: {
    paddingTop: SPACING.md,
    borderTopColor: COLORS.border10,
    borderTopWidth: 1,
    backgroundColor: COLORS.bg,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  skipText: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  // Back button: fixed 80px wide so nextBtn's flex:1 has room to fill
  backBtnOuter: {
    width: 80,
    height: 52,
    justifyContent: 'center',
  },
  backBtnInvisible: {
    opacity: 0,
  },
  // Inner View owns the row direction — more reliable than Pressable style on Android
  backBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backBtnText: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 15,
  },
  nextBtn: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: COLORS.muted20,
  },
  nextBtnText: {
    color: COLORS.bg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  // ── Age gate modal ──
  ageRoot: {
    flex: 1,
  },
  ageContent: {
    flex: 1,
  },
  ageTitle: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  ageSub: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 15,
    lineHeight: 22,
    marginTop: SPACING.sm,
  },
  ageFooter: {
    paddingTop: SPACING.md,
    borderTopColor: COLORS.border10,
    borderTopWidth: 1,
    backgroundColor: COLORS.bg,
  },
  ageContinueBtn: {
    height: 52,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageContinueBtnDisabled: {
    backgroundColor: COLORS.muted20,
  },
  ageContinueText: {
    color: COLORS.bg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  ageContinueTextDisabled: {
    color: COLORS.muted55,
  },
  // ── DOB fields (shared between age modal and pager) ──
  dobRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  dobLabel: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  dobInput: {
    height: 64,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 1,
  },
  dobError: {
    color: COLORS.accent,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  dobOk: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  dobGood: {
    color: COLORS.gold,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 13,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  dobPrivacy: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
});
