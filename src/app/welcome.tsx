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
import { VenueAvatar } from '@/components/venue-avatar';
import { VibeBadge } from '@/components/vibe-badge';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useCity } from '@/lib/city';
import type { VenueType } from '@/lib/types';
import { CITY, CROWD_LABELS, VENUE_TYPE_LABELS, VIBE_LABELS, timeAgo } from '@/lib/vibe';

// Made-up looping example clips (animations, not real people or places) so a
// new visitor sees what the app looks like before making a profile.
type Example = { video: number; poster: number; label: string; score: number; crowd: number; minutes: number; length: string };
const EXAMPLES: Example[] = [
  { video: require('@/assets/welcome/club.mp4'), poster: require('@/assets/welcome/club.jpg'), label: 'Klub', score: 4.8, crowd: 3, minutes: 2, length: '0:24' },
  { video: require('@/assets/welcome/stadium.mp4'), poster: require('@/assets/welcome/stadium.jpg'), label: 'Stadion', score: 4.6, crowd: 3, minutes: 5, length: '0:41' },
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

// Page 1: the places that are live right now, straight from the database.
function LiveNow() {
  const { venues, vibes } = useCity();
  const live = useMemo(
    () => venues.filter((v) => vibes[v.id]?.report_count).sort((a, b) => (vibes[b.id].vibe_score ?? 0) - (vibes[a.id].vibe_score ?? 0)),
    [venues, vibes],
  );
  const shown = (live.length ? live : venues).slice(0, 5);

  return (
    <View style={{ flex: 1 }}>
      <Glow color={Colors.accent} style={{ top: -80, left: -90 }} />
      <Glow color="#2FD3E0" style={{ top: 140, right: -120 }} />
      <Logo />
      <View style={styles.stories}>
        {shown.map((v) => (
          <View key={v.id} style={styles.story}>
            <VenueAvatar type={v.type} size={60} live={!!vibes[v.id]?.report_count} />
            <Text style={styles.storyName} numberOfLines={1}>
              {v.name}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ flex: 1, minHeight: Spacing.four }} />
      <View style={{ flexDirection: 'row' }}>
        <Pill live label={live.length ? `${live.length} ${live.length === 1 ? 'mesto' : 'mesta'} uživo u Pančevu` : `${CITY} izlazi večeras`} />
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
  const { venues, vibes } = useCity();
  const hottest = venues
    .filter((v) => vibes[v.id]?.report_count)
    .sort((a, b) => (vibes[b.id].vibe_score ?? 0) - (vibes[a.id].vibe_score ?? 0))[0];
  const vibe = hottest ? vibes[hottest.id] : null;
  const score = vibe?.vibe_score ?? 4.7;
  const crowd = vibe?.crowd ?? 3;
  const type: VenueType = hottest?.type ?? 'cafe';

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={[Colors.backgroundSelected, Colors.background]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={styles.exampleCard}>
        <Glow color={Colors.accent} size={200} style={{ top: 10, left: 70, opacity: 0.12 }} />
        <View style={styles.cardTop}>
          <Pill live label="UŽIVO" />
          <VibeBadge score={score} />
        </View>
        <View>
          <View style={styles.cardVenue}>
            <VenueAvatar type={type} size={40} live />
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.cardName} numberOfLines={1}>
                {hottest?.name ?? 'Kafić u centru'}
              </Text>
              <Text style={styles.cardMeta}>
                {VENUE_TYPE_LABELS[type]} · {vibe?.last_report_at ? timeAgo(vibe.last_report_at) : 'pre 3 min'}
              </Text>
            </View>
          </View>
          <View style={styles.pills}>
            <Pill icon={Flame} label={VIBE_LABELS[Math.min(4, Math.max(0, Math.round(score) - 1))]} />
            <Pill icon={Users} label={CROWD_LABELS[crowd]} />
          </View>
        </View>
      </LinearGradient>
      <Text style={[styles.headline, styles.headlineSmall]}>
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
  const [big, ...small] = EXAMPLES;
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.headline, styles.headlineSmall, { marginTop: 0 }]}>
        Ovako izgleda <Text style={{ color: Colors.accent }}>uživo</Text>
      </Text>
      <Text style={[styles.body, { marginTop: Spacing.two }]}>Ljudi koji su na licu mesta šalju kratke snimke, do 60 sekundi.</Text>
      <View style={{ flexDirection: 'row', gap, marginTop: Spacing.three }}>
        <ExampleClip example={big} width={bigWidth} height={smallHeight * 2 + gap} active={active} big />
        <View style={{ gap }}>
          {small.map((e) => (
            <ExampleClip key={e.label} example={e} width={smallWidth} height={smallHeight} active={active} />
          ))}
        </View>
      </View>
      <Text style={styles.note}>Ovo su primeri. Pravi snimci iz Pančeva te čekaju unutra.</Text>
    </View>
  );
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
      <Image source={e.poster} style={StyleSheet.absoluteFill} contentFit="cover" />
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

// A soft blurred light, like a stage light in the dark.
function Glow({ color, size = 300, style }: { color: string; size?: number; style: object }) {
  const core = size / 3;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: 0.2 }, style]}>
      <View style={{ width: core, height: core, borderRadius: core, backgroundColor: color, boxShadow: `0 0 ${core * 1.4}px ${core * 0.6}px ${color}` }} />
    </View>
  );
}

const styles = StyleSheet.create({
  // On web the video element keeps its own size unless told to fill the box
  video: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  screen: { flex: 1, backgroundColor: Colors.background, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 520, overflow: 'hidden' },
  slide: { flexGrow: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.four, overflow: 'hidden' },
  stories: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.five },
  story: { width: 60, alignItems: 'center', gap: 4 },
  storyName: { color: Colors.text, fontFamily: Fonts.body, fontSize: 11, maxWidth: 64 },
  headline: { color: Colors.text, fontFamily: Fonts.display, fontSize: 34, lineHeight: 40 },
  headlineSmall: { fontSize: 24, lineHeight: 30, marginTop: Spacing.four },
  body: { color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 16, lineHeight: 23, marginTop: Spacing.three },
  exampleCard: { height: 220, borderRadius: 24, padding: Spacing.three, justifyContent: 'space-between', overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
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
