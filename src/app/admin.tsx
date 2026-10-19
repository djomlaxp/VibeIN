import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formStyles } from '@/components/form';
import { Fonts, Spacing, useColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { VenueClaim, VenueIssue } from '@/lib/types';
import { errorMessage, timeAgo } from '@/lib/vibe';

// Admin: approve requests to manage a venue, and act on reports that a venue closed or was renamed.
export default function AdminScreen() {
  const colors = useColors();
  const [claims, setClaims] = useState<VenueClaim[]>([]);
  const [issues, setIssues] = useState<VenueIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Removing a venue deletes its reports too, so it takes a second tap
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: claimRows }, { data: issueRows }] = await Promise.all([
      supabase
        .from('venue_claims')
        .select('id, venue_id, user_id, proof, status, created_at, venue:venues(name)')
        .eq('status', 'pending')
        .order('created_at'),
      supabase
        .from('venue_issues')
        .select('id, venue_id, kind, new_name, created_at, venue:venues(name)')
        .eq('status', 'open')
        .order('created_at'),
    ]);
    setClaims((claimRows as unknown as VenueClaim[]) ?? []);
    setIssues((issueRows as unknown as VenueIssue[]) ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function run(rpc: 'review_venue_claim' | 'review_venue_issue', args: Record<string, unknown>) {
    const { error } = await supabase.rpc(rpc, args);
    setError(error ? errorMessage(error) : null);
    load();
  }

  const text = { color: colors.text };
  const muted = { color: colors.textSecondary };

  function Actions({ yes, no, onYes, onNo }: { yes: string; no: string; onYes: () => void; onNo: () => void }) {
    return (
      <View style={styles.actions}>
        <Pressable onPress={onYes} style={[styles.action, { backgroundColor: colors.accent }]}>
          <Text style={[styles.actionText, { color: colors.onAccent }]}>{yes}</Text>
        </Pressable>
        <Pressable onPress={onNo} style={[styles.action, { backgroundColor: colors.backgroundSelected }]}>
          <Text style={[styles.actionText, text]}>{no}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={formStyles.content}>
      {error && <Text style={formStyles.error}>{error}</Text>}

      <Text style={[styles.title, text]}>Zahtevi vlasnika</Text>
      {claims.length === 0 && <Text style={formStyles.hint}>Nema zahteva koji čekaju.</Text>}
      {claims.map((item) => (
        <View key={item.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.name, text]}>{item.venue?.name}</Text>
          <Text style={text}>{item.proof}</Text>
          <Text style={muted}>{timeAgo(item.created_at)}</Text>
          <Actions
            yes="Odobri"
            no="Odbij"
            onYes={() => run('review_venue_claim', { p_claim_id: item.id, p_approve: true })}
            onNo={() => run('review_venue_claim', { p_claim_id: item.id, p_approve: false })}
          />
        </View>
      ))}

      <Text style={[styles.title, text]}>Prijave promena</Text>
      {issues.length === 0 && <Text style={formStyles.hint}>Nema prijava koje čekaju.</Text>}
      {issues.map((item) => (
        <View key={item.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.name, text]}>{item.venue?.name}</Text>
          <Text style={text}>{item.kind === 'closed' ? 'Javljeno: mesto više ne radi' : `Novo ime: ${item.new_name}`}</Text>
          <Text style={muted}>{timeAgo(item.created_at)}</Text>
          <Actions
            yes={item.kind === 'renamed' ? 'Promeni ime' : confirmRemove === item.id ? 'Sigurno? Ukloni' : 'Ukloni mesto'}
            no="Odbaci"
            onYes={() =>
              item.kind === 'closed' && confirmRemove !== item.id
                ? setConfirmRemove(item.id)
                : run('review_venue_issue', { p_issue_id: item.id, p_accept: true })
            }
            onNo={() => run('review_venue_issue', { p_issue_id: item.id, p_accept: false })}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.displayBold, fontSize: 18 },
  card: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  name: { fontFamily: Fonts.bodyBold, fontSize: 16 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1, padding: 12, borderRadius: 999, alignItems: 'center' },
  actionText: { fontFamily: Fonts.bodyBold },
});
