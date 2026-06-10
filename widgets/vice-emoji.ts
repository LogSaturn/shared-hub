import type { ViceId } from '../types';

// Used inside RemoteViews where bundling MaterialCommunityIcons.ttf is fragile.
// Emoji glyphs render from the system font and stay readable on every Android.
export const VICE_EMOJI: Record<ViceId, string> = {
  coffee: '☕',
  energy: '⚡',
  zyn: '⚪',
  cigarettes: '🚬',
  beer: '🍺',
  wine: '🍷',
  cocktails: '🍸',
  pastries: '🥐',
  donuts: '🍩',
  ice_cream: '🍦',
  boba: '🧋',
  matcha: '🍵',
  custom: '★',
};

export function viceEmoji(id: ViceId): string {
  return VICE_EMOJI[id] ?? '★';
}
