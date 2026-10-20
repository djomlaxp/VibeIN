import { Image } from 'expo-image';

// Djomla's VibeIN logo, cut from the black background so the glow sits on any
// dark color. The file is 4x the default size, for sharp phone screens.
export const LOGO = require('../../assets/images/logo.png');
export const LOGO_ASPECT = 420 / 95;

// Default height matches the old "VibeIN" text (Unbounded 22 px).
export function Logo({ height = 24 }: { height?: number }) {
  return <Image source={LOGO} style={{ width: height * LOGO_ASPECT, height }} contentFit="contain" accessibilityLabel="VibeIN" />;
}
