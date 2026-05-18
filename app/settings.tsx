import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../constants';
import { MIN_TOUCH } from '../constants/layout';
import { Label } from '../components/ui';
import {
  getProfile,
  updateProfile,
  isUsernameAvailable,
  type Profile,
} from '../lib/profile';
import { updateEmail, updatePassword, deleteAccount } from '../lib/auth';
import { useAppStore } from '../store';
import { useSession } from '../hooks';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// ─── Generic edit modal ───────────────────────────────────────────────────────

function EditModal({
  visible,
  title,
  saveLabel = 'Save',
  saveDisabled,
  busy,
  onClose,
  onSave,
  children,
}: {
  visible: boolean;
  title: string;
  saveLabel?: string;
  saveDisabled?: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.modalRoot, { backgroundColor: COLORS.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.modalHeader,
            { paddingTop: insets.top + SPACING.sm, paddingHorizontal: SPACING.lg },
          ]}
        >
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [styles.modalCancelBtn, pressed && { opacity: 0.5 }]}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={styles.modalHeaderSpacer} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.modalBody, { paddingHorizontal: SPACING.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        <View
          style={[
            styles.modalFooter,
            {
              paddingHorizontal: SPACING.lg,
              paddingBottom: Math.max(insets.bottom, SPACING.md) + SPACING.md,
            },
          ]}
        >
          <TouchableOpacity
            onPress={onSave}
            disabled={saveDisabled || busy}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={saveLabel}
            style={[styles.saveBtn, (saveDisabled || busy) && styles.saveBtnDisabled]}
          >
            {busy ? (
              <ActivityIndicator color={COLORS.bg} />
            ) : (
              <Text style={[styles.saveBtnText, (saveDisabled || busy) && styles.saveBtnTextDisabled]}>
                {saveLabel}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Settings section + row ───────────────────────────────────────────────────

function SettingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingRow({
  label,
  value,
  onPress,
  last,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      style={[styles.row, !last && styles.rowBorder]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.muted55} />
    </TouchableOpacity>
  );
}

function UnitsRow({ units, onChange }: { units: 'mi' | 'km'; onChange: (u: 'mi' | 'km') => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>Distance units</Text>
      <View style={styles.unitToggle}>
        {(['mi', 'km'] as const).map((u) => (
          <Pressable
            key={u}
            onPress={() => onChange(u)}
            accessibilityRole="button"
            accessibilityLabel={u === 'mi' ? 'Miles' : 'Kilometers'}
            style={[styles.unitBtn, units === u && styles.unitBtnActive]}
          >
            <Text style={[styles.unitText, units === u && styles.unitTextActive]}>{u}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, user, loading } = useSession();
  const setUnitsStore = useAppStore((s) => s.setUnits);
  const storeUnits = useAppStore((s) => s.units);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);

  // Display name modal
  const [showDisplayName, setShowDisplayName] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState('');

  // Username modal
  const [showUsername, setShowUsername] = useState(false);
  const [draftUsername, setDraftUsername] = useState('');

  // Email modal
  const [showEmail, setShowEmail] = useState(false);
  const [draftEmail, setDraftEmail] = useState('');

  // Password modal
  const [showPassword, setShowPassword] = useState(false);
  const [draftNewPw, setDraftNewPw] = useState('');
  const [draftConfirmPw, setDraftConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const newPwRef = useRef<TextInput>(null);
  const confirmPwRef = useRef<TextInput>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) { router.replace('/(tabs)'); return; }
    getProfile().then((r) => {
      if (r.ok && r.data) setProfile(r.data);
    });
  }, [session, loading, router]);

  // ── Helpers ──

  function openDisplayName() {
    setDraftDisplayName(profile?.display_name ?? '');
    setShowDisplayName(true);
  }

  function openUsername() {
    setDraftUsername(profile?.username ?? '');
    setShowUsername(true);
  }

  function openEmail() {
    setDraftEmail(user?.email ?? '');
    setShowEmail(true);
  }

  function openPassword() {
    setDraftNewPw('');
    setDraftConfirmPw('');
    setShowNewPw(false);
    setShowConfirmPw(false);
    setShowPassword(true);
  }

  async function saveDisplayName() {
    const val = draftDisplayName.trim();
    if (!val) { Alert.alert('Required', 'Display name cannot be empty.'); return; }
    setBusy(true);
    const r = await updateProfile({ display_name: val });
    setBusy(false);
    if (!r.ok) { Alert.alert('Could not save', r.error); return; }
    setProfile(r.data);
    setShowDisplayName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  async function saveUsername() {
    const val = draftUsername.trim().toLowerCase();
    if (!USERNAME_RE.test(val)) {
      Alert.alert('Invalid username', '3 to 20 characters. Lowercase letters, numbers, and underscores only.');
      return;
    }
    if (val === profile?.username) { setShowUsername(false); return; }
    setBusy(true);
    const avail = await isUsernameAvailable(val);
    if (!avail.ok || !avail.data) {
      setBusy(false);
      Alert.alert('Username taken', 'That username is already in use. Try another.');
      return;
    }
    const r = await updateProfile({ username: val });
    setBusy(false);
    if (!r.ok) { Alert.alert('Could not save', r.error); return; }
    setProfile(r.data);
    setShowUsername(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  async function saveEmail() {
    const val = draftEmail.trim();
    if (!val.includes('@')) { Alert.alert('Invalid email', 'Enter a valid email address.'); return; }
    if (val === user?.email) { setShowEmail(false); return; }
    setBusy(true);
    const r = await updateEmail(val);
    setBusy(false);
    if (!r.ok) { Alert.alert('Could not update email', r.error); return; }
    setShowEmail(false);
    Alert.alert(
      'Confirm your new email',
      `A confirmation link was sent to ${val}. Your email will update once you click it.`,
    );
  }

  async function savePassword() {
    if (draftNewPw.length < 8) {
      Alert.alert('Too short', 'Password must be at least 8 characters.');
      return;
    }
    if (draftNewPw !== draftConfirmPw) {
      Alert.alert('Passwords do not match', 'Make sure both fields are the same.');
      return;
    }
    setBusy(true);
    const r = await updatePassword(draftNewPw);
    setBusy(false);
    if (!r.ok) { Alert.alert('Could not update password', r.error); return; }
    setShowPassword(false);
    Alert.alert('Password updated', 'Your password has been changed.');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This permanently deletes your profile, vice logs, favourites, and search history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const r = await deleteAccount();
            setBusy(false);
            if (!r.ok) {
              Alert.alert('Could not delete account', r.error);
              return;
            }
            useAppStore.getState().reset();
            router.replace('/');
          },
        },
      ],
    );
  }

  async function saveUnits(u: 'mi' | 'km') {
    Haptics.selectionAsync().catch(() => {});
    setUnitsStore(u);
    await updateProfile({ units: u }).catch(() => {});
    setProfile((p) => (p ? { ...p, units: u } : p));
  }

  const units = profile?.units ?? storeUnits;

  return (
    <View style={[styles.root, { backgroundColor: COLORS.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.backText}>{'‹ Back'}</Text>
        </Pressable>
        <Label>Settings</Label>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <SettingSection title="Profile">
          <SettingRow
            label="Display name"
            value={profile?.display_name ?? undefined}
            onPress={openDisplayName}
          />
          <SettingRow
            label="Username"
            value={profile?.username ? `@${profile.username}` : undefined}
            onPress={openUsername}
          />
          <UnitsRow units={units} onChange={saveUnits} />
        </SettingSection>

        <SettingSection title="Account">
          <SettingRow
            label="Change email"
            value={user?.email ?? undefined}
            onPress={openEmail}
          />
          <SettingRow
            label="Change password"
            onPress={openPassword}
            last
          />
        </SettingSection>

        <SettingSection title="Legal">
          <SettingRow
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://sirhobby.github.io/vice-privacy/')}
          />
          <SettingRow
            label="Terms of Service"
            onPress={() => Linking.openURL('https://sirhobby.github.io/vice-privacy/terms.html')}
            last
          />
        </SettingSection>

        <TouchableOpacity
          onPress={handleDeleteAccount}
          disabled={busy}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          style={styles.deleteBtn}
        >
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Display name modal */}
      <EditModal
        visible={showDisplayName}
        title="Display name"
        busy={busy}
        saveDisabled={!draftDisplayName.trim()}
        onClose={() => setShowDisplayName(false)}
        onSave={saveDisplayName}
      >
        <Text style={styles.fieldLabel}>Display name</Text>
        <TextInput
          value={draftDisplayName}
          onChangeText={setDraftDisplayName}
          placeholder="Your name"
          placeholderTextColor={COLORS.muted55}
          autoFocus
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={saveDisplayName}
          style={styles.textInput}
        />
        <Text style={styles.fieldHint}>Shown on your profile. Max 40 characters.</Text>
      </EditModal>

      {/* Username modal */}
      <EditModal
        visible={showUsername}
        title="Username"
        busy={busy}
        saveDisabled={!USERNAME_RE.test(draftUsername.trim().toLowerCase())}
        onClose={() => setShowUsername(false)}
        onSave={saveUsername}
      >
        <Text style={styles.fieldLabel}>Username</Text>
        <TextInput
          value={draftUsername}
          onChangeText={(v) => setDraftUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder="yourname"
          placeholderTextColor={COLORS.muted55}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          returnKeyType="done"
          onSubmitEditing={saveUsername}
          style={styles.textInput}
        />
        <Text style={styles.fieldHint}>3 to 20 characters. Lowercase letters, numbers, and underscores only.</Text>
      </EditModal>

      {/* Email modal */}
      <EditModal
        visible={showEmail}
        title="Change email"
        saveLabel="Send confirmation"
        busy={busy}
        saveDisabled={!draftEmail.includes('@')}
        onClose={() => setShowEmail(false)}
        onSave={saveEmail}
      >
        <Text style={styles.fieldLabel}>New email address</Text>
        <TextInput
          value={draftEmail}
          onChangeText={setDraftEmail}
          placeholder="you@example.com"
          placeholderTextColor={COLORS.muted55}
          autoFocus
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="done"
          onSubmitEditing={saveEmail}
          style={styles.textInput}
        />
        <Text style={styles.fieldHint}>
          A confirmation link will be sent to your new address. Your email will not change until you click it.
        </Text>
      </EditModal>

      {/* Password modal */}
      <EditModal
        visible={showPassword}
        title="Change password"
        busy={busy}
        saveDisabled={draftNewPw.length < 8 || draftNewPw !== draftConfirmPw}
        onClose={() => setShowPassword(false)}
        onSave={savePassword}
      >
        <Text style={styles.fieldLabel}>New password</Text>
        <View style={styles.pwRow}>
          <TextInput
            ref={newPwRef}
            value={draftNewPw}
            onChangeText={setDraftNewPw}
            placeholder="Min 8 characters"
            placeholderTextColor={COLORS.muted55}
            autoFocus
            secureTextEntry={!showNewPw}
            autoCapitalize="none"
            autoComplete="password-new"
            returnKeyType="next"
            onSubmitEditing={() => confirmPwRef.current?.focus()}
            style={styles.pwInput}
          />
          <Pressable
            onPress={() => setShowNewPw((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={showNewPw ? 'Hide password' : 'Show password'}
            style={({ pressed }) => [styles.eyeBtn, pressed && { opacity: 0.5 }]}
          >
            <MaterialCommunityIcons
              name={showNewPw ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={COLORS.muted70}
            />
          </Pressable>
        </View>

        <Text style={[styles.fieldLabel, { marginTop: SPACING.lg }]}>Confirm password</Text>
        <View style={styles.pwRow}>
          <TextInput
            ref={confirmPwRef}
            value={draftConfirmPw}
            onChangeText={setDraftConfirmPw}
            placeholder="Re-enter new password"
            placeholderTextColor={COLORS.muted55}
            secureTextEntry={!showConfirmPw}
            autoCapitalize="none"
            autoComplete="password-new"
            returnKeyType="done"
            onSubmitEditing={savePassword}
            style={styles.pwInput}
          />
          <Pressable
            onPress={() => setShowConfirmPw((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={showConfirmPw ? 'Hide password' : 'Show password'}
            style={({ pressed }) => [styles.eyeBtn, pressed && { opacity: 0.5 }]}
          >
            <MaterialCommunityIcons
              name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={COLORS.muted70}
            />
          </Pressable>
        </View>

        {draftConfirmPw.length > 0 && draftNewPw !== draftConfirmPw && (
          <Text style={styles.pwMismatch}>Passwords do not match.</Text>
        )}
      </EditModal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomColor: COLORS.border10,
    borderBottomWidth: 1,
  },
  backBtn: {
    minWidth: 64,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  backText: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.xl,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginLeft: SPACING.sm,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 56,
    gap: SPACING.sm,
  },
  rowBorder: {
    borderBottomColor: COLORS.border10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    flex: 1,
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 15,
  },
  rowValue: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 14,
    maxWidth: 160,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: 3,
    gap: 2,
  },
  unitBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  unitBtnActive: {
    backgroundColor: COLORS.gold,
  },
  unitText: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 13,
  },
  unitTextActive: {
    color: COLORS.bg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
  },
  // ── Modals ──
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.md,
    borderBottomColor: COLORS.border10,
    borderBottomWidth: 1,
  },
  modalCancelBtn: {
    minWidth: 64,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  modalCancelText: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
  },
  modalTitle: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 16,
    letterSpacing: -0.1,
  },
  modalHeaderSpacer: {
    width: 64,
  },
  modalBody: {
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  modalFooter: {
    paddingTop: SPACING.md,
    borderTopColor: COLORS.border10,
    borderTopWidth: 1,
    backgroundColor: COLORS.bg,
  },
  saveBtn: {
    height: 52,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: COLORS.muted20,
  },
  saveBtnText: {
    color: COLORS.bg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  saveBtnTextDisabled: {
    color: COLORS.muted55,
  },
  fieldLabel: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  textInput: {
    height: 52,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 16,
  },
  fieldHint: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    marginTop: SPACING.sm,
  },
  pwRow: {
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
  pwInput: {
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
  pwMismatch: {
    color: COLORS.accent,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
    marginTop: SPACING.sm,
  },
  deleteBtn: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  deleteBtnText: {
    color: COLORS.accent,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
  },
});
