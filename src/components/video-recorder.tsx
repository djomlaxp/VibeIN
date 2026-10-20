import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MAX_VIDEO_SECONDS } from '@/lib/vibe';

export type RecordedVideo = { uri: string; durationS: number };

// Records straight from the camera; there is deliberately no gallery picker.
// caption: venue name; the web recorder burns it into the clip with the VibeIN mark
export function VideoRecorder({ onDone, onCancel }: { onDone: (v: RecordedVideo) => void; onCancel: () => void; caption?: string }) {
  const camera = useRef<CameraView>(null);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
    return () => clearInterval(t);
  }, [recording]);

  if (!camPerm || !micPerm) return null;
  if (!camPerm.granted || !micPerm.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>VibeIN treba kameru i mikrofon da snimiš atmosferu.</Text>
        <Pressable style={styles.secondary} onPress={async () => { await requestCam(); await requestMic(); }}>
          <Text style={styles.text}>Dozvoli pristup</Text>
        </Pressable>
        <Pressable onPress={onCancel}><Text style={styles.text}>Odustani</Text></Pressable>
      </View>
    );
  }

  async function start() {
    if (!camera.current) return;
    setRecording(true);
    setElapsed(0);
    startedAt.current = Date.now();
    const result = await camera.current.recordAsync({ maxDuration: MAX_VIDEO_SECONDS });
    const durationS = Math.min(MAX_VIDEO_SECONDS, Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
    setRecording(false);
    if (result?.uri) onDone({ uri: result.uri, durationS });
  }

  return (
    <View style={styles.container}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} mode="video" videoQuality="720p" onCameraReady={() => setReady(true)} />
      <View style={styles.controls}>
        <Text style={styles.timer}>{elapsed}s / {MAX_VIDEO_SECONDS}s</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Zaustavi snimanje' : 'Počni snimanje'}
          disabled={!ready}
          onPress={() => (recording ? camera.current?.stopRecording() : start())}
          style={[styles.record, recording && styles.recording]}
        />
        {!recording && <Pressable onPress={onCancel}><Text style={styles.text}>Odustani</Text></Pressable>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: '#000' },
  controls: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center', gap: 16 },
  timer: { color: '#fff', fontSize: 16, fontVariant: ['tabular-nums'] },
  record: { width: 72, height: 72, borderRadius: 36, borderWidth: 5, borderColor: '#fff', backgroundColor: '#E5484D' },
  recording: { borderRadius: 12 },
  text: { color: '#fff', fontSize: 16, textAlign: 'center' },
  secondary: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#333' },
});
