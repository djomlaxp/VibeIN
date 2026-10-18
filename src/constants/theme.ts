/**
 * The "Noć" (night) look: one dark palette for the whole app, like a club after
 * midnight. Vibe score colors stay in src/lib/vibe.ts.
 */

export const Colors = {
  text: '#F3EEFF',
  textSecondary: '#B7A9D6',
  background: '#140F24',
  backgroundElement: '#211A36',
  backgroundSelected: '#2E2548',
  accent: '#FF4D8D',
  accentWarm: '#FFB23E',
  onAccent: '#FFFFFF',
  danger: '#FF6B6B',
} as const;

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
