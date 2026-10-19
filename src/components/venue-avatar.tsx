import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, Coffee, Disc3, Info, MicVocal, Tag, Trophy, UtensilsCrossed, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Colors, LiveGradient } from '@/constants/theme';
import type { PostType, VenueType } from '@/lib/types';

export const VENUE_ICONS: Record<VenueType, LucideIcon> = {
  club: Disc3,
  cafe: Coffee,
  restaurant: UtensilsCrossed,
  concert_venue: MicVocal,
  stadium: Trophy,
};

export const POST_ICONS: Record<PostType, LucideIcon> = { promo: Tag, event: CalendarDays, info: Info };

// A venue's round picture: its type icon inside a ring that turns into the
// live gradient when people reported the atmosphere recently.
export function VenueAvatar({ type, size, live }: { type: VenueType; size: number; live: boolean }) {
  const Icon = VENUE_ICONS[type];
  const ring = Math.max(2, Math.round(size / 28));
  const inner = (
    <View
      style={{
        flex: 1,
        borderRadius: size,
        borderWidth: ring + 1,
        borderColor: Colors.background,
        backgroundColor: Colors.backgroundElement,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon size={size * 0.38} color={live ? Colors.text : Colors.textSecondary} strokeWidth={1.8} />
    </View>
  );
  return live ? (
    <LinearGradient colors={LiveGradient} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ width: size, height: size, borderRadius: size, padding: ring }}>
      {inner}
    </LinearGradient>
  ) : (
    <View style={{ width: size, height: size, borderRadius: size, padding: ring, backgroundColor: Colors.backgroundSelected }}>{inner}</View>
  );
}
