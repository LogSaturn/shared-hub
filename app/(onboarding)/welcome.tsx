import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ViceNeedle } from '../../components/compass';
import { OnboardingShell } from '../../components/onboarding/OnboardingShell';

export default function Welcome() {
  const router = useRouter();
  return (
    <OnboardingShell
      step={0}
      total={4}
      title={'Welcome to\nVice.'}
      subtitle="A pocket compass that points to whatever you're craving — coffee, beer, boba, smoke. Less searching, more finding."
      primaryLabel="Get started"
      onPrimary={() => router.push('/(onboarding)/how-it-works')}
    >
      <View style={styles.art}>
        <ViceNeedle size={180} orientation="logo" />
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  art: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
