import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { Choice, Field, SubmitButton, formStyles } from '@/components/form';
import { useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/vibe';

type Kind = 'closed' | 'renamed';

// A user tells us a venue has closed or changed its name; an admin checks it.
export default function IssueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { session } = useAuth();
  const [kind, setKind] = useState<Kind>('closed');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!session) return router.replace('/login');
    setBusy(true);
    const { error } = await supabase.from('venue_issues').insert({
      venue_id: id,
      user_id: session.user.id,
      kind,
      new_name: kind === 'renamed' ? newName.trim() : null,
    });
    setBusy(false);
    if (error) setError(errorMessage(error));
    else router.back();
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={formStyles.content}>
      <Choice<Kind>
        label="Šta se promenilo?"
        options={[
          ['closed', 'Mesto više ne radi'],
          ['renamed', 'Promenilo je ime'],
        ]}
        value={kind}
        onChange={setKind}
      />
      {kind === 'renamed' && <Field label="Novo ime" placeholder="Kako se mesto sada zove?" value={newName} onChangeText={setNewName} maxLength={60} />}
      <Text style={formStyles.hint}>Proverićemo i ispraviti spisak. Hvala što pomažeš!</Text>
      {error && <Text style={formStyles.error}>{error}</Text>}
      <SubmitButton title="Pošalji" onPress={send} busy={busy} disabled={kind === 'renamed' && newName.trim().length < 2} />
    </ScrollView>
  );
}
