import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet } from 'react-native';

import { videoUrl } from '@/lib/supabase';

// A guest's clip playing by itself in a silent loop, with no controls to tap.
export function VideoClip({ path }: { path: string }) {
  const player = useVideoPlayer(videoUrl(path), (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} playsInline surfaceType="textureView" />;
}

const styles = StyleSheet.create({
  video: { width: '100%', aspectRatio: 9 / 16, maxHeight: 420, borderRadius: 12, backgroundColor: '#000' },
});
