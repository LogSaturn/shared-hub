import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import { OnboardingShell } from '../../components/onboarding/OnboardingShell';
import {
  AGE_THRESHOLD,
  userAgeFromDob,
} from '../../lib/age';
import { updateProfile } from '../../lib/profile';
import { useSession } from '../../hooks';
import { ONBOARDING_DOB_KEY } from '../../hooks/useUserAge';

// COPPA in the US blocks any data collection from kids under 13. Hard-block
// the flow rather than silently letting it through.
const COPPA_FLOOR = 13;

export default function Age() {
  const router = useRouter();
  const { session } = useSession();

  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);

  const monthRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  // Live-validate on every keystroke so the Continue button reflects state.
  const dob = useMemo(() => parseDob(month, day, year), [month, day, year]);
  const age = userAgeFromDob(dob);
  const fullyTyped = month.length > 0 && day.length > 0 && year.length === 4;
  const valid = dob !== null && age !== null;

  function nextOnFill(value: string, setter: (s: string) => void, max: number, next?: TextInput | null) {
    const digits = value.replace(/\D/g, '').slice(0, max);
    setter(digits);
    if (digits.length === max) next?.focus();
  }

  async function handleContinue() {
    if (!valid || !dob || age === null) {
      Alert.alert('Invalid date', 'Enter a real date of birth.');
      return;
    }
    if (age < COPPA_FLOOR) {
      Alert.alert(
        'Sorry',
        `Vice is not available for users under ${COPPA_FLOOR}.`,
      );
      return;
    }
    setBusy(true);
    const iso = formatIsoDate(dob);
    try {
      await AsyncStorage.setItem(ONBOARDING_DOB_KEY, iso);
      if (session) {
        // Best-effort write to profiles. If it fails (offline, transient),
        // local copy still drives age gating until the user signs in again.
        await updateProfile({ birth_date: iso }).catch(() => {});
      }
      router.push('/(onboarding)/permissions');
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingShell
      step={2}
      total={4}
      title="When were you born?"
      subtitle={`We use this once to filter age-restricted vices like beer, wine, and tobacco. ${AGE_THRESHOLD}+ unlocks everything.`}
      onBack={() => router.back()}
      primaryLabel="Continue"
      primaryDisabled={!valid}
      primaryBusy={busy}
      onPrimary={handleContinue}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <View style={styles.row}>
          <Field
            label="Month"
            placeholder="MM"
            value={month}
            onChangeText={(v) => nextOnFill(v, setMonth, 2, dayRef.current)}
            inputRef={monthRef}
            maxLength={2}
            width={80}
            returnKeyType="next"
          />
          <Field
            label="Day"
            placeholder="DD"
            value={day}
            onChangeText={(v) => nextOnFill(v, setDay, 2, yearRef.current)}
            inputRef={dayRef}
            maxLength={2}
            width={80}
            returnKeyType="next"
          />
          <Field
            label="Year"
            placeholder="YYYY"
            value={year}
            onChangeText={(v) => nextOnFill(v, setYear, 4, null)}
            inputRef={yearRef}
            maxLength={4}
            width={120}
            returnKeyType="done"
          />
        </View>

        {fullyTyped && !valid && (
          <Text style={styles.error}>That doesn't look like a real date.</Text>
        )}
        {valid && age !== null && (
          <Text style={age >= AGE_THRESHOLD ? styles.helperGood : styles.helperOk}>
            {age >= AGE_THRESHOLD
              ? `You're ${age}. All vices unlocked.`
              : `You're ${age}. Age-restricted vices will be hidden.`}
          </Text>
        )}

        <Text style={styles.privacy}>
          Stored on your device and (if signed in) your private profile.
          Never shared.
        </Text>
      </KeyboardAvoidingView>
    </OnboardingShell>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  inputRef,
  maxLength,
  width,
  returnKeyType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  inputRef: React.RefObject<TextInput | null>;
  maxLength: number;
  width: number;
  returnKeyType: 'next' | 'done';
}) {
  return (
    <View style={{ width }}>
      <Text style={styles.label}>{label}</Text>
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
        style={styles.input}
      />
    </View>
  );
}

// Returns a Date or null. Strict — month/day must match the input (no
// JS Date wrap-around quietly turning Feb 30 into March 2).
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
  ) {
    return null;
  }
  if (dt.getTime() > Date.now()) return null;
  return dt;
}

function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  label: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  input: {
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
  error: {
    color: COLORS.accent,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  helperOk: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  helperGood: {
    color: COLORS.gold,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 13,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  privacy: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
});
