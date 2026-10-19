import { Drum, Flame, Frown, Guitar, Headphones, Laugh, Meh, Mic, MicVocal, Music, Music2, Music4, PenLine, Piano, Smile, VolumeX, type LucideIcon } from 'lucide-react-native';

import { OTHER_GENRE } from '@/lib/vibe';

// One icon per vibe score, 1 (dead) to 5 (on fire)
export const VIBE_ICONS: LucideIcon[] = [Frown, Meh, Smile, Laugh, Flame];

// Keys are the genre names saved in reports (MUSIC_GENRES in src/lib/vibe.ts)
const GENRE_ICONS: Record<string, LucideIcon> = {
  Elektronska: Headphones,
  Pop: Mic,
  Narodna: Music2,
  Rok: Guitar,
  Rep: MicVocal,
  Džez: Piano,
  Tamburaši: Music4,
  'Svirka uživo': Drum,
  'Bez muzike': VolumeX,
  [OTHER_GENRE]: PenLine,
};

// Genres people typed themselves get a plain note
export function genreIcon(genre: string): LucideIcon {
  return GENRE_ICONS[genre] ?? Music;
}
