import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { Choice, Field, SubmitButton, formStyles } from '@/components/form';
import { useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/lib/types';
import { POST_TYPE_LABELS, errorMessage } from '@/lib/vibe';

const DURATIONS: ['1' | '7' | '30' | 'none', string][] = [
  ['1', 'Danas'],
  ['7', '7 dana'],
  ['30', '30 dana'],
  ['none', 'Bez roka'],
];

// The verified owner posts a promotion, an event announcement or a notice.
export default function NewPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { session } = useAuth();
  const [type, setType] = useState<Post['type']>('promo');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [days, setDays] = useState<(typeof DURATIONS)[number][0]>('7');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (!session) return;
    let validTo: string | null = null;
    if (days === '1') validTo = new Date(new Date().setHours(23, 59, 59, 0) + 6 * 60 * 60 * 1000).toISOString();
    else if (days !== 'none') validTo = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000).toISOString();
    setBusy(true);
    const { error } = await supabase
      .from('posts')
      .insert({ venue_id: id, author_id: session.user.id, type, title: title.trim(), body: body.trim() || null, valid_to: validTo });
    setBusy(false);
    if (error) setError(errorMessage(error));
    else router.back();
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={formStyles.content}>
      <Choice label="Vrsta" options={Object.entries(POST_TYPE_LABELS) as [Post['type'], string][]} value={type} onChange={setType} />
      <Field label="Naslov" placeholder="npr. Petak: 2 za 1 do ponoći" value={title} onChangeText={setTitle} maxLength={80} />
      <Field label="Detalji (nije obavezno)" placeholder="Ko svira, cene, rezervacije..." value={body} onChangeText={setBody} multiline />
      <Choice label="Koliko dugo da se prikazuje" options={DURATIONS} value={days} onChange={setDays} />
      {days === '1' && <Text style={formStyles.hint}>Prikazuje se do 6 ujutru sledećeg dana.</Text>}
      {error && <Text style={formStyles.error}>{error}</Text>}
      <SubmitButton title="Objavi" onPress={publish} busy={busy} disabled={title.trim().length < 3} />
    </ScrollView>
  );
}
