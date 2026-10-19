import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VibeBadge } from '@/components/vibe-badge';
import { VideoClip } from '@/components/video-clip';
import { Fonts, Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Post, Venue, VibeNow, VibeReport } from '@/lib/types';
import { CROWD_LABELS, POST_TYPE_LABELS, VENUE_TYPE_LABELS, VIBE_EMOJI, errorMessage, timeAgo } from '@/lib/vibe';

// The reporter's GPS position (user_location) is not readable by clients, so
// select('*') is refused; ask only for the columns the app is granted.
const REPORT_COLUMNS =
  'id, venue_id, user_id, vibe, crowd, music_genre, video_path, video_duration_s, video_expires_at, archived, archive_withdrawn, created_at';

export default function VenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { session } = useAuth();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [now, setNow] = useState<VibeNow | null>(null);
  const [reports, setReports] = useState<VibeReport[]>([]);
  const [archived, setArchived] = useState<VibeReport[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [claimPending, setClaimPending] = useState(false);

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
    if (session && !(v.data as Venue | null)?.owner_id) {
      const { data } = await supabase.from('venue_claims').select('id').eq('venue_id', id).eq('user_id', session.user.id).eq('status', 'pending');
      setClaimPending(!!data?.length);
    }
  }, [id, session]);

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

  async function deletePost(post: Post) {
    await supabase.from('posts').delete().eq('id', post.id);
    load();
  }

  if (!venue) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const text = { color: colors.text };
  const muted = { color: colors.textSecondary };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '' }} />

      <View style={[styles.header, { backgroundColor: colors.backgroundElement }]}>
        <Text style={[styles.live, { color: colors.accent }]}>● UŽIVO{now?.last_report_at ? ` · ${timeAgo(now.last_report_at).toUpperCase()}` : ''}</Text>
        <Text style={[styles.title, text]}>{venue.name}</Text>
        <VibeBadge score={now?.vibe_score ?? null} crowd={now?.crowd} size="large" />
        <View>
          <Text style={muted}>{VENUE_TYPE_LABELS[venue.type]}{venue.address ? ` · ${venue.address}` : ''}</Text>
          <Text style={muted}>
            {now?.report_count ? `${now.report_count} prijava u poslednjih 90 min` : 'Nema svežih prijava'}
          </Text>
        </View>
      </View>

      {!isOwner && (
        <Pressable
          onPress={() => router.push(session ? { pathname: '/report/[id]', params: { id: venue.id } } : '/login')}
          style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={[styles.buttonText, { color: colors.onAccent }]}>Prijavi atmosferu</Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`)}
        style={[styles.button, styles.outline, { borderColor: colors.backgroundSelected }]}>
        <Text style={[styles.buttonText, text]}>Vodi me do mesta</Text>
      </Pressable>

      {isOwner && (
        <View style={styles.row}>
          <Pressable
            onPress={() => router.push({ pathname: '/post/[id]', params: { id: venue.id } })}
            style={[styles.button, styles.half, { backgroundColor: colors.accent }]}>
            <Text style={[styles.buttonText, { color: colors.onAccent }]}>Nova objava</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/edit/[id]', params: { id: venue.id } })}
            style={[styles.button, styles.half, styles.outline, { borderColor: colors.backgroundSelected }]}>
            <Text style={[styles.buttonText, text]}>Uredi profil</Text>
          </Pressable>
        </View>
      )}

      {venue.description && <Text style={[text, styles.paragraph]}>{venue.description}</Text>}

      {!!(venue.opening_hours?.text || venue.contact?.phone || venue.contact?.instagram || venue.contact?.website) && (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          {!!venue.opening_hours?.text && <Info label="Radno vreme" value={venue.opening_hours.text} />}
          {!!venue.contact?.phone && <Info label="Telefon" value={venue.contact.phone} url={`tel:${venue.contact.phone.replace(/\s/g, '')}`} />}
          {!!venue.contact?.instagram && (
            <Info label="Instagram" value={venue.contact.instagram} url={`https://instagram.com/${venue.contact.instagram.replace(/^@/, '')}`} />
          )}
          {!!venue.contact?.website && <Info label="Sajt" value={venue.contact.website} url={venue.contact.website} />}
        </View>
      )}

      {posts.length > 0 && (
        <Section title="Promocije i najave" color={colors.text}>
          {posts.map((p) => (
            <View key={p.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.postType, muted]}>{POST_TYPE_LABELS[p.type].toUpperCase()}</Text>
              <Text style={[styles.cardTitle, { color: colors.accentWarm }]}>{p.title}</Text>
              {p.body && <Text style={muted}>{p.body}</Text>}
              {isOwner && (
                <Pressable onPress={() => deletePost(p)}>
                  <Text style={[styles.link, text]}>Obriši objavu</Text>
                </Pressable>
              )}
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

      {!venue.owner_id &&
        (claimPending ? (
          <Text style={[muted, styles.center]}>Tvoj zahtev da upravljaš ovim mestom čeka odobrenje.</Text>
        ) : (
          <Pressable onPress={() => router.push(session ? { pathname: '/claim/[id]', params: { id: venue.id } } : '/login')}>
            <Text style={[muted, styles.center, styles.link]}>Vlasnik si ovog mesta? Preuzmi profil besplatno</Text>
          </Pressable>
        ))}
    </ScrollView>
  );
}

function Info({ label, value, url }: { label: string; value: string; url?: string }) {
  const colors = useColors();
  return (
    <Text style={{ color: colors.textSecondary }}>
      {label}:{' '}
      <Text style={[{ color: colors.text }, url && styles.link]} onPress={url ? () => Linking.openURL(url) : undefined}>
        {value}
      </Text>
    </Text>
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
  header: { gap: Spacing.three, padding: Spacing.three, borderRadius: 20 },
  live: { fontFamily: Fonts.bodyBold, fontSize: 12, letterSpacing: 1 },
  title: { fontFamily: Fonts.display, fontSize: 24 },
  button: { padding: Spacing.three, borderRadius: 999, alignItems: 'center' },
  outline: { borderWidth: 2 },
  row: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  center: { textAlign: 'center' },
  postType: { fontFamily: Fonts.bodyBold, fontSize: 11, letterSpacing: 1 },
  buttonText: { fontSize: 17, fontFamily: Fonts.bodyBold },
  paragraph: { fontSize: 16, lineHeight: 22 },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.displayBold },
  card: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  cardTitle: { fontFamily: Fonts.bodyBold, fontSize: 16 },
  link: { textDecorationLine: 'underline' },
});
