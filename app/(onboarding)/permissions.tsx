import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import { OnboardingShell } from '../../components/onboarding/OnboardingShell';
import { updateProfile } from '../../lib/profile';
import { markOnboardingComplete, useSession } from '../../hooks';

export default function Permissions() {
  const router = useRouter();
  const { session } = useSession();
  const [busy, setBusy] = useState(false);

  async function finishWith(action: 'request' | 'skip') {
    setBusy(true);
    try {
      if (action === 'request') {
        // Fire the OS prompt now, after we've explained why. Result doesn't
        // gate completion — denial is recoverable later from the Loading
        // screen / Settings app.
        await Location.requestForegroundPermissionsAsync().catch(() => null);
      }
      await markOnboardingComplete();
      if (session) {
        await updateProfile({ onboarding_completed: true }).catch(() => {});
      }
      router.replace('/(tabs)');
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingShell
      step={3}
      total={4}
      title="Find what's nearby"
      subtitle="Vice needs your location to point the compass at the closest place. We never share or store it — it's read on-device, only when you ask."
      onBack={() => router.back()}
      primaryLabel="Allow location"
      primaryBusy={busy}
      onPrimary={() => finishWith('request')}
      secondaryLabel="Skip for now"
      onSecondary={() => finishWith('skip')}
    >
      <View style={styles.list}>
        <Bullet
          icon="map-marker-radius"
          title="Used only for the compass"
          body="We translate your coordinates into a bearing — that's it."
        />
        <Bullet
          icon="cellphone-arrow-down"
          title="Stays on your device"
          body="Coordinates are never written to our servers."
        />
        <Bullet
          icon="cog-outline"
          title="Change anytime"
          body="Disable in Settings whenever you want — the app keeps working, you just won't see distances."
        />
      </View>
    </OnboardingShell>
  );
}

function Bullet({
  icon,
  title,
  body,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={icon} size={22} color={COLORS.gold} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
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
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 15,
  },
  body: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
});
