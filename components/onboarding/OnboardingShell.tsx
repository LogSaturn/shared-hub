import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants';
import { MIN_TOUCH, edgeHorizontal } from '../../constants/layout';

interface Props {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryBusy?: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

// Shared chrome for every onboarding screen: progress dots, back arrow,
// title+subtitle, scrollable body, sticky footer with primary + optional
// secondary action. Footer is hard-padded by safe-area insets so the buttons
// always clear gesture bars on Android and the home indicator on iOS.
export function OnboardingShell({
  step,
  total,
  title,
  subtitle,
  children,
  onBack,
  primaryLabel,
  primaryDisabled,
  primaryBusy,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + SPACING.sm, paddingHorizontal: edgeHorizontal(insets) },
        ]}
      >
        <View style={styles.headerSide}>
          {onBack && (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onBack();
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.5 },
              ]}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={28}
                color={COLORS.fg}
              />
            </Pressable>
          )}
        </View>

        <View style={styles.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === step && styles.dotActive,
                i < step && styles.dotPast,
              ]}
            />
          ))}
        </View>

        <View style={styles.headerSide} />
      </View>

      <View style={[styles.body, { paddingHorizontal: edgeHorizontal(insets) }]}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <View style={styles.content}>{children}</View>
      </View>

      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: edgeHorizontal(insets),
            paddingBottom: Math.max(insets.bottom, SPACING.md) + SPACING.md,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            if (primaryDisabled || primaryBusy) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onPrimary();
          }}
          disabled={primaryDisabled || primaryBusy}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          accessibilityState={{ disabled: primaryDisabled || primaryBusy }}
          style={({ pressed }) => [
            styles.primary,
            primaryDisabled && styles.primaryDisabled,
            pressed && !primaryDisabled && { opacity: 0.85 },
          ]}
        >
          {primaryBusy ? (
            <ActivityIndicator color={COLORS.bg} />
          ) : (
            <Text
              style={[
                styles.primaryText,
                primaryDisabled && styles.primaryTextDisabled,
              ]}
            >
              {primaryLabel}
            </Text>
          )}
        </Pressable>

        {secondaryLabel && onSecondary && (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onSecondary();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}
            style={({ pressed }) => [
              styles.secondary,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.secondaryText}>{secondaryLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
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
    paddingBottom: SPACING.md,
  },
  headerSide: {
    width: MIN_TOUCH,
    alignItems: 'flex-start',
  },
  backBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'flex-start',
    justifyContent: 'center',
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
  body: {
    flex: 1,
    paddingTop: SPACING.lg,
  },
  title: {
    color: COLORS.fg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 15,
    lineHeight: 22,
    marginTop: SPACING.sm,
  },
  content: {
    flex: 1,
    marginTop: SPACING.xl,
  },
  footer: {
    paddingTop: SPACING.md,
    borderTopColor: COLORS.border10,
    borderTopWidth: 1,
    backgroundColor: COLORS.bg,
  },
  primary: {
    height: 56,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: {
    backgroundColor: COLORS.muted20,
  },
  primaryText: {
    color: COLORS.bg,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  primaryTextDisabled: {
    color: COLORS.muted55,
  },
  secondary: {
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  secondaryText: {
    color: COLORS.muted70,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontSize: 14,
  },
});
