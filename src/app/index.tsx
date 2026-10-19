import * as Location from 'expo-location';
import { Link, Stack, router, useFocusEffect } from 'expo-router';
import { Bell, LogIn, LogOut, Map, ShieldCheck } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VENUE_ICONS, VenueAvatar } from '@/components/venue-avatar';
import { VibeBadge } from '@/components/vibe-badge';
import { Fonts, Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Venue, VenueType, VibeNow } from '@/lib/types';
import { CITY, VENUE_TYPE_LABELS, distanceMeters, timeAgo, vibeColor } from '@/lib/vibe';

type Row = Venue & { now?: VibeNow; distance?: number };

export default function VenueList() {
  const colors = useColors();
  const { session, role, recovering } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [vibes, setVibes] = useState<Record<string, VibeNow>>({});
  const [filter, setFilter] = useState<VenueType | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);

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

  // A password reset link lands here; send the person on to choose a new password.
  useEffect(() => {
    if (recovering) router.push('/new-password');
  }, [recovering]);

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

  useFocusEffect(
    useCallback(() => {
      if (!session) return setUnread(0);
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .then(({ count }) => setUnread(count ?? 0));
    }, [session]),
  );

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

  // Venues people reported in the last 90 minutes, hottest first
  const live = useMemo(
    () => venues.filter((v) => vibes[v.id]?.report_count).sort((a, b) => (vibes[b.id].vibe_score ?? 0) - (vibes[a.id].vibe_score ?? 0)),
    [venues, vibes],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerRight}>
              <Link href="/map" aria-label="Mapa">
                <Map size={24} color={colors.text} />
              </Link>
              {role === 'admin' && (
                <Link href="/admin" aria-label="Admin">
                  <ShieldCheck size={24} color={colors.accentWarm} />
                </Link>
              )}
              {session && (
                <Link href="/notifications" aria-label="Obaveštenja">
                  <View>
                    <Bell size={24} color={colors.text} />
                    {unread > 0 && (
                      <View style={[styles.dot, { backgroundColor: colors.accent, borderColor: colors.background }]}>
                        <Text style={styles.dotText}>{unread}</Text>
                      </View>
                    )}
                  </View>
                </Link>
              )}
              <Link href={session ? '/' : '/login'} onPress={() => session && supabase.auth.signOut()} aria-label={session ? 'Odjavi se' : 'Prijavi se'}>
                {session ? <LogOut size={22} color={colors.textSecondary} /> : <LogIn size={24} color={colors.accent} />}
              </Link>
            </View>
          ),
        }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.stories, { borderColor: colors.backgroundElement }]} contentContainerStyle={styles.storiesRow}>
        {live.length === 0 && (
          <Text style={[styles.storiesEmpty, { color: colors.textSecondary }]}>Još niko nije javio atmosferu večeras. Budi prvi!</Text>
        )}
        {live.map((v) => {
          const score = vibes[v.id].vibe_score;
          return (
            <Pressable key={v.id} style={styles.story} onPress={() => router.push({ pathname: '/venue/[id]', params: { id: v.id } })}>
              <VenueAvatar type={v.type} size={68} live />
              <View style={[styles.storyScore, { backgroundColor: vibeColor(score), borderColor: colors.background }]}>
                <Text style={styles.storyScoreText}>{score == null ? '–' : Number(score).toFixed(1)}</Text>
              </View>
              <Text numberOfLines={1} style={[styles.storyName, { color: colors.text }]}>
                {v.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: Spacing.three }}>
        {[null, ...(Object.keys(VENUE_TYPE_LABELS) as VenueType[])].map((t) => {
          const on = filter === t;
          const Icon = t ? VENUE_ICONS[t] : null;
          return (
            <Pressable key={t ?? 'all'} onPress={() => setFilter(t)} style={[styles.chip, { backgroundColor: on ? colors.text : colors.backgroundElement }]}>
              {Icon && <Icon size={16} color={on ? colors.background : colors.textSecondary} />}
              <Text style={[styles.chipText, { color: on ? colors.background : colors.text }]}>{t ? VENUE_TYPE_LABELS[t] : 'Sve'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <FlatList
        data={rows}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>Još nema objekata u gradu {CITY}.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/venue/[id]', params: { id: item.id } })}
            style={[styles.row, { backgroundColor: colors.backgroundElement }]}>
            <VenueAvatar type={item.type} size={48} live={!!item.now?.report_count} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {VENUE_TYPE_LABELS[item.type]}
                {item.distance != null ? ` · ${item.distance < 1000 ? `${Math.round(item.distance)} m` : `${(item.distance / 1000).toFixed(1)} km`}` : ''}
                {item.now?.last_report_at ? ` · ${timeAgo(item.now.last_report_at)}` : ' · nema svežih prijava'}
              </Text>
            </View>
            <VibeBadge score={item.now?.vibe_score ?? null} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingRight: Platform.OS === 'web' ? Spacing.three : 0 },
  dot: { position: 'absolute', top: -6, right: -8, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  dotText: { color: '#fff', fontSize: 10, fontFamily: Fonts.bodyBold },
  stories: { flexGrow: 0, borderBottomWidth: 1 },
  storiesRow: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.three },
  storiesEmpty: { fontFamily: Fonts.body, fontSize: 14, paddingVertical: Spacing.three },
  story: { width: 72, height: 104, alignItems: 'center' },
  storyScore: { marginTop: -10, borderRadius: 6, borderWidth: 2, paddingHorizontal: 5, paddingVertical: 1 },
  storyScoreText: { color: '#fff', fontSize: 11, fontFamily: Fonts.bodyBold },
  storyName: { marginTop: 4, fontSize: 12, lineHeight: 16, fontFamily: Fonts.body, maxWidth: 72 },
  filters: { flexGrow: 0, paddingVertical: Spacing.three },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  chipText: { fontFamily: Fonts.bodyBold },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.two, maxWidth: 800, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18 },
  name: { fontSize: 16, fontFamily: Fonts.bodyBold },
  meta: { fontFamily: Fonts.body, fontSize: 13 },
  empty: { textAlign: 'center', marginTop: Spacing.six },
});
