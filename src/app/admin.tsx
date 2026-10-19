import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { formStyles } from '@/components/form';
import { Fonts, Spacing, useColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { VenueClaim } from '@/lib/types';
import { errorMessage, timeAgo } from '@/lib/vibe';

// Admin: approve or reject requests to manage a venue.
export default function AdminScreen() {
  const colors = useColors();
  const [claims, setClaims] = useState<VenueClaim[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('venue_claims')
      .select('id, venue_id, user_id, proof, status, created_at, venue:venues(name)')
      .eq('status', 'pending')
      .order('created_at');
    setClaims((data as unknown as VenueClaim[]) ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function review(claim: VenueClaim, approve: boolean) {
    const { error } = await supabase.rpc('review_venue_claim', { p_claim_id: claim.id, p_approve: approve });
    setError(error ? errorMessage(error) : null);
    load();
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={formStyles.content}
      data={claims}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={
        <View style={{ gap: Spacing.two }}>
          <Text style={[styles.title, { color: colors.text }]}>Zahtevi vlasnika</Text>
          {error && <Text style={formStyles.error}>{error}</Text>}
        </View>
      }
      ListEmptyComponent={<Text style={formStyles.hint}>Nema zahteva koji čekaju.</Text>}
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.name, { color: colors.text }]}>{item.venue?.name}</Text>
          <Text style={{ color: colors.text }}>{item.proof}</Text>
          <Text style={{ color: colors.textSecondary }}>{timeAgo(item.created_at)}</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => review(item, true)} style={[styles.action, { backgroundColor: colors.accent }]}>
              <Text style={[styles.actionText, { color: colors.onAccent }]}>Odobri</Text>
            </Pressable>
            <Pressable onPress={() => review(item, false)} style={[styles.action, { backgroundColor: colors.backgroundSelected }]}>
              <Text style={[styles.actionText, { color: colors.text }]}>Odbij</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
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
