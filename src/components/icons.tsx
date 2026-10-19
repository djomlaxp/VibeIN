import type { ComponentType } from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import { Flame, Frown, Laugh, Meh, Music, PenLine, Smile, VolumeX, type LucideIcon } from 'lucide-react-native';

import { OTHER_GENRE } from '@/lib/vibe';

// Anything drawn like a Lucide icon: <Icon size color />
export type IconComponent = ComponentType<{ size?: number; color?: string }>;

// One icon per vibe score, 1 (dead) to 5 (on fire)
export const VIBE_ICONS: LucideIcon[] = [Frown, Meh, Smile, Laugh, Flame];

// Line drawings Djomla picked for the genres: white lines on a transparent
// background, recolored with tintColor so they follow the theme like Lucide icons
function lineIcon(source: ImageSourcePropType): IconComponent {
  return function LineIcon({ size = 24, color }) {
    return <Image source={source} style={{ width: size, height: size, tintColor: color }} resizeMode="contain" />;
  };
}

// Keys are the genre names saved in reports (MUSIC_GENRES in src/lib/vibe.ts)
const electro = lineIcon(require('@/assets/genres/electro.png'));
const hipHop = lineIcon(require('@/assets/genres/hiphop.png'));
const GENRE_ICONS: Record<string, IconComponent> = {
  Pop: lineIcon(require('@/assets/genres/pop.png')),
  Džez: lineIcon(require('@/assets/genres/jazz.png')),
  Klasična: lineIcon(require('@/assets/genres/classical.png')),
  Rok: lineIcon(require('@/assets/genres/rock.png')),
  Metal: lineIcon(require('@/assets/genres/metal.png')),
  Pank: lineIcon(require('@/assets/genres/punk.png')),
  Rege: lineIcon(require('@/assets/genres/reggae.png')),
  Elektro: electro,
  Narodna: lineIcon(require('@/assets/genres/folk.png')),
  'Hip-hop': hipHop,
  Kantri: lineIcon(require('@/assets/genres/country.png')),
  Bluz: lineIcon(require('@/assets/genres/blues.png')),
  'Bez muzike': VolumeX,
  [OTHER_GENRE]: PenLine,
  // Names used before the list changed, still found in older reports
  Elektronska: electro,
  Rep: hipHop,
};

// Genres people typed themselves get a plain note
export function genreIcon(genre: string): IconComponent {
  return GENRE_ICONS[genre] ?? Music;
}
