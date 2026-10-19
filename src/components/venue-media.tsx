import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { VENUE_ICONS } from '@/components/venue-avatar';
import { Colors } from '@/constants/theme';
import { videoUrl } from '@/lib/supabase';
import type { VenueType } from '@/lib/types';

// The big picture of a venue in the feed and the live view: a guest's latest
// clip playing silently, or a dark glow with the venue's icon when there is none.
export function VenueMedia({
  type,
  videoPath,
  playing = true,
  style,
  children,
}: {
  type: VenueType;
  videoPath?: string | null;
  playing?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.box, style]}>
      {videoPath ? <Clip path={videoPath} playing={playing} /> : <Glow type={type} />}
      {/* Darkens the bottom so text on top stays readable */}
      <LinearGradient colors={['transparent', 'rgba(12,18,16,0.85)']} locations={[0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {children}
    </View>
  );
}

function Clip({ path, playing }: { path: string; playing: boolean }) {
  const player = useVideoPlayer(videoUrl(path), (p) => {
    p.loop = true;
    p.muted = true;
  });
  // Only the clip on screen plays
  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [player, playing]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

function Glow({ type }: { type: VenueType }) {
  const Icon = VENUE_ICONS[type];
  return (
    <LinearGradient colors={[Colors.backgroundSelected, Colors.background]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[StyleSheet.absoluteFill, styles.center]}>
      <View style={styles.halo} />
      <Icon size={96} color={Colors.accent} strokeWidth={1.2} style={{ opacity: 0.5 }} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: Colors.accent, opacity: 0.08, boxShadow: `0 0 120px 60px ${Colors.accent}22` },
});
