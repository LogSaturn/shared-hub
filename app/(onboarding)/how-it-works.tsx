import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import { OnboardingShell } from '../../components/onboarding/OnboardingShell';

const STEPS = [
  {
    icon: 'gesture-tap',
    title: 'Pick a vice',
    body: 'Choose from a category or type your own.',
  },
  {
    icon: 'compass-outline',
    title: 'Point and walk',
    body: 'Hold the phone flat. The needle turns toward the closest match.',
  },
  {
    icon: 'map-marker-radius',
    title: 'Tap to navigate',
    body: 'Open Apple or Google Maps for turn-by-turn at any time.',
  },
] as const;

export default function HowItWorks() {
  const router = useRouter();
  return (
    <OnboardingShell
      step={1}
      total={4}
      title="How it works"
      subtitle="Three steps from craving to compass."
      onBack={() => router.back()}
      primaryLabel="Continue"
      onPrimary={() => router.push('/(onboarding)/age')}
    >
      <View style={styles.list}>
        {STEPS.map((s) => (
          <View key={s.title} style={styles.row}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons
                name={s.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={24}
                color={COLORS.gold}
              />
            </View>
            <View style={styles.text}>
              <Text style={styles.rowTitle}>{s.title}</Text>
              <Text style={styles.rowBody}>{s.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: SPACING.lg,
  },
  row: {
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
  text: {
    flex: 1,
    paddingTop: 4,
  },
  rowTitle: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 16,
    letterSpacing: -0.1,
  },
  rowBody: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
