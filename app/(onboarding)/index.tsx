import { Redirect } from 'expo-router';

// Group entry redirects to the first onboarding step. Lets us point splash
// at /(onboarding) without committing to a specific filename.
export default function OnboardingIndex() {
  return <Redirect href="/(onboarding)/welcome" />;
}
