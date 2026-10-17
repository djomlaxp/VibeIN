import * as Location from 'expo-location';
import { Link, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VibeBadge } from '@/components/vibe-badge';
import { Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Venue, VenueType, VibeNow } from '@/lib/types';
import { CITY, VENUE_TYPE_LABELS, distanceMeters, timeAgo } from '@/lib/vibe';

type Row = Venue & { now?: VibeNow; distance?: number };

export default function VenueList() {
  const colors = useColors();
  const { session } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [vibes, setVibes] = useState<Record<string, VibeNow>>({});
  const [filter, setFilter] = useState<VenueType | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [{ data: v }, { data: n }] = await Promise.all([
      supabase.from('venues_with_coords').select('*').eq('city', CITY),
      supabase.from('venue_vibe_now').select('*'),
    ]);
    setVenues((v as Venue[]) ?? []);
    setVibes(Object.fromEntries(((n as VibeNow[]) ?? []).map((x) => [x.venue_id, x])));
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    // Live updates: refresh when anyone reports atmosphere
    const channel = supabase
      .channel('vibe-reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vibe_reports' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const p = await Location.getCurrentPositionAsync({});
      setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
    })();
  }, []);

  const rows = useMemo<Row[]>(() => {
    return venues
      .filter((v) => !filter || v.type === filter)
      .map((v) => ({ ...v, now: vibes[v.id], distance: position ? distanceMeters(position, v) : undefined }))
      .sort((a, b) => (b.now?.vibe_score ?? -1) - (a.now?.vibe_score ?? -1));
  }, [venues, vibes, filter, position]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href={session ? '/' : '/login'} onPress={() => session && supabase.auth.signOut()}>
              <Text style={{ color: colors.textSecondary }}>{session ? 'Odjavi se' : 'Prijavi se'}</Text>
            </Link>
          ),
        }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: Spacing.three }}>
        {[null, ...(Object.keys(VENUE_TYPE_LABELS) as VenueType[])].map((t) => (
          <Pressable
            key={t ?? 'all'}
            onPress={() => setFilter(t)}
            style={[styles.chip, { backgroundColor: filter === t ? colors.text : colors.backgroundElement }]}>
            <Text style={{ color: filter === t ? colors.background : colors.text }}>{t ? VENUE_TYPE_LABELS[t] : 'Sve'}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={rows}
        keyExtractor={(v) => v.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>Još nema objekata u gradu {CITY}.</Text>}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/venue/[id]', params: { id: item.id } }} asChild>
            <Pressable style={[styles.row, { borderColor: colors.backgroundElement }]}>
              <VibeBadge score={item.now?.vibe_score ?? null} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                <Text style={{ color: colors.textSecondary }}>
                  {VENUE_TYPE_LABELS[item.type]}
                  {item.distance != null ? ` · ${item.distance < 1000 ? `${Math.round(item.distance)} m` : `${(item.distance / 1000).toFixed(1)} km`}` : ''}
                  {item.now?.last_report_at ? ` · ${timeAgo(item.now.last_report_at)}` : ' · nema svežih prijava'}
                </Text>
              </View>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexGrow: 0, paddingVertical: Spacing.two },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 17, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: Spacing.six },
});
