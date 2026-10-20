import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Flame, Heart, Play, Users, Video } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { IconComponent } from '@/components/icons';
import { Logo } from '@/components/logo';
import { Pill } from '@/components/pill';
import { StrobeLights } from '@/components/strobe-lights';
import { VenueAvatar } from '@/components/venue-avatar';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useCity } from '@/lib/city';
import { supabase, welcomeClipUrl } from '@/lib/supabase';
import type { Venue, VenueType, WelcomeClip } from '@/lib/types';
import { CITY, CROWD_LABELS, VENUE_TYPE_LABELS, VIBE_LABELS, distanceMeters, formatDistance, timeAgo, vibeColor } from '@/lib/vibe';

// Made-up looping example clips (animations, not real people or places) so a
// new visitor sees what the app looks like before making a profile.
type Example = { video: number | string; poster?: number; label: string; score: number; crowd: number; minutes: number; length: string };
const EXAMPLES: Example[] = [
  { video: require('@/assets/welcome/club.mp4'), poster: require('@/assets/welcome/club.jpg'), label: 'Klub', score: 4.8, crowd: 3, minutes: 2, length: '0:24' },
  { video: require('@/assets/welcome/cafe.mp4'), poster: require('@/assets/welcome/cafe.jpg'), label: 'Kafić', score: 4.6, crowd: 2, minutes: 5, length: '0:41' },
  { video: require('@/assets/welcome/concert.mp4'), poster: require('@/assets/welcome/concert.jpg'), label: 'Koncert', score: 4.5, crowd: 3, minutes: 8, length: '0:18' },
];

const FEATURES: { icon: IconComponent; title: string; text: string }[] = [
  { icon: Flame, title: 'Vidi gde gori', text: 'Ocena od 1 do 5 i gužva, uživo od ljudi koji su tamo.' },
  { icon: Video, title: 'Snimi i javi', text: 'Pošalji kratak snimak i oceni atmosferu za 10 sekundi.' },
  { icon: Heart, title: 'Sačuvaj omiljena', text: 'Prati svoja mesta i promocije koje objavljuju.' },
];

const SLIDES = 3;

