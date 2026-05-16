import { Platform } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { SPACING } from './spacing';

// Touch-target minimums per platform HIG. Apple HIG = 44pt;
// Material 3 = 48dp. Use this for any tappable square (icon buttons,
// header chrome, switch wrappers). hitSlop can soften the visual size
// without breaking the rule.
export const MIN_TOUCH = Platform.OS === 'ios' ? 44 : 48;

// Side gutter for screen content. Matches SPACING.lg so existing screens
// align with the new layout helpers without churn.
export const EDGE_PAD = SPACING.lg;

// Bottom safe area considerations for sheet/screen footers. iOS home indicator
// is ~34pt; Android gesture nav is variable (16–32dp). Always use insets when
// available, but never go below this floor — matches what Apple/Google use
// in their own first-party apps.
export const BOTTOM_FLOOR = SPACING.md;

// Top safe area floor — mostly applies to modal sheets that draw under the
// status bar. SafeAreaView with edges=['top'] handles real notch/island
// devices, but adding SPACING.xs of breathing room makes header titles feel
// less crammed against the clock.
export const TOP_FLOOR = SPACING.xs;

// Helpers — read insets and return numbers callers can drop into a style.
export function bottomSafePadding(insets: EdgeInsets, extra = 0): number {
  return Math.max(insets.bottom, BOTTOM_FLOOR) + extra;
}

export function topSafePadding(insets: EdgeInsets, extra = 0): number {
  return Math.max(insets.top, TOP_FLOOR) + extra;
}

// Side gutter that respects insets where they exist (landscape on notched
// devices) but never undercuts EDGE_PAD on portrait phones.
export function edgeHorizontal(insets: EdgeInsets): number {
  return Math.max(insets.left, insets.right, EDGE_PAD);
}

// Tab bar height including bottom safe area. The tab bar layout shouldn't
// hardcode a Platform constant; that's how we ended up with unclickable
// nav items on Android gesture devices.
export function tabBarHeight(insets: EdgeInsets): number {
  return 60 + Math.max(insets.bottom, BOTTOM_FLOOR);
}

export function tabBarBottomPadding(insets: EdgeInsets): number {
  return Math.max(insets.bottom, BOTTOM_FLOOR);
}
