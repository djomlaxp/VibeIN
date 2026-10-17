import { Link, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VibeBadge } from '@/components/vibe-badge';
import { VideoClip } from '@/components/video-clip';
import { Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Post, Venue, VibeNow, VibeReport } from '@/lib/types';
import { CROWD_LABELS, VENUE_TYPE_LABELS, VIBE_EMOJI, errorMessage, timeAgo } from '@/lib/vibe';

// The reporter's GPS position (user_location) is not readable by clients, so
// select('*') is refused; ask only for the columns the app is granted.
const REPORT_COLUMNS =
  'id, venue_id, user_id, vibe, crowd, music_genre, comment, video_path, video_duration_s, video_expires_at, archived, archive_withdrawn, created_at';

export default function VenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { session } = useAuth();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [now, setNow] = useState<VibeNow | null>(null);
  const [reports, setReports] = useState<VibeReport[]>([]);
  const [archived, setArchived] = useState<VibeReport[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();
    const [v, n, r, a, p] = await Promise.all([
      supabase.from('venues_with_coords').select('*').eq('id', id).single(),
      supabase.from('venue_vibe_now').select('*').eq('venue_id', id).maybeSingle(),
      supabase.from('vibe_reports').select(REPORT_COLUMNS).eq('venue_id', id).gte('created_at', since).order('created_at', { ascending: false }),
      supabase.from('vibe_reports').select(REPORT_COLUMNS).eq('venue_id', id).eq('archived', true).order('archived_at', { ascending: false }),
      supabase.from('posts').select('*').eq('venue_id', id).lte('valid_from', nowIso).or(`valid_to.is.null,valid_to.gt.${nowIso}`).order('created_at', { ascending: false }),
    ]);
    setVenue(v.data as Venue);
    setNow(n.data as VibeNow | null);
    setReports((r.data as VibeReport[]) ?? []);
    setArchived((a.data as VibeReport[]) ?? []);
    setPosts((p.data as Post[]) ?? []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const isOwner = !!session && venue?.owner_id === session.user.id && venue.verified;

  async function toggleArchive(report: VibeReport) {
    const { error } = await supabase.rpc('set_video_archived', { p_report_id: report.id, p_archived: !report.archived });
    if (error) Alert.alert('Arhiva', errorMessage(error));
    load();
  }

  if (!venue) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const text = { color: colors.text };
  const muted = { color: colors.textSecondary };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: venue.name }} />

      <View style={styles.header}>
        <VibeBadge score={now?.vibe_score ?? null} crowd={now?.crowd} size="large" />
        <View style={{ flex: 1 }}>
          <Text style={muted}>{VENUE_TYPE_LABELS[venue.type]}{venue.address ? ` · ${venue.address}` : ''}</Text>
          <Text style={muted}>
            {now?.report_count ? `${now.report_count} prijava u poslednjih 90 min` : 'Nema svežih prijava'}
          </Text>
        </View>
      </View>

      {!isOwner && (
        <Link href={session ? { pathname: '/report/[id]', params: { id: venue.id } } : '/login'} asChild>
          <Pressable style={[styles.button, { backgroundColor: colors.text }]}>
            <Text style={[styles.buttonText, { color: colors.background }]}>Prijavi atmosferu</Text>
          </Pressable>
        </Link>
      )}

      {venue.description && <Text style={[text, styles.paragraph]}>{venue.description}</Text>}

      {posts.length > 0 && (
        <Section title="Promocije i najave" color={colors.text}>
          {posts.map((p) => (
            <View key={p.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[text, styles.cardTitle]}>{p.title}</Text>
              {p.body && <Text style={muted}>{p.body}</Text>}
            </View>
          ))}
        </Section>
      )}

      <Section title="Poslednje prijave" color={colors.text}>
        {reports.length === 0 && <Text style={muted}>Još niko nije prijavio atmosferu u poslednja 3 sata.</Text>}
        {reports.map((r) => (
          <View key={r.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={text}>
              {VIBE_EMOJI[r.vibe - 1]} {CROWD_LABELS[r.crowd]}{r.music_genre ? ` · ${r.music_genre}` : ''}
              <Text style={muted}>  {timeAgo(r.created_at)}</Text>
            </Text>
            {r.comment && <Text style={text}>{r.comment}</Text>}
            {r.video_path && <VideoClip path={r.video_path} />}
            {isOwner && r.video_path && !r.archive_withdrawn && (
              <Pressable onPress={() => toggleArchive(r)}>
                <Text style={[styles.link, text]}>{r.archived ? 'Ukloni iz arhive' : 'Arhiviraj na profilu'}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </Section>

      {archived.length > 0 && (
        <Section title="Arhiva snimaka" color={colors.text}>
          {archived.map((r) => (
            <View key={r.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              {r.video_path && <VideoClip path={r.video_path} />}
              {isOwner && (
                <Pressable onPress={() => toggleArchive(r)}>
                  <Text style={[styles.link, text]}>Ukloni iz arhive</Text>
                </Pressable>
              )}
            </View>
          ))}
        </Section>
      )}
    </ScrollView>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: Spacing.two }}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four, maxWidth: 800, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  button: { padding: Spacing.three, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '600' },
  paragraph: { fontSize: 16, lineHeight: 22 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  card: { padding: Spacing.three, borderRadius: 12, gap: Spacing.two },
  cardTitle: { fontWeight: '600', fontSize: 16 },
  link: { textDecorationLine: 'underline' },
});
