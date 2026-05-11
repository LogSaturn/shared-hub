import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import { Label } from '../../components/ui';
import { signInWithMagicLink } from '../../lib/auth';

export default function CheckEmail() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [resending, setResending] = useState(false);

  async function resend() {
    if (!email || resending) return;
    setResending(true);
    const r = await signInWithMagicLink(email);
    setResending(false);
    if (!r.ok) return Alert.alert('Resend failed', r.error);
    Alert.alert('Sent', 'Check your inbox for a new link.');
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace('/(auth)/sign-in')}
          hitSlop={16}
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

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="email-outline" size={40} color={COLORS.gold} />
        </View>

        <Text style={styles.heading}>Check your inbox</Text>
        <Text style={styles.subhead}>
          {email
            ? `We sent a link to ${email}. Tap it to finish signing in.`
            : 'We sent you a link. Tap it to finish signing in.'}
        </Text>

        <Pressable
          onPress={resend}
          disabled={!email || resending}
          style={({ pressed }) => [
            styles.secondary,
            (!email || resending) && { opacity: 0.4 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.secondaryText}>
            {resending ? 'Sending…' : 'Resend link'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(auth)/sign-in')}
          hitSlop={8}
          style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.link}>Use a different email</Text>
        </Pressable>
      </View>
    </SafeAreaView>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  heading: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subhead: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  secondary: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 15,
  },
  linkBtn: {
    marginTop: SPACING.lg,
  },
  link: {
    color: COLORS.gold,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
  },
});
