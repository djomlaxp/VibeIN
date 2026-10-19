import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Video } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { VIBE_ICONS, genreIcon } from '@/components/icons';
import { VideoRecorder, type RecordedVideo } from '@/components/video-recorder';
import { Colors, Fonts, Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { VIDEO_BUCKET, supabase } from '@/lib/supabase';
import { CROWD_LABELS, MAX_GENRE_LENGTH, MUSIC_GENRES, OTHER_GENRE, VIBE_LABELS, errorMessage } from '@/lib/vibe';

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { session } = useAuth();
  const [vibe, setVibe] = useState<number | null>(null);
  const [crowd, setCrowd] = useState<number | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [customGenre, setCustomGenre] = useState('');
  const [video, setVideo] = useState<RecordedVideo | null>(null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!session || vibe == null || crowd == null) return;
    setSending(true);
    setError(null);
    try {
      // Testers may report from anywhere, so their location is optional
      const { data: tester } = await supabase.rpc('is_tester');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' && !tester) {
        setError(
          Platform.OS === 'web'
            ? 'Bez lokacije ne možemo da proverimo da si u objektu. Dozvoli lokaciju: ikonica levo od adrese stranice → Dozvole → Lokacija → Dozvoli, pa probaj ponovo. Proveri i da je lokacija uključena na telefonu.'
            : 'Bez lokacije ne možemo da proverimo da si u objektu.',
        );
        return;
      }
      const coords =
        status === 'granted'
          ? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })).coords
          : { latitude: 0, longitude: 0 };

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
        p_lat: coords.latitude,
        p_lng: coords.longitude,
        p_vibe: vibe,
        p_crowd: crowd,
        p_music_genre: genre === OTHER_GENRE ? customGenre.trim() || null : genre,
        p_comment: null,
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
  const option = (selected: boolean) => [styles.option, { backgroundColor: selected ? colors.accent : colors.backgroundElement }];
  const optionText = (selected: boolean) => ({ color: selected ? colors.onAccent : colors.text });

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.label, text]}>Kakav je vibe?</Text>
      <View style={styles.vibes}>
        {VIBE_ICONS.map((Icon, i) => (
          <Pressable key={VIBE_LABELS[i]} style={[option(vibe === i + 1), styles.vibe]} onPress={() => setVibe(i + 1)}>
            <Icon size={28} color={vibe === i + 1 ? colors.onAccent : colors.text} />
            <Text style={[optionText(vibe === i + 1), styles.vibeName]}>{VIBE_LABELS[i]}</Text>
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

      <Text style={[styles.label, text]}>Muzika</Text>
      <View style={styles.genres}>
        {[...MUSIC_GENRES, OTHER_GENRE].map((name) => {
          const Icon = genreIcon(name);
          return (
            <Pressable key={name} style={[option(genre === name), styles.genre]} onPress={() => setGenre(genre === name ? null : name)}>
              <Icon size={30} color={genre === name ? colors.onAccent : colors.text} />
              <Text style={[optionText(genre === name), styles.genreName]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>
      {genre === OTHER_GENRE && (
        <TextInput
          autoFocus
          value={customGenre}
          onChangeText={setCustomGenre}
          maxLength={MAX_GENRE_LENGTH}
          placeholder="Upiši žanr, npr. Rokenrol, Latino..."
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text, borderColor: colors.accent }]}
        />
      )}

      <Pressable style={[styles.option, { backgroundColor: colors.backgroundElement }]} onPress={() => (video ? setVideo(null) : setRecorderOpen(true))}>
        <View style={styles.inline}>
          <Video size={20} color={colors.text} />
          <Text style={text}>{video ? `Snimak ${video.durationS}s (ukloni)` : 'Snimi atmosferu (do 60 s)'}</Text>
        </View>
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        disabled={vibe == null || crowd == null || sending}
        onPress={submit}
        style={[styles.submit, { backgroundColor: colors.accent, opacity: vibe == null || crowd == null ? 0.4 : 1 }]}>
        {sending ? <ActivityIndicator color={colors.onAccent} /> : <Text style={[styles.submitText, { color: colors.onAccent }]}>Pošalji</Text>}
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
  label: { fontSize: 16, fontFamily: Fonts.displayBold },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vibes: { flexDirection: 'row', gap: 6 },
  vibe: { flex: 1, paddingHorizontal: 2, gap: 4 },
  vibeName: { fontSize: 11, fontFamily: Fonts.bodyBold, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, fontFamily: Fonts.body },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  genre: { width: '31%', paddingHorizontal: 4, gap: 4 },
  genreName: { fontSize: 12, fontFamily: Fonts.bodyBold, textAlign: 'center' },
  error: { color: Colors.danger, fontSize: 15 },
  submit: { padding: Spacing.three, borderRadius: 999, alignItems: 'center' },
  submitText: { fontSize: 17, fontFamily: Fonts.bodyBold },
});
