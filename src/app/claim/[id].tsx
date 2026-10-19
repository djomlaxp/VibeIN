import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { Field, SubmitButton, formStyles } from '@/components/form';
import { useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/vibe';

// A person asks to manage a venue; an admin checks the details and approves.
export default function ClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { session } = useAuth();
  const [proof, setProof] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!session) return router.replace('/login');
    setBusy(true);
    const { error } = await supabase.from('venue_claims').insert({ venue_id: id, user_id: session.user.id, proof: proof.trim() });
    setBusy(false);
    if (error) setError(errorMessage(error));
    else router.back();
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={formStyles.content}>
      <Text style={formStyles.hint}>
        Kada odobrimo zahtev, moći ćeš da uređuješ opis, radno vreme i kontakt ovog mesta i da objavljuješ promocije i najave. Sve je besplatno.
      </Text>
      <Field
        label="Kako da proverimo da je mesto tvoje?"
        placeholder="Tvoje ime, broj telefona mesta, Instagram profil ili ime firme"
        value={proof}
        onChangeText={setProof}
        multiline
      />
      {error && <Text style={formStyles.error}>{error}</Text>}
      <SubmitButton title="Pošalji zahtev" onPress={send} busy={busy} disabled={proof.trim().length < 5} />
    </ScrollView>
  );
}
