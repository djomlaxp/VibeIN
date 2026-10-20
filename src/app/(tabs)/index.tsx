import { Link, router, useFocusEffect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Bell, Heart, MapPin, ShieldCheck, Users, Video } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VIBE_ICONS, genreIcon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { Pill } from '@/components/pill';
import { VENUE_ICONS, VenueAvatar } from '@/components/venue-avatar';
import { VenueMedia } from '@/components/venue-media';
import { VibeBadge } from '@/components/vibe-badge';
import { Fonts, Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useCity } from '@/lib/city';
import { latestClip, latestGenre, latestPost } from '@/lib/feed';
import { supabase } from '@/lib/supabase';
import type { Venue, VenueType } from '@/lib/types';
import { CITY, CROWD_LABELS, VENUE_TYPE_LABELS, VIBE_LABELS, byDistance, distanceMeters, formatDistance, timeAgo, vibeColor } from '@/lib/vibe';

const openVenue = (id: string) => router.push({ pathname: '/venue/[id]', params: { id } });

export default function Home() {
  const colors = useColors();
  const { session, role, recovering } = useAuth();
  const { venues, vibes, reports, posts, position, favorites, refreshing, reload, toggleFavorite } = useCity();
  const [filter, setFilter] = useState<VenueType | null>(null);
  const [unread, setUnread] = useState(0);

  // A password reset link lands here; send the person on to choose a new password.
  useEffect(() => {
    if (recovering) router.push('/new-password');
  }, [recovering]);

  useFocusEffect(
    useCallback(() => {
      reload();
      if (!session) return setUnread(0);
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .then(({ count }) => setUnread(count ?? 0));
    }, [session, reload]),
  );

  // Venues people reported in the last 90 minutes, hottest first
  const live = useMemo(
    () => venues.filter((v) => vibes[v.id]?.report_count).sort((a, b) => (vibes[b.id].vibe_score ?? 0) - (vibes[a.id].vibe_score ?? 0)),
    [venues, vibes],
  );
  const rest = useMemo(
    () => venues.filter((v) => !vibes[v.id]?.report_count && (!filter || v.type === filter)).sort(byDistance(position)),
    [venues, vibes, filter, position],
  );

  const distance = (v: Venue) => (position ? formatDistance(distanceMeters(position, v)) : null);

  async function save(id: string) {
    if (!(await toggleFavorite(id))) router.push('/login');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs.Screen
        options={{
          headerTitle: () => <Logo />,
          headerTitleAlign: 'left',
          headerRight: () => (
            <View style={styles.headerRight}>
              {role === 'admin' && (
                <Link href="/admin" aria-label="Admin">
                  <ShieldCheck size={24} color={colors.accentWarm} />
                </Link>
              )}
              <Link href={session ? '/notifications' : '/login'} aria-label="Obaveštenja">
                <View>
                  <Bell size={24} color={colors.text} />
                  {unread > 0 && (
                    <View style={[styles.dot, { backgroundColor: colors.accent, borderColor: colors.background }]}>
                      <Text style={[styles.dotText, { color: colors.onAccent }]}>{unread}</Text>
                    </View>
                  )}
                </View>
              </Link>
            </View>
          ),
        }}
      />
      <FlatList
        data={live}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.stories, { borderColor: colors.backgroundElement }]} contentContainerStyle={styles.storiesRow}>
            {live.length === 0 && (
              <Text style={[styles.storiesEmpty, { color: colors.textSecondary }]}>Još niko nije javio atmosferu večeras. Budi prvi!</Text>
            )}
            {live.map((v) => {
              const score = vibes[v.id].vibe_score;
              return (
                <Pressable key={v.id} style={styles.story} onPress={() => router.push({ pathname: '/live', params: { venue: v.id } })}>
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
        }
        renderItem={({ item: v }) => {
          const now = vibes[v.id];
          const clip = latestClip(reports, v.id);
          const genre = latestGenre(reports, v.id);
          const post = latestPost(posts, v.id);
          const score = now.vibe_score == null ? null : Number(now.vibe_score);
          const VibeIcon = VIBE_ICONS[Math.max(0, Math.min(4, Math.round(score ?? 1) - 1))];
          const saved = favorites.has(v.id);
          const away = distance(v);
          return (
            <View style={styles.card}>
              <Pressable style={styles.cardHead} onPress={() => openVenue(v.id)}>
                <VenueAvatar type={v.type} size={40} live />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>{v.name}</Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    {VENUE_TYPE_LABELS[v.type]}
                    {away ? ` · ${away} od tebe` : ''}
                    {now.last_report_at ? ` · ${timeAgo(now.last_report_at)}` : ''}
                  </Text>
                </View>
              </Pressable>
              <Pressable onPress={() => openVenue(v.id)}>
                <VenueMedia type={v.type} videoPath={clip?.video_path} style={styles.media}>
                  <View style={styles.mediaTop}>
                    <Pill live label="UŽIVO" />
                    <VibeBadge score={score} size="large" />
                  </View>
                  <View style={styles.mediaBottom}>
                    {score != null && <Pill icon={VibeIcon} label={VIBE_LABELS[Math.round(score) - 1] ?? ''} />}
                    {now.crowd != null && <Pill icon={Users} label={CROWD_LABELS[now.crowd]} />}
                    {genre && <Pill icon={genreIcon(genre)} label={genre} />}
                  </View>
                </VenueMedia>
              </Pressable>
              <View style={styles.actions}>
                <Pressable onPress={() => save(v.id)} aria-label={saved ? 'Ukloni iz omiljenih' : 'Sačuvaj'}>
                  <Heart size={26} color={saved ? colors.accent : colors.text} fill={saved ? colors.accent : 'transparent'} />
                </Pressable>
                <Pressable onPress={() => router.push(session ? { pathname: '/report/[id]', params: { id: v.id } } : '/login')} aria-label="Snimi atmosferu">
                  <Video size={26} color={colors.text} />
                </Pressable>
                <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`)} aria-label="Vodi me">
                  <MapPin size={26} color={colors.text} />
                </Pressable>
              </View>
              <Text style={[styles.caption, { color: colors.text }]}>
                <Text style={styles.bold}>{now.report_count} prijava</Text> u poslednjih 90 min
              </Text>
              {post && (
                <Text style={[styles.caption, { color: colors.text }]} numberOfLines={2}>
                  <Text style={styles.bold}>{v.name}</Text> {post.title}
                </Text>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          <View style={{ gap: Spacing.two }}>
            <Text style={[styles.section, { color: colors.text }]}>{live.length ? 'Ostala mesta' : `Sva mesta u gradu ${CITY}`}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two, paddingBottom: Spacing.two }}>
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
            {rest.map((v) => (
              <Pressable key={v.id} onPress={() => openVenue(v.id)} style={[styles.row, { backgroundColor: colors.backgroundElement }]}>
                <VenueAvatar type={v.type} size={44} live={false} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>{v.name}</Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    {VENUE_TYPE_LABELS[v.type]}
                    {distance(v) ? ` · ${distance(v)}` : ''} · nema svežih prijava
                  </Text>
                </View>
                {favorites.has(v.id) && <Heart size={18} color={colors.accent} fill={colors.accent} />}
              </Pressable>
            ))}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingRight: Platform.OS === 'web' ? Spacing.three : 0 },
  dot: { position: 'absolute', top: -6, right: -8, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  dotText: { fontSize: 10, fontFamily: Fonts.bodyBold },
  list: { paddingBottom: Spacing.four, paddingHorizontal: Spacing.three, gap: Spacing.four, maxWidth: 600, width: '100%', alignSelf: 'center' },
  stories: { flexGrow: 0, borderBottomWidth: 1, marginHorizontal: -Spacing.three },
  storiesRow: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.three },
  storiesEmpty: { fontFamily: Fonts.body, fontSize: 14, paddingVertical: Spacing.three },
  story: { width: 72, height: 104, alignItems: 'center' },
  storyScore: { marginTop: -10, borderRadius: 6, borderWidth: 2, paddingHorizontal: 5, paddingVertical: 1 },
  storyScoreText: { color: '#fff', fontSize: 11, fontFamily: Fonts.bodyBold },
  storyName: { marginTop: 4, fontSize: 12, lineHeight: 16, fontFamily: Fonts.body, maxWidth: 72 },
  card: { gap: Spacing.two },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  media: { aspectRatio: 4 / 5, borderRadius: 18, justifyContent: 'space-between', padding: Spacing.three },
  mediaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mediaBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.four, paddingVertical: Spacing.one },
  caption: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 20 },
  bold: { fontFamily: Fonts.bodyBold },
  section: { fontFamily: Fonts.displayBold, fontSize: 18, marginTop: Spacing.two },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  chipText: { fontFamily: Fonts.bodyBold },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18 },
  name: { fontSize: 16, fontFamily: Fonts.bodyBold },
  meta: { fontFamily: Fonts.body, fontSize: 13 },
});
