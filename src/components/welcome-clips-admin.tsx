import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formStyles } from '@/components/form';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { supabase, WELCOME_BUCKET } from '@/lib/supabase';
import type { WelcomeClip } from '@/lib/types';
import { errorMessage } from '@/lib/vibe';

// Where each slot sits on page 3 of the welcome screen, and the label its
// built-in animation uses.
const SLOTS = [
  { slot: 1, place: 'Veliki snimak, levo', label: 'Klub' },
  { slot: 2, place: 'Mali snimak, gore desno', label: 'Kafić' },
  { slot: 3, place: 'Mali snimak, dole desno', label: 'Koncert' },
];

// Opens the browser's file chooser for one video.
function pickVideo(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,video/quicktime,video/webm';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

// Admin: put real clips on the welcome screen in place of the example animations.
export function WelcomeClipsAdmin() {
  const [clips, setClips] = useState<WelcomeClip[]>([]);
  const [labels, setLabels] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('welcome_clips').select('slot, video_path, label');
    setClips(data ?? []);
    setLabels(Object.fromEntries((data ?? []).map((c) => [c.slot, c.label])));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(slot: number, fallbackLabel: string) {
    const file = await pickVideo();
    if (!file) return;
    setBusy(slot);
    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const path = `slot-${slot}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(WELCOME_BUCKET).upload(path, file, { contentType: file.type || 'video/mp4' });
    if (uploadError) {
      setBusy(null);
      return setError(errorMessage(uploadError));
    }
    const old = clips.find((c) => c.slot === slot);
    const { error: saveError } = await supabase
      .from('welcome_clips')
      .upsert({ slot, video_path: path, label: labels[slot]?.trim() || fallbackLabel, updated_at: new Date().toISOString() });
    if (saveError) setError(errorMessage(saveError));
    else if (old) await supabase.storage.from(WELCOME_BUCKET).remove([old.video_path]);
    setBusy(null);
    load();
  }

  async function reset(clip: WelcomeClip) {
    setBusy(clip.slot);
    const { error: deleteError } = await supabase.from('welcome_clips').delete().eq('slot', clip.slot);
    if (deleteError) setError(errorMessage(deleteError));
    else await supabase.storage.from(WELCOME_BUCKET).remove([clip.video_path]);
    setBusy(null);
    load();
  }

  async function saveLabel(slot: number) {
    if (!clips.some((c) => c.slot === slot)) return;
    const { error: saveError } = await supabase.from('welcome_clips').update({ label: labels[slot]?.trim() ?? '' }).eq('slot', slot);
    if (saveError) setError(errorMessage(saveError));
  }

  return (
    <View style={{ gap: Spacing.three }}>
      <Text style={styles.title}>Snimci na početnom ekranu</Text>
      <Text style={formStyles.hint}>
        Ovi snimci se vide na trećoj strani pre prijave. Dok ne postaviš svoj, tu je animacija. Najbolje radi uspravan MP4 snimak, do 50 MB.
      </Text>
      {Platform.OS !== 'web' && <Text style={formStyles.hint}>Snimke za sada postavljaš sa sajta, u pregledaču.</Text>}
      {error && <Text style={formStyles.error}>{error}</Text>}
      {SLOTS.map(({ slot, place, label }) => {
        const clip = clips.find((c) => c.slot === slot);
        return (
          <View key={slot} style={styles.card}>
            <Text style={styles.name}>{place}</Text>
            <Text style={styles.state}>{clip ? 'Tvoj snimak' : 'Animacija'}</Text>
            <TextInput
              style={styles.input}
              placeholder={`Natpis, na primer ${label}`}
              placeholderTextColor={Colors.textSecondary}
              value={labels[slot] ?? ''}
              onChangeText={(text) => setLabels((l) => ({ ...l, [slot]: text }))}
              onBlur={() => saveLabel(slot)}
            />
            {busy === slot ? (
              <ActivityIndicator color={Colors.accent} />
            ) : (
              Platform.OS === 'web' && (
                <View style={styles.actions}>
                  <Pressable onPress={() => upload(slot, label)} style={[styles.action, { backgroundColor: Colors.accent }]}>
                    <Text style={[styles.actionText, { color: Colors.onAccent }]}>{clip ? 'Zameni snimak' : 'Postavi snimak'}</Text>
                  </Pressable>
                  {clip && (
                    <Pressable onPress={() => reset(clip)} style={[styles.action, { backgroundColor: Colors.backgroundSelected }]}>
                      <Text style={styles.actionText}>Vrati animaciju</Text>
                    </Pressable>
                  )}
                </View>
              )
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: Colors.text, fontFamily: Fonts.displayBold, fontSize: 18 },
  card: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two, backgroundColor: Colors.backgroundElement },
  name: { color: Colors.text, fontFamily: Fonts.bodyBold, fontSize: 16 },
  state: { color: Colors.textSecondary, fontFamily: Fonts.body },
  input: { color: Colors.text, backgroundColor: Colors.backgroundSelected, padding: 12, borderRadius: 12, fontSize: 15 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1, padding: 12, borderRadius: 999, alignItems: 'center' },
  actionText: { color: Colors.text, fontFamily: Fonts.bodyBold },
});
