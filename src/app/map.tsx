import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { VenueMap } from '@/components/venue-map';
import { useColors } from '@/constants/theme';
import type { MapMarker } from '@/lib/map-html';
import { supabase } from '@/lib/supabase';
import type { Venue, VibeNow } from '@/lib/types';
import { CITY, vibeColor } from '@/lib/vibe';

export default function MapScreen() {
  const colors = useColors();
  const [markers, setMarkers] = useState<MapMarker[] | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: v }, { data: n }] = await Promise.all([
        supabase.from('venues_with_coords').select('*').eq('city', CITY),
        supabase.from('venue_vibe_now').select('*'),
      ]);
      const vibes = Object.fromEntries(((n as VibeNow[]) ?? []).map((x) => [x.venue_id, x]));
      setMarkers(
        ((v as Venue[]) ?? []).map((venue) => {
          const score = vibes[venue.id]?.vibe_score ?? null;
          return { id: venue.id, name: venue.name, lat: venue.lat, lng: venue.lng, score: score == null ? null : Number(score), color: vibeColor(score) };
        }),
      );
    })();
  }, []);

  const open = useCallback((id: string) => router.push({ pathname: '/venue/[id]', params: { id } }), []);

  return <View style={{ flex: 1, backgroundColor: colors.background }}>{markers && <VenueMap markers={markers} onSelect={open} />}</View>;
}
