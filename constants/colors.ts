export const COLORS = {
  bg: '#0e0f11',
  card: '#17181b',
  surface: '#1f2125',

  fg: '#f5ebdc',

  accent: '#8a1c1c',
  accentDim: '#8a1c1c33',
  accentBorder: '#8a1c1c88',

  gold: '#d9b370',
  green: '#7fd089',

  // Body / strong-secondary text. >=4.5:1 over bg (passes WCAG AA for body).
  muted70: 'rgba(245,235,220,0.70)',
  // Captions / labels (uppercase + tracked, treated as large/incidental).
  muted55: 'rgba(245,235,220,0.55)',

  // Legacy values kept for non-text usage (icons/dividers); not for body text.
  muted40: 'rgba(245,235,220,0.40)',
  muted35: 'rgba(245,235,220,0.35)',
  muted32: 'rgba(245,235,220,0.32)',
  muted20: 'rgba(245,235,220,0.20)',
  muted18: 'rgba(245,235,220,0.18)',

  border10: 'rgba(255,255,255,0.10)',
  border06: 'rgba(255,255,255,0.06)',
  border05: 'rgba(255,255,255,0.05)',
  border04: 'rgba(255,255,255,0.04)',
} as const;

export const TYPOGRAPHY = {
  fontFamily: 'Inter_400Regular',
  fontFamilyMedium: 'Inter_500Medium',
  fontFamilySemiBold: 'Inter_600SemiBold',
  fontFamilyBold: 'Inter_700Bold',

  trackingWide: 2.5,
  trackingMid: 1.8,
  trackingTight: -0.5,
} as const;

// Single source of truth for text sizing. Use semantic roles, not raw px,
// across screens to keep hierarchy consistent. Aligns with Material/HIG type
// roles: caption, label, body, title, headline, display.
export const TYPE = {
  caption: { size: 11, lineHeight: 14, tracking: 1.8 },
  label: { size: 12, lineHeight: 16, tracking: 2.4 },
  body: { size: 14, lineHeight: 20, tracking: 0.2 },
  bodyLg: { size: 16, lineHeight: 22, tracking: 0.1 },
  title: { size: 18, lineHeight: 24, tracking: -0.2 },
  headline: { size: 22, lineHeight: 28, tracking: -0.3 },
  display: { size: 30, lineHeight: 36, tracking: -0.5 },
} as const;
