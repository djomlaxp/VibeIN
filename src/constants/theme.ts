/**
 * The "Neon limeta" look: one dark palette for the whole app, dark green-black
 * with a lime accent. Vibe score colors stay in src/lib/vibe.ts.
 */

export const Colors = {
  text: '#EEF5EC',
  textSecondary: '#9DB0A3',
  background: '#0C1210',
  backgroundElement: '#16201C',
  backgroundSelected: '#22302A',
  accent: '#C6FF3D',
  accentWarm: '#FFD84D',
  onAccent: '#0C1210',
  danger: '#FF6B6B',
} as const;

// Ring around venues that are live right now (lime -> mint -> cyan)
export const LiveGradient = ['#C6FF3D', '#5CF2B0', '#2FD3E0'] as const;

// VibeIN Biznis, the venue owners' part: same layout and fonts, its own
// palette (violet night with a gold accent) so owners always know where they are.
export const OwnerColors = {
  text: '#F3EFFA',
  textSecondary: '#A99FBF',
  background: '#110D1A',
  backgroundElement: '#1C1729',
  backgroundSelected: '#2A2340',
  accent: '#FFC94D',
  accentSoft: '#B79CFF',
  onAccent: '#110D1A',
  danger: '#FF6B6B',
} as const;

export const OwnerGradient = ['#FFC94D', '#FF9A5A', '#FF5C8A'] as const;

export function useColors() {
  return Colors;
}

// Loaded in src/app/_layout.tsx; the names are the keys passed to useFonts().
export const Fonts = {
  display: 'Unbounded_800ExtraBold',
  displayBold: 'Unbounded_700Bold',
  body: 'Manrope_500Medium',
  bodyBold: 'Manrope_700Bold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
