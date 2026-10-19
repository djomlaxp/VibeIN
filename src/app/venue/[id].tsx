import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Archive, AtSign, BadgeCheck, Clock, Flame, Globe, Navigation, Pencil, Phone, Plus, Trash2, Users, type LucideIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VIBE_ICONS, genreIcon } from '@/components/icons';
import { POST_ICONS, VenueAvatar } from '@/components/venue-avatar';
import { VideoClip } from '@/components/video-clip';
import { Fonts, LiveGradient, Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Post, Venue, VibeNow, VibeReport } from '@/lib/types';
import { CROWD_LABELS, POST_TYPE_LABELS, VENUE_TYPE_LABELS, errorMessage, timeAgo, vibeColor } from '@/lib/vibe';

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

      <View style={styles.profile}>
        <VenueAvatar type={venue.type} size={88} live={!!now?.report_count} />
        <View style={styles.stats}>
          <Stat value={now?.vibe_score == null ? '–' : Number(now.vibe_score).toFixed(1)} label="vibe sada" color={vibeColor(now?.vibe_score ?? null)} />
          <Stat value={String(now?.report_count ?? 0)} label="prijava" color={colors.text} />
          <Stat value={String(posts.length)} label={posts.length === 1 ? 'objava' : 'objave'} color={colors.text} />
        </View>
      </View>

      <View style={{ gap: Spacing.one }}>
        <View style={styles.nameRow}>
          <Text style={[styles.title, text]}>{venue.name}</Text>
          {venue.verified && <BadgeCheck size={20} color={colors.accent} />}
        </View>
        <Text style={muted}>{VENUE_TYPE_LABELS[venue.type]}{venue.address ? ` · ${venue.address}` : ''}</Text>
        {!!now?.report_count && (
          <View style={styles.chips}>
            <Chip icon={Flame} label={`Uživo · ${now.last_report_at ? timeAgo(now.last_report_at) : ''}`} color={colors.accent} />
            {now.crowd != null && <Chip icon={Users} label={CROWD_LABELS[now.crowd]} color={colors.text} />}
            {!!reports[0]?.music_genre && <Chip icon={genreIcon(reports[0].music_genre)} label={reports[0].music_genre} color={colors.text} />}
          </View>
        )}
      </View>

      <View style={styles.row}>
        {isOwner ? (
          <>
            <Action icon={Plus} label="Nova objava" primary onPress={() => router.push({ pathname: '/post/[id]', params: { id: venue.id } })} />
            <Action icon={Pencil} label="Uredi profil" onPress={() => router.push({ pathname: '/edit/[id]', params: { id: venue.id } })} />
          </>
        ) : (
          <Action icon={Flame} label="Prijavi atmosferu" primary onPress={() => router.push(session ? { pathname: '/report/[id]', params: { id: venue.id } } : '/login')} />
        )}
        <Action
          icon={Navigation}
          label="Vodi me"
          compact={isOwner}
          onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`)}
        />
      </View>

      {venue.description && <Text style={[text, styles.paragraph]}>{venue.description}</Text>}

      {!!(venue.opening_hours?.text || venue.contact?.phone || venue.contact?.instagram || venue.contact?.website) && (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          {!!venue.opening_hours?.text && <Info icon={Clock} value={venue.opening_hours.text} />}
          {!!venue.contact?.phone && <Info icon={Phone} value={venue.contact.phone} url={`tel:${venue.contact.phone.replace(/\s/g, '')}`} />}
          {!!venue.contact?.instagram && (
            <Info icon={AtSign} value={venue.contact.instagram.replace(/^@/, '')} url={`https://instagram.com/${venue.contact.instagram.replace(/^@/, '')}`} />
          )}
          {!!venue.contact?.website && <Info icon={Globe} value={venue.contact.website} url={venue.contact.website} />}
        </View>
      )}

      {posts.length > 0 && (
        <Section title="Promocije i najave" color={colors.text}>
          {posts.map((p) => (
            <View key={p.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <PostLabel type={p.type} />
              <Text style={[styles.cardTitle, { color: colors.accentWarm }]}>{p.title}</Text>
              {p.body && <Text style={muted}>{p.body}</Text>}
              {isOwner && (
                <Pressable onPress={() => deletePost(p)} style={styles.inline}>
                  <Trash2 size={16} color={colors.textSecondary} />
                  <Text style={[styles.link, muted]}>Obriši objavu</Text>
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
            <ReportLine report={r} />
            {r.video_path && <VideoClip path={r.video_path} />}
            {isOwner && r.video_path && !r.archive_withdrawn && (
              <Pressable onPress={() => toggleArchive(r)} style={styles.inline}>
                <Archive size={16} color={colors.textSecondary} />
                <Text style={[styles.link, muted]}>{r.archived ? 'Ukloni iz arhive' : 'Arhiviraj na profilu'}</Text>
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

      <Pressable onPress={() => router.push(session ? { pathname: '/issue/[id]', params: { id: venue.id } } : '/login')}>
        <Text style={[muted, styles.center, styles.link]}>Mesto je zatvoreno ili ima novo ime? Javi nam</Text>
      </Pressable>
    </ScrollView>
  );
}

function Info({ icon: Icon, value, url }: { icon: LucideIcon; value: string; url?: string }) {
  const colors = useColors();
  return (
    <View style={styles.inline}>
      <Icon size={18} color={colors.textSecondary} />
      <Text style={[{ color: colors.text, flex: 1 }, url && styles.link]} onPress={url ? () => Linking.openURL(url) : undefined}>
        {value}
      </Text>
    </View>
  );
}

function ReportLine({ report: r }: { report: VibeReport }) {
  const colors = useColors();
  const VibeIcon = VIBE_ICONS[r.vibe - 1];
  const GenreIcon = r.music_genre ? genreIcon(r.music_genre) : null;
  const text = { color: colors.text };
  return (
    <View style={[styles.inline, { flexWrap: 'wrap' }]}>
      <VibeIcon size={18} color={vibeColor(r.vibe)} />
      <Text style={text}>{CROWD_LABELS[r.crowd]}</Text>
      {GenreIcon && (
        <>
          <GenreIcon size={16} color={colors.textSecondary} />
          <Text style={text}>{r.music_genre}</Text>
        </>
      )}
      <Text style={{ color: colors.textSecondary }}>{timeAgo(r.created_at)}</Text>
    </View>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Chip({ icon: Icon, label, color }: { icon: LucideIcon; label: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.chip, { backgroundColor: colors.backgroundElement }]}>
      <Icon size={14} color={color} />
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function PostLabel({ type }: { type: Post['type'] }) {
  const colors = useColors();
  const Icon = POST_ICONS[type];
  return (
    <View style={styles.inline}>
      <Icon size={14} color={colors.textSecondary} />
      <Text style={[styles.postType, { color: colors.textSecondary }]}>{POST_TYPE_LABELS[type].toUpperCase()}</Text>
    </View>
  );
}

// Profile buttons; the main one carries the live gradient
function Action({ icon: Icon, label, onPress, primary, compact }: { icon: LucideIcon; label: string; onPress: () => void; primary?: boolean; compact?: boolean }) {
  const colors = useColors();
  const body = (
    <>
      <Icon size={18} color={primary ? colors.onAccent : colors.text} />
      {!compact && <Text style={[styles.actionText, { color: primary ? colors.onAccent : colors.text }]}>{label}</Text>}
    </>
  );
  return (
    <Pressable onPress={onPress} aria-label={label} style={[styles.actionWrap, primary ? { flex: 2 } : compact ? { flex: 0 } : { flex: 1 }]}>
      {primary ? (
        <LinearGradient colors={LiveGradient} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.action}>
          {body}
        </LinearGradient>
      ) : (
        <View style={[styles.action, { backgroundColor: colors.backgroundElement }, compact && { paddingHorizontal: 16 }]}>{body}</View>
      )}
    </Pressable>
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
  profile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statValue: { fontFamily: Fonts.display, fontSize: 20 },
  statLabel: { fontFamily: Fonts.body, fontSize: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { fontFamily: Fonts.display, fontSize: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontFamily: Fonts.bodyBold, fontSize: 13 },
  row: { flexDirection: 'row', gap: Spacing.two },
  actionWrap: { borderRadius: 12, overflow: 'hidden' },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: 12, borderRadius: 12 },
  actionText: { fontFamily: Fonts.bodyBold, fontSize: 15 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  center: { textAlign: 'center' },
  postType: { fontFamily: Fonts.bodyBold, fontSize: 11, letterSpacing: 1 },
  paragraph: { fontSize: 16, lineHeight: 22 },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.displayBold },
  card: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  cardTitle: { fontFamily: Fonts.bodyBold, fontSize: 16 },
  link: { textDecorationLine: 'underline' },
});
