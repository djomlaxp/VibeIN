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
const GENRE_ICONS: Record<string, IconComponent> = {
  Elektronska: lineIcon(require('@/assets/genres/electronic.png')),
  Pop: lineIcon(require('@/assets/genres/pop.png')),
  Narodna: lineIcon(require('@/assets/genres/folk.png')),
  Rok: lineIcon(require('@/assets/genres/rock.png')),
  Rep: lineIcon(require('@/assets/genres/rap.png')),
  Džez: lineIcon(require('@/assets/genres/jazz.png')),
  Tamburaši: lineIcon(require('@/assets/genres/tamburasi.png')),
  'Svirka uživo': lineIcon(require('@/assets/genres/live.png')),
  'Bez muzike': VolumeX,
  [OTHER_GENRE]: PenLine,
};

// Genres people typed themselves get a plain note
export function genreIcon(genre: string): IconComponent {
  return GENRE_ICONS[genre] ?? Music;
}
