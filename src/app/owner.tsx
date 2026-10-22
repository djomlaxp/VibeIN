import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Clock,
  Eye,
  Flame,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Store,
  Trash2,
  Video,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { genreIcon, type IconComponent } from '@/components/icons';
import { VENUE_ICONS, POST_ICONS } from '@/components/venue-avatar';
import { VenueMedia } from '@/components/venue-media';
import { Fonts, OwnerColors as C, OwnerGradient, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { REPORT_COLUMNS, useCity } from '@/lib/city';
import { WEEKDAYS, clipStillAvailable, ownerStats } from '@/lib/owner';
import { supabase } from '@/lib/supabase';
import type { Post, Venue, VibeReport } from '@/lib/types';
import { POST_TYPE_LABELS, VENUE_TYPE_LABELS, errorMessage, timeAgo, vibeColor } from '@/lib/vibe';

type Claim = { id: string; venue_id: string; status: 'pending' | 'approved' | 'rejected'; created_at: string };

// VibeIN Biznis: the owners' part of the app, in its own violet and gold.
// Owners see a dashboard for their venue; everyone else sees what owners get
// and can look up their venue to claim it.
export default function OwnerScreen() {
  const { venue: wanted } = useLocalSearchParams<{ venue?: string }>();
  const { session } = useAuth();
  const { venues } = useCity();
  const mine = venues.filter((v) => v.owner_id === session?.user.id && v.verified);
  const [picked, setPicked] = useState<string | null>(null);
  const venue = mine.find((v) => v.id === (picked ?? wanted)) ?? mine[0];
  const { bottom } = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'VibeIN Biznis',
          headerStyle: { backgroundColor: C.background },
          headerTintColor: C.text,
          contentStyle: { backgroundColor: C.background, paddingBottom: bottom },
        }}
      />
      {venue ? <Dashboard venue={venue} mine={mine} onPick={setPicked} /> : <Landing venues={venues} />}
    </>
  );
}

