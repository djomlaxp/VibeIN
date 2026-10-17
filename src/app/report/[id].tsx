import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { VideoRecorder, type RecordedVideo } from '@/components/video-recorder';
import { Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { VIDEO_BUCKET, supabase } from '@/lib/supabase';
import { CROWD_LABELS, VIBE_EMOJI, errorMessage } from '@/lib/vibe';

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { session } = useAuth();
  const [vibe, setVibe] = useState<number | null>(null);
  const [crowd, setCrowd] = useState<number | null>(null);
  const [genre, setGenre] = useState('');
  const [comment, setComment] = useState('');
  const [video, setVideo] = useState<RecordedVideo | null>(null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!session || vibe == null || crowd == null) return;
    setSending(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Bez lokacije ne možemo da proverimo da si u objektu.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      let videoPath: string | null = null;
      if (video) {
        videoPath = `${session.user.id}/${Date.now()}.mp4`;
        const body = await (await fetch(video.uri)).arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from(VIDEO_BUCKET)
          .upload(videoPath, body, { contentType: 'video/mp4' });
        if (uploadError) {
          setError('Snimak nije poslat, pokušaj ponovo.');
          return;
        }
      }

      const { error: rpcError } = await supabase.rpc('submit_vibe_report', {
        p_venue_id: id,
        p_lat: pos.coords.latitude,
        p_lng: pos.coords.longitude,
        p_vibe: vibe,
        p_crowd: crowd,
        p_music_genre: genre.trim() || null,
        p_comment: comment.trim() || null,
        p_video_path: videoPath,
        p_video_duration_s: video?.durationS ?? null,
      });
      if (rpcError) {
        if (videoPath) await supabase.storage.from(VIDEO_BUCKET).remove([videoPath]);
        setError(errorMessage(rpcError));
        return;
      }
      router.back();
    } finally {
      setSending(false);
    }
  }

  const text = { color: colors.text };
  const option = (selected: boolean) => [styles.option, { backgroundColor: selected ? colors.text : colors.backgroundElement }];
  const optionText = (selected: boolean) => ({ color: selected ? colors.background : colors.text });

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.label, text]}>Kakav je vibe?</Text>
      <View style={styles.options}>
        {VIBE_EMOJI.map((e, i) => (
          <Pressable key={e} style={option(vibe === i + 1)} onPress={() => setVibe(i + 1)}>
            <Text style={styles.emoji}>{e}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, text]}>Gužva</Text>
      <View style={styles.options}>
        {CROWD_LABELS.map((c, i) => (
          <Pressable key={c} style={option(crowd === i)} onPress={() => setCrowd(i)}>
            <Text style={optionText(crowd === i)}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        placeholder="Muzika (npr. house, narodna, rok)"
        placeholderTextColor={colors.textSecondary}
        value={genre}
        onChangeText={setGenre}
        style={[styles.input, text, { backgroundColor: colors.backgroundElement }]}
      />
      <TextInput
        placeholder="Komentar (opciono)"
        placeholderTextColor={colors.textSecondary}
        value={comment}
        onChangeText={setComment}
        maxLength={280}
        multiline
        style={[styles.input, text, { backgroundColor: colors.backgroundElement, minHeight: 80 }]}
      />

      <Pressable style={[styles.option, { backgroundColor: colors.backgroundElement }]} onPress={() => (video ? setVideo(null) : setRecorderOpen(true))}>
        <Text style={text}>{video ? `🎥 Snimak ${video.durationS}s (ukloni)` : '🎥 Snimi atmosferu (do 60 s)'}</Text>
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        disabled={vibe == null || crowd == null || sending}
        onPress={submit}
        style={[styles.submit, { backgroundColor: colors.text, opacity: vibe == null || crowd == null ? 0.4 : 1 }]}>
        {sending ? <ActivityIndicator color={colors.background} /> : <Text style={[styles.submitText, { color: colors.background }]}>Pošalji</Text>}
      </Pressable>

      <Modal visible={recorderOpen} animationType="slide" onRequestClose={() => setRecorderOpen(false)}>
        <VideoRecorder
          onCancel={() => setRecorderOpen(false)}
          onDone={(v) => {
            setVideo(v);
            setRecorderOpen(false);
          }}
        />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, maxWidth: 600, width: '100%', alignSelf: 'center' },
  label: { fontSize: 18, fontWeight: '600' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  emoji: { fontSize: 26 },
  input: { padding: Spacing.three, borderRadius: 12, fontSize: 16 },
  error: { color: '#E5484D', fontSize: 15 },
  submit: { padding: Spacing.three, borderRadius: 12, alignItems: 'center' },
  submitText: { fontSize: 17, fontWeight: '600' },
});
