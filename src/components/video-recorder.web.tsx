import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { SITE_LABEL } from '@/lib/share';
import { MAX_VIDEO_SECONDS } from '@/lib/vibe';

import type { RecordedVideo } from './video-recorder';

export type { RecordedVideo } from './video-recorder';

// The storage bucket accepts MP4 only; current Chrome (Android) and Safari (iOS) record it.
const MIME_TYPES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'];

function supportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  return MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

// The VibeIN mark burned into the corner of every clip, so a clip shared to
// Instagram or forwarded still shows where it came from.
function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, caption?: string) {
  const unit = Math.min(w, h);
  const margin = unit * 0.045;
  const big = Math.round(unit * 0.075);
  const small = Math.round(unit * 0.034);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = unit * 0.02;
  ctx.textBaseline = 'top';
  // Top left, clear of the reply bar Instagram and WhatsApp put at the bottom
  let y = margin;
  ctx.font = `${big}px ${Fonts.display}, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Vibe', margin, y);
  ctx.fillStyle = Colors.accent;
  ctx.fillText('IN', margin + ctx.measureText('Vibe').width, y);
  y += big * 1.25;
  ctx.font = `${small}px ${Fonts.bodyBold}, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  if (caption) {
    ctx.fillText(caption, margin, y);
    y += small * 1.35;
  }
  ctx.fillText(SITE_LABEL, margin, y);
  ctx.restore();
}

// Web version of the recorder: live camera through getUserMedia, recorded with
// MediaRecorder. Like the app, it only records; there is no file picker.
// Frames go through a canvas so the VibeIN mark ends up in the saved clip.
export function VideoRecorder({ onDone, onCancel, caption }: { onDone: (v: RecordedVideo) => void; onCancel: () => void; caption?: string }) {
  const preview = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const frameLoop = useRef<number | null>(null);
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
      if (frameLoop.current != null) cancelAnimationFrame(frameLoop.current);
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

  // Camera frames plus the mark, drawn onto a canvas that is recorded with the microphone
  function watermarkedStream(camera: MediaStream) {
    const video = preview.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!video || !ctx || !video.videoWidth || typeof canvas.captureStream !== 'function') return camera;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const draw = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      drawWatermark(ctx, canvas.width, canvas.height, caption);
      frameLoop.current = requestAnimationFrame(draw);
    };
    draw();
    return new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...camera.getAudioTracks()]);
  }

  function start() {
    if (!stream.current || !mimeType) return;
    const chunks: Blob[] = [];
    const recorded = watermarkedStream(stream.current);
    const r = new MediaRecorder(recorded, { mimeType });
    r.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    r.onstop = () => {
      if (frameLoop.current != null) cancelAnimationFrame(frameLoop.current);
      frameLoop.current = null;
      if (recorded !== stream.current) recorded.getVideoTracks().forEach((t) => t.stop());
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
      {/* Shows where the mark will be in the saved clip */}
      <View style={styles.mark} pointerEvents="none">
        <Text style={styles.markLogo}>
          Vibe<Text style={{ color: Colors.accent }}>IN</Text>
        </Text>
        {!!caption && <Text style={styles.markText}>{caption}</Text>}
        <Text style={styles.markText}>{SITE_LABEL}</Text>
      </View>
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
  mark: { position: 'absolute', left: 16, top: 48 },
  markLogo: { color: '#fff', fontFamily: Fonts.display, fontSize: 24, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 6 },
  markText: { color: '#fff', fontFamily: Fonts.bodyBold, fontSize: 12, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 6 },
  controls: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center', gap: 16 },
  timer: { color: '#fff', fontSize: 16, fontVariant: ['tabular-nums'] },
  record: { width: 72, height: 72, borderRadius: 36, borderWidth: 5, borderColor: '#fff', backgroundColor: '#E5484D' },
  recording: { borderRadius: 12 },
  text: { color: '#fff', fontSize: 16, textAlign: 'center' },
  secondary: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#333' },
});