function Dashboard({ venue, mine, onPick }: { venue: Venue; mine: Venue[]; onPick: (id: string) => void }) {
  const { vibes } = useCity();
  const [reports, setReports] = useState<VibeReport[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [r, a, p] = await Promise.all([
      supabase.from('vibe_reports').select(REPORT_COLUMNS).eq('venue_id', venue.id).gte('created_at', since).order('created_at', { ascending: false }),
      supabase.from('vibe_reports').select(REPORT_COLUMNS).eq('venue_id', venue.id).eq('archived', true).order('archived_at', { ascending: false }),
      supabase.from('posts').select('*').eq('venue_id', venue.id).order('created_at', { ascending: false }).limit(30),
    ]);
    const recent = (r.data as VibeReport[]) ?? [];
    const kept = ((a.data as VibeReport[]) ?? []).filter((x) => !recent.some((y) => y.id === x.id));
    setReports([...recent, ...kept]);
    setPosts((p.data as Post[]) ?? []);
    setError(r.error || p.error ? errorMessage(r.error ?? p.error) : null);
  }, [venue.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const month = useMemo(() => reports.filter((r) => Date.now() - new Date(r.created_at).getTime() < 30 * 24 * 60 * 60 * 1000), [reports]);
  const stats = useMemo(() => ownerStats(month), [month]);
  const clips = reports.filter(clipStillAvailable);
  const now = vibes[venue.id];
  const score = now?.vibe_score == null ? null : Number(now.vibe_score);
  const Icon = VENUE_ICONS[venue.type];
  const nowIso = new Date().toISOString();
  const active = (p: Post) => !p.valid_to || p.valid_to > nowIso;

  async function toggleArchive(r: VibeReport) {
    const { error } = await supabase.rpc('set_video_archived', { p_report_id: r.id, p_archived: !r.archived });
    setError(error ? errorMessage(error) : null);
    load();
  }

  async function deletePost(p: Post) {
    if (confirmDelete !== p.id) return setConfirmDelete(p.id);
    setConfirmDelete(null);
    const { error } = await supabase.from('posts').delete().eq('id', p.id);
    setError(error ? errorMessage(error) : null);
    load();
  }

  return (
    <ScrollView style={{ backgroundColor: C.background }} contentContainerStyle={styles.content}>
      {mine.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
          {mine.map((v) => (
            <Pressable key={v.id} onPress={() => onPick(v.id)} style={[styles.chip, v.id === venue.id && { backgroundColor: C.accent }]}>
              <Text style={[styles.chipText, v.id === venue.id && { color: C.onAccent }]}>{v.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <LinearGradient colors={[C.backgroundSelected, C.backgroundElement]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroTop}>
          <LinearGradient colors={OwnerGradient} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.heroAvatar}>
            <View style={styles.heroAvatarInner}>
              <Icon size={30} color={C.text} strokeWidth={1.8} />
            </View>
          </LinearGradient>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.heroName} numberOfLines={1}>
              {venue.name}
            </Text>
            <View style={styles.inline}>
              <BadgeCheck size={16} color={C.accent} />
              <Text style={styles.muted}>Verifikovan vlasnik · {VENUE_TYPE_LABELS[venue.type]}</Text>
            </View>
          </View>
        </View>
        <View style={styles.heroStats}>
          <Big value={score == null ? '–' : score.toFixed(1)} label="vibe sada" color={score == null ? C.textSecondary : vibeColor(score)} />
          <Big value={String(now?.report_count ?? 0)} label="objava (90 min)" />
          <Big value={String(posts.filter(active).length)} label="tvojih aktivnih" />
        </View>
        <View style={styles.plan}>
          <Sparkles size={16} color={C.accent} />
          <Text style={styles.planText}>Probni period: sve je besplatno</Text>
        </View>
      </LinearGradient>

      <View style={styles.actions}>
        <Action icon={Plus} label="Nova objava" primary onPress={() => router.push({ pathname: '/post/[id]', params: { id: venue.id } })} />
        <Action icon={Pencil} label="Uredi profil" onPress={() => router.push({ pathname: '/edit/[id]', params: { id: venue.id } })} />
        <Action icon={Eye} label="Kako te vide gosti" onPress={() => router.push({ pathname: '/venue/[id]', params: { id: venue.id } })} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Section icon={BarChart3} title="Poslednjih 30 dana">
        <View style={styles.grid}>
          <Tile value={String(stats.today)} label="objava gostiju danas" />
          <Tile value={String(stats.week)} label="ove nedelje" />
          <Tile value={String(stats.month)} label="za 30 dana" />
          <Tile value={stats.avgVibe == null ? '–' : stats.avgVibe.toFixed(1)} label="prosečan vibe" color={stats.avgVibe == null ? undefined : vibeColor(stats.avgVibe)} />
          <Tile value={String(stats.withVideo)} label="sa snimkom" />
          <Tile value={stats.topGenre ?? '–'} label="najčešća muzika" small icon={stats.topGenre ? genreIcon(stats.topGenre) : undefined} />
        </View>
      </Section>

      <Section icon={CalendarDays} title="Kad je kod tebe najživlje">
        {stats.month === 0 ? (
          <Text style={styles.muted}>Još nema objava gostiju. Zamoli goste da objave atmosferu, pa će ovde stajati kad im je najlepše kod tebe.</Text>
        ) : (
          <>
            <Text style={styles.muted}>
              Najviše objava: <Text style={styles.strong}>{WEEKDAYS[stats.busiestDay ?? 0]}</Text>, oko{' '}
              <Text style={styles.strong}>{String(stats.busiestHour ?? 0).padStart(2, '0')}h</Text>. Tada je dobro vreme za akciju ili najavu.
            </Text>
            <Bars values={stats.byWeekday} labels={WEEKDAYS} highlight={stats.busiestDay} />
            <View style={styles.inline}>
              <Clock size={14} color={C.textSecondary} />
              <Text style={styles.small}>Po satu</Text>
            </View>
            <Bars values={stats.byHour} labels={[]} highlight={stats.busiestHour} thin />
            <View style={styles.hourAxis}>
              {['0h', '6h', '12h', '18h'].map((h) => (
                <Text key={h} style={[styles.barLabel, { flex: 1 }]}>
                  {h}
                </Text>
              ))}
            </View>
          </>
        )}
      </Section>

      <Section icon={Video} title="Snimci gostiju">
        <Text style={styles.muted}>Snimci se brišu posle 3 sata. Dodirni zvezdicu da sačuvaš najbolje na profilu lokala, tada ostaju zauvek.</Text>
        {clips.length === 0 ? (
          <Text style={styles.small}>Trenutno nema snimaka.</Text>
        ) : (
          <View style={styles.clips}>
            {clips.map((r) => (
              <View key={r.id} style={styles.clip}>
                <VenueMedia type={venue.type} videoPath={r.video_path} style={StyleSheet.absoluteFill}>
                  <Pressable
                    onPress={() => toggleArchive(r)}
                    aria-label={r.archived ? 'Ukloni sa profila' : 'Sačuvaj na profilu'}
                    hitSlop={8}
                    style={[styles.star, r.archived && { backgroundColor: C.accent }]}>
                    <Star size={16} color={r.archived ? C.onAccent : C.text} fill={r.archived ? C.onAccent : 'transparent'} />
                  </Pressable>
                  <Text style={styles.clipTime}>{r.archived ? 'Sačuvan' : timeAgo(r.created_at)}</Text>
                </VenueMedia>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section icon={Megaphone} title="Tvoje objave">
        {posts.length === 0 ? (
          <Text style={styles.muted}>Još nisi ništa objavio. Akcija, najava svirke ili obaveštenje pojavljuje se gostima na naslovnoj i na stranici lokala.</Text>
        ) : (
          posts.map((p) => {
            const PostIcon = POST_ICONS[p.type];
            const on = active(p);
            return (
              <View key={p.id} style={[styles.post, !on && { opacity: 0.55 }]}>
                <View style={styles.postIcon}>
                  <PostIcon size={18} color={C.accent} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.postTitle} numberOfLines={2}>
                    {p.title}
                  </Text>
                  <Text style={styles.small}>
                    {POST_TYPE_LABELS[p.type]} · {on ? (p.valid_to ? `traje do ${new Date(p.valid_to).toLocaleDateString('sr-Latn')}` : 'bez roka') : 'isteklo'}
                  </Text>
                </View>
                <Pressable onPress={() => deletePost(p)} hitSlop={8} style={styles.inline} aria-label="Obriši objavu">
                  {confirmDelete === p.id ? <Text style={styles.danger}>Obriši?</Text> : <Trash2 size={18} color={C.textSecondary} />}
                </Pressable>
              </View>
            );
          })
        )}
      </Section>

      <Section icon={Sparkles} title="Saveti">
        <Tip text="Objavi akciju sat-dva pre dana i sata kad je kod tebe najživlje." />
        <Tip text="Sačuvaj najbolje snimke gostiju: novi gosti vide kakva je atmosfera i kad niko nije uživo." />
        <Tip text="Upiši radno vreme, telefon i Instagram da te gosti lako nađu." />
        <Tip text="Vlasnik ne može da objavljuje atmosferu u svom lokalu, da bi ocene ostale poštene." />
      </Section>
    </ScrollView>
  );
}

function Landing({ venues }: { venues: Venue[] }) {
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      supabase
        .from('venue_claims')
        .select('id, venue_id, status, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setClaims((data as Claim[]) ?? []));
    }, [session]),
  );

  const q = query.trim().toLowerCase();
  const found = q.length < 2 ? [] : venues.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 8);
  const name = (id: string) => venues.find((v) => v.id === id)?.name ?? 'Lokal';

  return (
    <ScrollView style={{ backgroundColor: C.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={[C.backgroundSelected, C.backgroundElement]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Store size={36} color={C.accent} />
        <Text style={styles.landingTitle}>
          Tvoj lokal na <Text style={{ color: C.accent }}>VibeIN</Text>-u
        </Text>
        <Text style={styles.muted}>Gosti već gledaju kakva je atmosfera kod tebe. Preuzmi profil lokala i pričaj sa njima direktno.</Text>
        <View style={styles.plan}>
          <Sparkles size={16} color={C.accent} />
          <Text style={styles.planText}>Besplatno u probnom periodu</Text>
        </View>
      </LinearGradient>

      <Section icon={Flame} title="Šta dobijaš">
        <Benefit icon={Megaphone} title="Akcije i najave" text="Objavi happy hour, svirku ili utakmicu. Gosti je vide na naslovnoj." />
        <Benefit icon={Pencil} title="Uredan profil" text="Opis, adresa, radno vreme, telefon, Instagram i link za rezervaciju." />
        <Benefit icon={Star} title="Najbolji snimci" text="Sačuvaj najbolje snimke gostiju na profilu, ne brišu se posle 3 sata." />
        <Benefit icon={BarChart3} title="Statistika" text="Koliko gostiju objavljuje, prosečan vibe i kad je kod tebe najživlje." />
      </Section>

      {claims.length > 0 && (
        <Section icon={BadgeCheck} title="Tvoji zahtevi">
          {claims.map((c) => (
            <Pressable key={c.id} onPress={() => router.push({ pathname: '/claim/[id]', params: { id: c.venue_id } })} style={styles.post}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.postTitle}>{name(c.venue_id)}</Text>
                <Text style={styles.small}>
                  {c.status === 'pending' ? 'Čeka odobrenje' : c.status === 'approved' ? 'Odobreno' : 'Odbijeno'} · {timeAgo(c.created_at)}
                </Text>
              </View>
            </Pressable>
          ))}
        </Section>
      )}

      <Section icon={Search} title="Nađi svoj lokal">
        <TextInput value={query} onChangeText={setQuery} placeholder="Ime lokala" placeholderTextColor={C.textSecondary} style={styles.input} autoCorrect={false} />
        {found.map((v) => {
          const VIcon = VENUE_ICONS[v.type];
          const taken = !!v.owner_id;
          const asked = claims.some((c) => c.venue_id === v.id && c.status === 'pending');
          return (
            <Pressable
              key={v.id}
              disabled={taken || asked}
              onPress={() => router.push(session ? { pathname: '/claim/[id]', params: { id: v.id } } : '/login')}
              style={[styles.post, (taken || asked) && { opacity: 0.5 }]}>
              <View style={styles.postIcon}>
                <VIcon size={18} color={C.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.postTitle}>{v.name}</Text>
                <Text style={styles.small}>{taken ? 'Već ima vlasnika' : asked ? 'Tvoj zahtev čeka odobrenje' : `${VENUE_TYPE_LABELS[v.type]}${v.address ? ` · ${v.address}` : ''}`}</Text>
              </View>
              {!taken && !asked && <Text style={styles.link}>Preuzmi</Text>}
            </Pressable>
          );
        })}
        {q.length >= 2 && found.length === 0 && <Text style={styles.small}>Nema lokala sa tim imenom. Piši nam pa ćemo ga dodati.</Text>}
      </Section>
    </ScrollView>
  );
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.inline}>
        <Icon size={18} color={C.accent} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Big({ value, label, color = C.text }: { value: string; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[styles.bigValue, { color }]}>{value}</Text>
      <Text style={styles.small}>{label}</Text>
    </View>
  );
}

function Tile({ value, label, color = C.text, small, icon: Icon }: { value: string; label: string; color?: string; small?: boolean; icon?: IconComponent }) {
  return (
    <View style={styles.tile}>
      <View style={styles.inline}>
        {Icon && <Icon size={18} color={C.accent} />}
        <Text style={[styles.tileValue, small && { fontSize: 16 }, { color }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={styles.small}>{label}</Text>
    </View>
  );
}

function Bars({ values, labels, highlight, thin }: { values: number[]; labels: string[]; highlight: number | null; thin?: boolean }) {
  const max = Math.max(1, ...values);
  return (
    <View style={styles.bars}>
      {values.map((v, i) => (
        <View key={i} style={styles.barCol}>
          <View style={[styles.barTrack, thin && { height: 60 }]}>
            <View style={[styles.bar, { height: `${(v / max) * 100}%`, backgroundColor: i === highlight ? C.accent : C.accentSoft, opacity: v ? 1 : 0.25 }]} />
          </View>
          {!thin && (
            <Text style={styles.barLabel} numberOfLines={1}>
              {labels[i]}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function Action({ icon: Icon, label, onPress, primary }: { icon: LucideIcon; label: string; onPress: () => void; primary?: boolean }) {
  const body = (
    <>
      <Icon size={18} color={primary ? C.onAccent : C.text} />
      <Text style={[styles.actionText, { color: primary ? C.onAccent : C.text }]} numberOfLines={1}>
        {label}
      </Text>
    </>
  );
  return (
    <Pressable onPress={onPress} style={[styles.actionWrap, primary && { flexBasis: '100%' }]}>
      {primary ? (
        <LinearGradient colors={OwnerGradient} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.action}>
          {body}
        </LinearGradient>
      ) : (
        <View style={[styles.action, { backgroundColor: C.backgroundElement }]}>{body}</View>
      )}
    </Pressable>
  );
}

function Benefit({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <View style={styles.post}>
      <View style={styles.postIcon}>
        <Icon size={18} color={C.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.postTitle}>{title}</Text>
        <Text style={styles.small}>{text}</Text>
      </View>
    </View>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <View style={styles.tip}>
      <View style={styles.tipDot} />
      <Text style={[styles.muted, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, maxWidth: 800, width: '100%', alignSelf: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  muted: { color: C.textSecondary, fontFamily: Fonts.body, fontSize: 15, lineHeight: 21 },
  small: { color: C.textSecondary, fontFamily: Fonts.body, fontSize: 13 },
  strong: { color: C.text, fontFamily: Fonts.bodyBold },
  error: { color: C.danger, fontFamily: Fonts.body, fontSize: 14 },
  danger: { color: C.danger, fontFamily: Fonts.bodyBold, fontSize: 14 },
  link: { color: C.accent, fontFamily: Fonts.bodyBold, fontSize: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: C.backgroundElement },
  chipText: { color: C.text, fontFamily: Fonts.bodyBold },
  hero: { borderRadius: 20, padding: Spacing.three, gap: Spacing.three, borderWidth: 1, borderColor: '#FFC94D22' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  heroAvatar: { width: 68, height: 68, borderRadius: 34, padding: 3 },
  heroAvatarInner: { flex: 1, borderRadius: 34, borderWidth: 3, borderColor: C.backgroundElement, backgroundColor: C.backgroundSelected, alignItems: 'center', justifyContent: 'center' },
  heroName: { color: C.text, fontFamily: Fonts.display, fontSize: 22 },
  heroStats: { flexDirection: 'row' },
  bigValue: { fontFamily: Fonts.display, fontSize: 26 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#FFC94D1F' },
  planText: { color: C.accent, fontFamily: Fonts.bodyBold, fontSize: 13 },
  landingTitle: { color: C.text, fontFamily: Fonts.display, fontSize: 26, lineHeight: 34 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  actionWrap: { flexGrow: 1, flexBasis: '40%', borderRadius: 12, overflow: 'hidden' },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12 },
  actionText: { fontFamily: Fonts.bodyBold, fontSize: 14 },
  section: { backgroundColor: C.backgroundElement, borderRadius: 16, padding: Spacing.three, gap: Spacing.three },
  sectionTitle: { color: C.text, fontFamily: Fonts.displayBold, fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { flexGrow: 1, flexBasis: '30%', minWidth: 96, backgroundColor: C.backgroundSelected, borderRadius: 12, padding: 12, gap: 4 },
  tileValue: { fontFamily: Fonts.display, fontSize: 22 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { width: '100%', height: 90, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 3 },
  hourAxis: { flexDirection: 'row', marginTop: -Spacing.two },
  barLabel: { color: C.textSecondary, fontFamily: Fonts.body, fontSize: 10 },
  clips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  clip: { width: '32.4%', aspectRatio: 3 / 4, borderRadius: 10, overflow: 'hidden', backgroundColor: C.backgroundSelected },
  star: { position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#110D1A99' },
  clipTime: { position: 'absolute', left: 8, bottom: 6, color: '#fff', fontFamily: Fonts.bodyBold, fontSize: 12 },
  post: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 4 },
  postIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: C.backgroundSelected },
  postTitle: { color: C.text, fontFamily: Fonts.bodyBold, fontSize: 15 },
  input: { color: C.text, backgroundColor: C.backgroundSelected, padding: Spacing.three, borderRadius: 12, fontSize: 16 },
  tip: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginTop: 8 },
});
