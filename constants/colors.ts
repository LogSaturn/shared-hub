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
  fontFamilyDisplay: 'PlayfairDisplay_500Medium_Italic',

  trackingWide: 2.5,
} as const;
