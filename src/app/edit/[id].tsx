import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { Field, SubmitButton, formStyles } from '@/components/form';
import { useColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Venue } from '@/lib/types';
import { errorMessage } from '@/lib/vibe';

// The verified owner edits the details guests see on the venue page.
export default function EditVenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const [form, setForm] = useState({ description: '', address: '', hours: '', phone: '', instagram: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('venues')
      .select('description, address, opening_hours, contact')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        const v = data as Pick<Venue, 'description' | 'address' | 'opening_hours' | 'contact'> | null;
        if (!v) return;
        setForm({
          description: v.description ?? '',
          address: v.address ?? '',
          hours: v.opening_hours?.text ?? '',
          phone: v.contact?.phone ?? '',
          instagram: v.contact?.instagram ?? '',
          website: v.contact?.website ?? '',
        });
      });
  }, [id]);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const orNull = (s: string) => s.trim() || null;

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from('venues')
      .update({
        description: orNull(form.description),
        address: orNull(form.address),
        opening_hours: form.hours.trim() ? { text: form.hours.trim() } : null,
        contact: { phone: orNull(form.phone), instagram: orNull(form.instagram), website: orNull(form.website) },
      })
      .eq('id', id);
    setBusy(false);
    if (error) setError(errorMessage(error));
    else router.back();
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={formStyles.content}>
      <Field label="Opis" placeholder="Šta gost treba da zna o mestu" value={form.description} onChangeText={set('description')} multiline />
      <Field label="Adresa" placeholder="Ulica i broj, Pančevo" value={form.address} onChangeText={set('address')} />
      <Field label="Radno vreme" placeholder="npr. Pon–čet 8–24, pet–sub 8–02" value={form.hours} onChangeText={set('hours')} multiline />
      <Field label="Telefon" placeholder="+381 ..." value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Field label="Instagram" placeholder="@imemesta" value={form.instagram} onChangeText={set('instagram')} autoCapitalize="none" />
      <Field label="Sajt ili link za rezervaciju" placeholder="https://..." value={form.website} onChangeText={set('website')} autoCapitalize="none" />
      {error && <Text style={formStyles.error}>{error}</Text>}
      <SubmitButton title="Sačuvaj" onPress={save} busy={busy} />
    </ScrollView>
  );
}
