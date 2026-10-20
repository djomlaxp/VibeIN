import { router, useLocalSearchParams } from 'expo-router';
import { Heart, MapPin, Share2, Users, Video, X, type LucideIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { genreIcon } from '@/components/icons';
import { Pill } from '@/components/pill';
import { ShareSheet } from '@/components/share-sheet';
import { VENUE_ICONS, VenueAvatar } from '@/components/venue-avatar';
import { VenueMedia } from '@/components/venue-media';
import { VibeBadge } from '@/components/vibe-badge';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { REPORT_COLUMNS, useCity } from '@/lib/city';
import { latestClip, latestGenre, latestPost } from '@/lib/feed';
import { supabase } from '@/lib/supabase';
import type { Venue, VibeReport } from '@/lib/types';
import { CROWD_LABELS, VENUE_TYPE_LABELS, distanceMeters, formatDistance, timeAgo } from '@/lib/vibe';

type Tab = 'near' | 'hot' | 'saved';
const TABS: { key: Tab; label: string }[] = [
  { key: 'near', label: 'Blizu mene' },
  { key: 'hot', label: 'Gde gori' },
  { key: 'saved', label: 'Omiljeno' },
];

// One full-screen page per venue (or per clip of one venue), swiped up and down
type Slide = { key: string; venue: Venue; clip: VibeReport | null };

export default function Live() {
  // venue: start at this venue. clips=1: show every clip of that venue instead of the whole city
  const params = useLocalSearchParams<{ venue?: string; clips?: string; report?: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { venues, vibes, reports, posts, position, favorites, toggleFavorite } = useCity();
  const [tab, setTab] = useState<Tab>('hot');
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(0);
  const [venueClips, setVenueClips] = useState<VibeReport[] | null>(null);
  const [sharing, setSharing] = useState<Slide | null>(null);
  const list = useRef<FlatList<Slide>>(null);
  const clipMode = params.clips === '1' && !!params.venue;

  // A venue's own clips: the last 3 hours plus the ones the owner archived
  useEffect(() => {
    if (!clipMode) return;
    supabase
      .from('vibe_reports')
      .select(REPORT_COLUMNS)
      .eq('venue_id', params.venue!)
      .not('video_path', 'is', null)
      .or(`archived.eq.true,created_at.gte.${new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()}`)
      .order('created_at', { ascending: false })
      .then(({ data }) => setVenueClips((data as VibeReport[]) ?? []));
  }, [clipMode, params.venue]);

  const slides = useMemo<Slide[]>(() => {
    if (clipMode) {
      const venue = venues.find((v) => v.id === params.venue);
      return venue ? (venueClips ?? []).map((c) => ({ key: c.id, venue, clip: c })) : [];
    }
    const live = venues.filter((v) => vibes[v.id]?.report_count);
    const score = (v: Venue) => vibes[v.id]?.vibe_score ?? -1;
    const away = (v: Venue) => (position ? distanceMeters(position, v) : 0);
    const picked =
      tab === 'hot'
        ? live.sort((a, b) => score(b) - score(a))
        : tab === 'near'
          ? live.sort((a, b) => away(a) - away(b) || score(b) - score(a))
          : venues.filter((v) => favorites.has(v.id)).sort((a, b) => score(b) - score(a));
    return picked.map((v) => ({ key: v.id, venue: v, clip: latestClip(reports, v.id) ?? null }));
  }, [clipMode, venueClips, venues, vibes, reports, position, favorites, tab, params.venue]);

  // Open at the venue or clip that was tapped
  const start = params.report ?? params.venue;
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || !height || !slides.length) return;
    jumped.current = true;
    const i = slides.findIndex((s) => s.key === start || (!clipMode && s.venue.id === start));
    if (i > 0) {
      setActive(i);
      requestAnimationFrame(() => list.current?.scrollToOffset({ offset: i * height, animated: false }));
    }
  }, [height, slides, start, clipMode]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
    if (viewableItems[0]?.index != null) setActive(viewableItems[0].index);
  }).current;

  const close = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), []);

  async function save(id: string) {
    if (!(await toggleFavorite(id))) router.push('/login');
  }

  const empty = clipMode
    ? 'Ovo mesto trenutno nema snimaka.'
    : tab === 'saved'
      ? session
        ? 'Još nemaš omiljena mesta. Pritisni srce kod mesta koje ti se sviđa.'
        : 'Prijavi se da bi čuvao omiljena mesta.'
      : 'Još niko nije javio atmosferu večeras. Budi prvi!';

  return (
    <View style={styles.screen} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 && (
        <FlatList
          ref={list}
          data={slides}
          keyExtractor={(s) => s.key}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          ListEmptyComponent={
            <View style={[styles.emptyBox, { height }]}>
              <Text style={styles.emptyText}>{empty}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const { venue: v, clip } = item;
            const now = vibes[v.id];
            const post = latestPost(posts, v.id);
            const genre = clip?.music_genre ?? latestGenre(reports, v.id);
            const saved = favorites.has(v.id);
            const caption = clipMode
              ? clip
                ? `Snimak gosta ${timeAgo(clip.created_at)}${clip.archived ? ' · arhiva' : ''}`
                : ''
              : post?.title ?? (clip ? `Snimak gosta ${timeAgo(clip.created_at)}.` : 'Još nema snimka odavde. Snimi prvi!');
            return (
              <VenueMedia type={v.type} videoPath={clip?.video_path} playing={index === active} style={{ height }}>
                <View style={[styles.rail, { bottom: insets.bottom + 120 }]}>
                  <VibeBadge score={clipMode && clip ? clip.vibe : now?.vibe_score ?? null} size="large" />
                  <RailButton icon={Heart} label={saved ? 'Sačuvano' : 'Sačuvaj'} active={saved} onPress={() => save(v.id)} />
                  <RailButton icon={MapPin} label="Vodi me" onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`)} />
                  <RailButton icon={Share2} label="Podeli" onPress={() => setSharing(item)} />
                  <RailButton icon={Video} label="Snimi" onPress={() => router.push(session ? { pathname: '/report/[id]', params: { id: v.id } } : '/login')} />
                </View>
                <View style={[styles.info, { paddingBottom: insets.bottom + Spacing.four }]}>
                  <Pressable style={styles.who} onPress={() => router.push({ pathname: '/venue/[id]', params: { id: v.id } })}>
                    <VenueAvatar type={v.type} size={40} live={!!now?.report_count} />
                    <Text style={styles.name}>{v.name}</Text>
                  </Pressable>
                  {!!caption && <Text style={styles.caption}>{caption}</Text>}
                  <View style={styles.pills}>
                    {!!now?.report_count && <Pill live label="UŽIVO" />}
                    {now?.crowd != null && <Pill icon={Users} label={CROWD_LABELS[now.crowd]} />}
                    {genre && <Pill icon={genreIcon(genre)} label={genre} />}
                    <Pill icon={VENUE_ICONS[v.type]} label={VENUE_TYPE_LABELS[v.type]} />
                    {position && <Pill label={formatDistance(distanceMeters(position, v))} />}
                  </View>
                </View>
              </VenueMedia>
            );
          }}
        />
      )}
      {sharing && <ShareSheet venue={sharing.venue} clip={sharing.clip} onClose={() => setSharing(null)} />}
      <View style={[styles.top, { paddingTop: insets.top + Spacing.two }]} pointerEvents="box-none">
        <Pressable onPress={close} aria-label="Zatvori" hitSlop={10} style={styles.close}>
          <X size={26} color={Colors.text} />
        </Pressable>
        {clipMode ? (
          <Text style={[styles.tab, styles.tabOn]}>{venues.find((v) => v.id === params.venue)?.name ?? ''}</Text>
        ) : (
          <View style={styles.tabs}>
            {TABS.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => {
                  setTab(t.key);
                  setActive(0);
                  list.current?.scrollToOffset({ offset: 0, animated: false });
                }}>
                <Text style={[styles.tab, tab === t.key && styles.tabOn]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function RailButton({ icon: Icon, label, onPress, active }: { icon: LucideIcon; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} aria-label={label} style={styles.railButton}>
      <Icon size={30} color={active ? Colors.accent : Colors.text} fill={active ? Colors.accent : 'transparent'} />
      <Text style={styles.railText}>{label}</Text>
    </Pressable>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three },
  close: { position: 'absolute', left: Spacing.three, bottom: 2 },
  tabs: { flexDirection: 'row', gap: Spacing.four },
  tab: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.textSecondary, paddingBottom: 4, ...shadow },
  tabOn: { color: Colors.text, borderBottomWidth: 2, borderColor: Colors.accent },
  rail: { position: 'absolute', right: Spacing.three, alignItems: 'center', gap: Spacing.three },
  railButton: { alignItems: 'center', gap: 2 },
  railText: { color: Colors.text, fontFamily: Fonts.bodyBold, fontSize: 12, ...shadow },
  info: { position: 'absolute', left: 0, right: 90, bottom: 0, paddingHorizontal: Spacing.three, gap: Spacing.two },
  who: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { color: Colors.text, fontFamily: Fonts.bodyBold, fontSize: 17, ...shadow },
  caption: { color: Colors.text, fontFamily: Fonts.body, fontSize: 15, lineHeight: 21, ...shadow },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  emptyText: { color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 16, textAlign: 'center' },
});
