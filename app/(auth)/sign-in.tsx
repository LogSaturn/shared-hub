import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import { MIN_TOUCH } from '../../constants/layout';
import { Label } from '../../components/ui';
import { signInWithPassword, signUpWithPassword } from '../../lib/auth';
import { isUsernameAvailable, updateProfile } from '../../lib/profile';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

type Mode = 'signin' | 'signup';

const COPY: Record<Mode, { title: string; sub: string; primary: string }> = {
  signin: {
    title: 'Welcome back',
    sub: 'Sign in to save favorites and sync across devices.',
    primary: 'Sign in',
  },
  signup: {
    title: 'Create account',
    sub: 'Save favorites, sync settings, and unlock filters.',
    primary: 'Create account',
  },
};

export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const copy = COPY[mode];
  const isSignup = mode === 'signup';

  async function submit() {
    if (busy) return;
    if (email.trim().length === 0) {
      emailRef.current?.focus();
      Alert.alert('Email required', 'Enter your email address to continue.');
      return;
    }
    if (password.length === 0) {
      passwordRef.current?.focus();
      Alert.alert('Password required', 'Enter your password to continue.');
      return;
    }
    if (isSignup) {
      const normalizedUsername = username.trim().toLowerCase();
      if (!USERNAME_RE.test(normalizedUsername)) {
        usernameRef.current?.focus();
        Alert.alert(
          'Invalid username',
          '3–20 characters. Lowercase letters, numbers, and underscores only.',
        );
        return;
      }
      if (password.length < 6) {
        passwordRef.current?.focus();
        Alert.alert('Password too short', 'Use at least 6 characters.');
        return;
      }
      if (confirmPassword.length === 0) {
        confirmRef.current?.focus();
        Alert.alert('Confirm password', 'Re-enter your password to confirm.');
        return;
      }
      if (password !== confirmPassword) {
        confirmRef.current?.focus();
        Alert.alert('Passwords don’t match', 'Make sure both passwords are the same.');
        return;
      }

      // Pre-flight check. The unique index on profiles.username is the real
      // guard, but checking here lets us fail fast before creating an auth
      // user that we'd then have to clean up.
      const avail = await isUsernameAvailable(normalizedUsername);
      if (!avail.ok || !avail.data) {
        usernameRef.current?.focus();
        Alert.alert(
          'Username taken',
          'That username is already in use. Try another.',
        );
        return;
      }
    }

    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (mode === 'signin') {
      const r = await signInWithPassword(email, password);
      setBusy(false);
      if (!r.ok) return Alert.alert('Sign in failed', r.error);
      router.replace('/profile');
      return;
    }

    const normalizedUsername = username.trim().toLowerCase();
    const r = await signUpWithPassword(email, password);
    if (!r.ok) {
      setBusy(false);
      return Alert.alert('Sign up failed', r.error);
    }

    // Write username + display_name. Only safe when we have a session — if
    // email confirmation is required, supabase returns no session and the
    // RLS update would fail. In that case we stash the username locally
    // and the profile screen finishes the write after the user confirms.
    if (r.data.session) {
      const u = await updateProfile({
        username: normalizedUsername,
        display_name: normalizedUsername,
      });
      if (!u.ok) {
        // Profile row exists (auth trigger created it) — most likely cause
        // is a race where the username was claimed between pre-flight and
        // here. Surface the message but keep the user signed in.
        Alert.alert('Heads up', `Account created, but username didn't save: ${u.error}`);
      }
    }
    setBusy(false);

    if (r.data.needsConfirmation) {
      router.replace({
        pathname: '/(auth)/check-email',
        params: { email: email.trim(), username: normalizedUsername },
      });
    } else {
      router.replace('/profile');
    }
  }

  function switchMode() {
    setMode(isSignup ? 'signin' : 'signup');
    setConfirmPassword('');
    setUsername('');
    setShowConfirm(false);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
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
          <Label>Account</Label>
          <View style={{ width: 64 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>{copy.title}</Text>
          <Text style={styles.subhead}>{copy.sub}</Text>

          <View style={styles.field}>
            <Label style={styles.fieldLabel}>Email</Label>
            <View style={styles.inputRow}>
              <TextInput
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() =>
                  isSignup
                    ? usernameRef.current?.focus()
                    : passwordRef.current?.focus()
                }
                placeholder="you@example.com"
                placeholderTextColor={COLORS.muted55}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                accessibilityLabel="Email"
                style={styles.input}
              />
            </View>
          </View>

          {isSignup && (
            <View style={styles.field}>
              <Label style={styles.fieldLabel}>Username</Label>
              <View style={styles.inputRow}>
                <TextInput
                  ref={usernameRef}
                  value={username}
                  onChangeText={(v) =>
                    setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  placeholder="yourname"
                  placeholderTextColor={COLORS.muted55}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username-new"
                  textContentType="username"
                  maxLength={20}
                  returnKeyType="next"
                  accessibilityLabel="Username"
                  style={styles.input}
                />
              </View>
              <Text style={styles.fieldHint}>
                3–20 chars · lowercase, numbers, underscores
              </Text>
            </View>
          )}

          <View style={styles.field}>
            <Label style={styles.fieldLabel}>Password</Label>
            <View style={styles.inputRow}>
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={() => {
                  if (isSignup) confirmRef.current?.focus();
                  else submit();
                }}
                placeholder="••••••••"
                placeholderTextColor={COLORS.muted55}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                autoComplete={isSignup ? 'password-new' : 'password'}
                textContentType={isSignup ? 'newPassword' : 'password'}
                returnKeyType={isSignup ? 'next' : 'go'}
                accessibilityLabel="Password"
                style={styles.input}
              />
              <Pressable
                onPress={() => setShowPwd((v) => !v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={showPwd ? 'Hide password' : 'Show password'}
                style={({ pressed }) => [
                  styles.eyeBtn,
                  pressed && { opacity: 0.5 },
                ]}
              >
                <MaterialCommunityIcons
                  name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={COLORS.muted70}
                />
              </Pressable>
            </View>
          </View>

          {isSignup && (
            <View style={styles.field}>
              <Label style={styles.fieldLabel}>Confirm password</Label>
              <View style={styles.inputRow}>
                <TextInput
                  ref={confirmRef}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onSubmitEditing={submit}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.muted55}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  textContentType="newPassword"
                  returnKeyType="go"
                  accessibilityLabel="Confirm password"
                  style={styles.input}
                />
                <Pressable
                  onPress={() => setShowConfirm((v) => !v)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
                  style={({ pressed }) => [
                    styles.eyeBtn,
                    pressed && { opacity: 0.5 },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={COLORS.muted70}
                  />
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleHint}>
              {isSignup ? 'Already have an account?' : 'New here?'}
            </Text>
            <Pressable
              onPress={switchMode}
              hitSlop={8}
              style={({ pressed }) => pressed && { opacity: 0.5 }}
            >
              <Text style={styles.toggleAction}>
                {isSignup ? 'Sign in' : 'Create account'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.comingSoon}>More sign-in options coming soon</Text>
        </ScrollView>

        {/* Submit button — pinned footer with hardcoded styles. Bulletproofed
            after repeated reports of an "invisible but clickable" button:
            literal hex colors, fixed pixel height, no StyleSheet indirection,
            and manual safe-area inset (instead of a SafeAreaView wrapper that
            could clip the footer under the gesture bar). */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: insets.bottom + 24,
            backgroundColor: '#0e0f11',
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <TouchableOpacity
            onPress={submit}
            disabled={busy}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={copy.primary}
            style={{
              height: 56,
              backgroundColor: '#d9b370',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {busy ? (
              <ActivityIndicator color="#0e0f11" />
            ) : (
              <Text
                style={{
                  color: '#0e0f11',
                  fontSize: 17,
                  fontWeight: '600',
                  letterSpacing: 0.2,
                }}
              >
                {copy.primary}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const GOLD = '#d9b370';

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
    minHeight: MIN_TOUCH,
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
    paddingBottom: SPACING.lg,
  },
  heading: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    marginTop: SPACING.sm,
  },
  subhead: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 15,
    lineHeight: 21,
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  field: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  fieldHint: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 11,
    letterSpacing: 0.2,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  // Row wraps input + (optional) eye button so they're flex-laid-out
  // and the eye is vertically centered relative to the field height.
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
    minHeight: 52,
  },
  input: {
    flex: 1,
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 16,
    paddingVertical: SPACING.md,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.lg,
  },
  toggleHint: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 14,
  },
  toggleAction: {
    color: GOLD,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
  },
  comingSoon: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
    letterSpacing: 0.4,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
