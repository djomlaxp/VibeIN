import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MAX_VIDEO_SECONDS } from '@/lib/vibe';

import type { RecordedVideo } from './video-recorder';

export type { RecordedVideo } from './video-recorder';

// The storage bucket accepts MP4 only; current Chrome (Android) and Safari (iOS) record it.
const MIME_TYPES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'];

function supportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  return MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

// Web version of the recorder: live camera through getUserMedia, recorded with
// MediaRecorder. Like the app, it only records; there is no file picker.
export function VideoRecorder({ onDone, onCancel }: { onDone: (v: RecordedVideo) => void; onCancel: () => void }) {
  const preview = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);
  const [mimeType] = useState(supportedMimeType);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mimeType) return;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (preview.current) preview.current.srcObject = s;
        setReady(true);
      })
      .catch(() => setError('Pregledač nije dozvolio kameru i mikrofon. Dozvoli ih u podešavanjima stranice, pa probaj ponovo.'));
    return () => {
      cancelled = true;
      recorder.current?.state === 'recording' && recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [mimeType]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(s);
      if (s >= MAX_VIDEO_SECONDS) recorder.current?.stop();
    }, 250);
    return () => clearInterval(t);
  }, [recording]);

  function start() {
    if (!stream.current || !mimeType) return;
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream.current, { mimeType });
    r.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    r.onstop = () => {
      setRecording(false);
      const durationS = Math.min(MAX_VIDEO_SECONDS, Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
      const blob = new Blob(chunks, { type: 'video/mp4' });
      if (blob.size > 0) onDone({ uri: URL.createObjectURL(blob), durationS });
    };
    recorder.current = r;
    startedAt.current = Date.now();
    setElapsed(0);
    r.start(1000);
    setRecording(true);
  }

  const message = !mimeType
    ? 'Ovaj pregledač ne može da snima video. Otvori aplikaciju u Chrome-u (Android) ili Safariju (iPhone).'
    : error;

  if (message) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{message}</Text>
        <Pressable style={styles.secondary} onPress={onCancel}>
          <Text style={styles.text}>Nazad</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <video ref={preview} autoPlay muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <View style={styles.controls}>
        <Text style={styles.timer}>{elapsed}s / {MAX_VIDEO_SECONDS}s</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Zaustavi snimanje' : 'Počni snimanje'}
          disabled={!ready}
          onPress={() => (recording ? recorder.current?.stop() : start())}
          style={[styles.record, recording && styles.recording, !ready && { opacity: 0.4 }]}
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