// The first screen for people who are not signed in. Three pages to swipe
// through, with the sign up and log in buttons always visible below them.
export default function Welcome() {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);

  function goTo(index: number) {
    scroller.current?.scrollTo({ x: index * width, animated: true });
    setPage(index);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.column} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <StrobeLights />
        {width > 0 && (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            style={{ flex: 1 }}>
            <ScrollView style={{ width }} contentContainerStyle={styles.slide} showsVerticalScrollIndicator={false}>
              <LiveNow />
            </ScrollView>
            <ScrollView style={{ width }} contentContainerStyle={styles.slide} showsVerticalScrollIndicator={false}>
              <WhatYouGet />
            </ScrollView>
            <ScrollView style={{ width }} contentContainerStyle={styles.slide} showsVerticalScrollIndicator={false}>
              <Examples width={width} active={page === 2} />
            </ScrollView>
          </ScrollView>
        )}

        <View style={styles.dots}>
          {Array.from({ length: SLIDES }, (_, i) => (
            <Pressable key={i} onPress={() => goTo(i)} hitSlop={8} aria-label={`Strana ${i + 1}`}>
              <View style={[styles.dot, i === page && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        <View style={styles.buttons}>
          <Pressable style={[styles.button, { backgroundColor: Colors.accent }]} onPress={() => router.push({ pathname: '/login', params: { mode: 'signup' } })}>
            <Text style={[styles.buttonText, { color: Colors.onAccent }]}>Napravi profil</Text>
          </Pressable>
          <Pressable style={[styles.button, { backgroundColor: Colors.backgroundElement }]} onPress={() => router.push('/login')}>
            <Text style={[styles.buttonText, { color: Colors.text }]}>Već imam profil, prijavi me</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const hottestFirst = (venues: Venue[], vibes: ReturnType<typeof useCity>['vibes']) =>
  venues.filter((v) => vibes[v.id]?.report_count).sort((a, b) => (vibes[b.id].vibe_score ?? 0) - (vibes[a.id].vibe_score ?? 0));

// Page 1: the places that are live right now, straight from the database,
// over a soft club light.
function LiveNow() {
  const { venues, vibes } = useCity();
  const live = useMemo(() => hottestFirst(venues, vibes), [venues, vibes]);
  const shown = (live.length ? live : venues).slice(0, 4);

  return (
    <View style={{ flex: 1 }}>
      <Logo />
      <View style={styles.stories}>
        {shown.map((v) => {
          const score = vibes[v.id]?.vibe_score ?? null;
          return (
            <View key={v.id} style={styles.story}>
              <VenueAvatar type={v.type} size={64} live={!!vibes[v.id]?.report_count} />
              {score != null && (
                <View style={[styles.scoreChip, { backgroundColor: vibeColor(score) }]}>
                  <Text style={styles.scoreChipText}>{Number(score).toFixed(1)}</Text>
                </View>
              )}
              <Text style={[styles.storyName, score == null && { marginTop: 6 }]} numberOfLines={1}>
                {v.name}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.livePill}>
        <View style={styles.liveDot} />
        <Text style={styles.livePillText}>
          {live.length ? `${live.length} ${live.length === 1 ? 'mesto' : 'mesta'} uživo u Pančevu` : `${CITY} izlazi večeras`}
        </Text>
      </View>
      <Text style={[styles.headline, { marginTop: Spacing.four }]}>
        Gde <Text style={{ color: Colors.accent }}>gori</Text>
        {'\n'}večeras?
      </Text>
      <Text style={styles.body}>Vidi uživo kakva je atmosfera u klubovima, kafićima i na stadionima, pre nego što izađeš.</Text>
    </View>
  );
}

// Page 2: an example venue card and the three things the app does.
function WhatYouGet() {
  const { venues, vibes, position } = useCity();
  const hottest = hottestFirst(venues, vibes)[0];
  const vibe = hottest ? vibes[hottest.id] : null;
  const score = vibe?.vibe_score ?? 4.7;
  const crowd = vibe?.crowd ?? 3;
  const type: VenueType = hottest?.type ?? 'cafe';
  const meta = [
    VENUE_TYPE_LABELS[type],
    hottest ? (position ? formatDistance(distanceMeters(position, hottest)) : null) : '180 m',
    vibe?.last_report_at ? timeAgo(vibe.last_report_at) : 'pre 3 min',
  ].filter(Boolean);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.exampleCard}>
        <Image source={require('@/assets/welcome/card.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.cardTop}>
          <Pill live label="UŽIVO" />
          <View style={[styles.bigRing, { borderColor: vibeColor(score), boxShadow: `0 0 18px ${vibeColor(score)}66` }]}>
            <Text style={styles.bigRingText}>{Number(score).toFixed(1)}</Text>
          </View>
        </View>
        <View>
          <View style={styles.cardVenue}>
            <VenueAvatar type={type} size={44} live />
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.cardName} numberOfLines={1}>
                {hottest?.name ?? 'Kafić u centru'}
              </Text>
              <Text style={styles.cardMeta}>{meta.join(' · ')}</Text>
            </View>
          </View>
          <View style={styles.pills}>
            <Pill icon={Flame} label={VIBE_LABELS[Math.min(4, Math.max(0, Math.round(score) - 1))]} />
            <Pill icon={Users} label={CROWD_LABELS[crowd]} />
          </View>
        </View>
      </View>
      <View style={{ marginTop: Spacing.four }}>
        <Logo />
      </View>
      <Text style={[styles.headline, styles.headlineSmall, { marginTop: Spacing.one }]}>
        Izađi tamo gde je <Text style={{ color: Colors.accent }}>dobra atmosfera</Text>
      </Text>
      <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <View key={title} style={styles.feature}>
            <View style={styles.featureIcon}>
              <Icon size={22} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{title}</Text>
              <Text style={styles.featureText}>{text}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// Page 3: example clips playing the way they do inside the app. They only
// play while this page is on screen.
function Examples({ width, active }: { width: number; active: boolean }) {
  const gap = Spacing.two;
  const inner = width - Spacing.four * 2;
  const bigWidth = Math.floor((inner - gap) * 0.6);
  const smallWidth = inner - gap - bigWidth;
  const smallHeight = Math.round(smallWidth * 1.33);
  const [big, ...small] = useWelcomeClips();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.headline, styles.headlineSmall, { marginTop: 0 }]}>
        Ovako izgleda <Text style={{ color: Colors.accent }}>uživo</Text>
      </Text>
      <Text style={[styles.body, { marginTop: Spacing.two }]}>Ljudi koji su na licu mesta šalju kratke snimke, do 60 sekundi.</Text>
      <View style={{ flexDirection: 'row', gap, marginTop: Spacing.three }}>
        <ExampleClip key={String(big.video)} example={big} width={bigWidth} height={smallHeight * 2 + gap} active={active} big />
        <View style={{ gap }}>
          {small.map((e) => (
            <ExampleClip key={String(e.video)} example={e} width={smallWidth} height={smallHeight} active={active} />
          ))}
        </View>
      </View>
      <Text style={styles.note}>Ovo su primeri. Pravi snimci iz Pančeva te čekaju unutra.</Text>
    </View>
  );
}

// The admin can swap any of the three animations for a real clip (see the
// admin screen); slots without one keep the built-in animation.
function useWelcomeClips() {
  const [clips, setClips] = useState<WelcomeClip[]>([]);
  useEffect(() => {
    supabase
      .from('welcome_clips')
      .select('slot, video_path, label')
      .then(({ data }) => setClips(data ?? []));
  }, []);
  return EXAMPLES.map((example, i) => {
    const clip = clips.find((c) => c.slot === i + 1);
    return clip ? { ...example, video: welcomeClipUrl(clip.video_path), poster: undefined, label: clip.label || example.label } : example;
  });
}

function ExampleClip({ example: e, width, height, active, big }: { example: Example; width: number; height: number; active: boolean; big?: boolean }) {
  const player = useVideoPlayer(e.video, (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [player, active]);

  return (
    <View style={[styles.tile, { width, height }]}>
      {e.poster && <Image source={e.poster} style={StyleSheet.absoluteFill} contentFit="cover" />}
      <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />
      <LinearGradient colors={['transparent', 'rgba(12,18,16,0.9)']} style={styles.tileShade} />
      {big && (
        <View style={styles.tileLive}>
          <Pill live label="UŽIVO" />
        </View>
      )}
      <View style={styles.tileLength}>
        <Play size={10} color={Colors.text} fill={Colors.text} />
        <Text style={styles.tileSmall}>{e.length}</Text>
      </View>
      <View style={styles.tileInfo}>
        <View style={styles.tileScoreRow}>
          <Flame size={big ? 18 : 13} color={Colors.accent} />
          <Text style={[styles.tileScore, big && { fontSize: 20 }]}>{e.score.toFixed(1)}</Text>
        </View>
        <Text style={[styles.tileLabel, big && { fontSize: 14 }]} numberOfLines={1}>
          {e.label} · {CROWD_LABELS[e.crowd]}
        </Text>
        <Text style={styles.tileSmall}>pre {e.minutes} min</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // On web the video element keeps its own size unless told to fill the box
  video: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  screen: { flex: 1, backgroundColor: Colors.background, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 520, overflow: 'hidden' },
  slide: { flexGrow: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.four, overflow: 'hidden' },
  stories: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.five, maxWidth: 360 },
  story: { width: 74, alignItems: 'center' },
  scoreChip: { marginTop: -10, borderRadius: 6, borderWidth: 2, borderColor: Colors.background, paddingHorizontal: 5 },
  scoreChipText: { color: '#fff', fontFamily: Fonts.bodyBold, fontSize: 11 },
  storyName: { color: Colors.text, fontFamily: Fonts.body, fontSize: 11, marginTop: 3, maxWidth: 74 },
  livePill: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 8, marginTop: Spacing.four, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(22,32,28,0.85)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, boxShadow: `0 0 10px ${Colors.accent}` },
  livePillText: { color: Colors.text, fontFamily: Fonts.bodyBold, fontSize: 13 },
  headline: { color: Colors.text, fontFamily: Fonts.display, fontSize: 34, lineHeight: 40 },
  headlineSmall: { fontSize: 24, lineHeight: 30, marginTop: Spacing.four },
  body: { color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 16, lineHeight: 23, marginTop: Spacing.three },
  exampleCard: { height: 200, borderRadius: 24, padding: Spacing.three, justifyContent: 'space-between', overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bigRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.backgroundElement },
  bigRingText: { color: Colors.text, fontFamily: Fonts.displayBold, fontSize: 18 },
  cardVenue: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardName: { color: Colors.text, fontFamily: Fonts.bodyBold, fontSize: 16 },
  cardMeta: { color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 12 },
  pills: { flexDirection: 'row', gap: 6, marginTop: 10 },
  feature: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: Colors.backgroundElement, borderRadius: 18, padding: 14 },
  featureIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.backgroundSelected, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { color: Colors.text, fontFamily: Fonts.bodyBold, fontSize: 16 },
  featureText: { color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 14, marginTop: 2 },
  tile: { borderRadius: 14, overflow: 'hidden', backgroundColor: Colors.backgroundElement },
  tileShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  tileLive: { position: 'absolute', top: 8, left: 8 },
  tileLength: { position: 'absolute', top: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(12,18,16,0.7)', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  tileInfo: { position: 'absolute', left: 8, right: 8, bottom: 6 },
  tileScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tileScore: { color: Colors.text, fontFamily: Fonts.displayBold, fontSize: 14 },
  tileLabel: { color: Colors.text, fontFamily: Fonts.bodyBold, fontSize: 12 },
  tileSmall: { color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 10 },
  note: { color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 12, textAlign: 'center', marginTop: Spacing.three },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: Spacing.three },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.backgroundSelected },
  dotActive: { width: 22, backgroundColor: Colors.accent },
  buttons: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three, gap: 10 },
  button: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: Fonts.bodyBold, fontSize: 16 },
});
