import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import { Label } from '../../components/ui';

export default function ComingSoon() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name="account-group-outline"
            size={48}
            color={COLORS.gold}
          />
        </View>
        <Label style={styles.label}>Coming soon</Label>
        <Text style={styles.heading}>Friends & sharing</Text>
        <Text style={styles.body}>
          Compare your vice runs, see what friends are into, and share saved searches.
          {'\n\n'}
          We're still figuring out the right shape for this one. Tap back when there's
          something to play with.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  label: {
    textAlign: 'center',
  },
  heading: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 26,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  body: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: SPACING.sm,
  },
});
