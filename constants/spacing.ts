// 8-point grid (with 4 as a half-step for fine details).
// Use these instead of ad-hoc magic numbers so spacing rhythm stays consistent.
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export type SpacingKey = keyof typeof SPACING;

// Common radii follow the same scale.
export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 18,
  pill: 999,
} as const;
