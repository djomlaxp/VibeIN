import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdminStats } from '@/components/admin-stats';
import { formStyles } from '@/components/form';
import { WelcomeClipsAdmin } from '@/components/welcome-clips-admin';
import { Fonts, Spacing, useColors } from '@/constants/theme';
import { claimLinkUrl, claimMethodInfo, hasSecretCode } from '@/lib/claims';
import { CLAIM_DOCS_BUCKET, supabase } from '@/lib/supabase';
import type { VenueClaim, VenueIssue } from '@/lib/types';
import { errorMessage, timeAgo } from '@/lib/vibe';

// Admin panel: app statistics, and the "Zahtevi" tab to approve requests to
// manage a venue, act on reports that a venue closed or was renamed, and choose
// the clips on the welcome screen.
export default function AdminScreen() {
  const colors = useColors();
  const [claims, setClaims] = useState<VenueClaim[]>([]);
  const [issues, setIssues] = useState<VenueIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Removing a venue deletes its reports too, so it takes a second tap
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [tab, setTab] = useState<'stats' | 'requests'>('stats');

  const load = useCallback(async () => {
    const [{ data: claimRows }, { data: issueRows }] = await Promise.all([
      supabase.rpc('admin_pending_claims'),
      supabase
        .from('venue_issues')
        .select('id, venue_id, kind, new_name, created_at, venue:venues(name)')
        .eq('status', 'open')
        .order('created_at'),
    ]);
    setClaims((claimRows as VenueClaim[] | null) ?? []);
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

  async function openDocument(path: string) {
    const { data, error } = await supabase.storage.from(CLAIM_DOCS_BUCKET).createSignedUrl(path, 600);
    if (error || !data) return setError(errorMessage(error));
    Linking.openURL(data.signedUrl);
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
      <View style={[styles.tabs, { backgroundColor: colors.backgroundElement }]}>
        {(
          [
            ['stats', 'Statistika'],
            ['requests', `Zahtevi${claims.length + issues.length ? ` (${claims.length + issues.length})` : ''}`],
          ] as const
        ).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && { backgroundColor: colors.accent }]}>
            <Text style={[styles.actionText, { color: tab === key ? colors.onAccent : colors.text }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'stats' ? (
        <AdminStats />
      ) : (
        <>
          {error && <Text style={formStyles.error}>{error}</Text>}

          <Text style={[styles.title, text]}>Zahtevi vlasnika</Text>
          {claims.length === 0 && <Text style={formStyles.hint}>Nema zahteva koji čekaju.</Text>}
          {claims.map((item) => (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.name, text]}>{item.venue_name}</Text>
              <Text style={muted}>
                {item.email} · {timeAgo(item.created_at)}
              </Text>
              {item.method && (
                <>
                  <Text style={[styles.method, { color: colors.accent }]}>{claimMethodInfo(item.method)?.label ?? item.method}</Text>
                  {item.venue_link && (
                    <Pressable
                      disabled={!claimLinkUrl(item.method, item.venue_link)}
                      onPress={() => Linking.openURL(claimLinkUrl(item.method, item.venue_link)!)}>
                      <Text style={[text, claimLinkUrl(item.method, item.venue_link) && styles.link]}>{item.venue_link}</Text>
                    </Pressable>
                  )}
                  {claimMethodInfo(item.method) && (
                    <Text style={text}>{claimMethodInfo(item.method)!.check(item.secret_code, item.venue_link)}</Text>
                  )}
                  {(item.secret_code ?? item.code) && <Text style={[styles.code, text]}>Kod: {item.secret_code ?? item.code}</Text>}
                  {hasSecretCode(item.method) && (
                    <Text style={{ color: item.secret_confirmed ? colors.accent : colors.textSecondary }}>
                      {item.secret_confirmed
                        ? 'Vlasnik je upisao tačan kod.'
                        : `Vlasnik još nije upisao kod${item.secret_attempts ? ` (pogrešnih pokušaja: ${item.secret_attempts})` : ''}.`}
                    </Text>
                  )}
                  {item.document_path && (
                    <Pressable onPress={() => openDocument(item.document_path!)}>
                      <Text style={[text, styles.link]}>Otvori dokument</Text>
                    </Pressable>
                  )}
                </>
              )}
              {item.proof && <Text style={text}>Napomena: {item.proof}</Text>}
              <Text style={muted}>
                U aplikaciji za ovo mesto:{' '}
                {[item.venue_contact?.phone, item.venue_contact?.instagram, item.venue_contact?.website].filter(Boolean).join(', ') ||
                  'nema kontakta'}
              </Text>
              <Actions
                yes={item.method === 'express' ? 'Uplata stigla, odobri' : 'Odobri'}
                no="Odbij"
                onYes={() =>
                  run('review_venue_claim', {
                    p_claim_id: item.id,
                    p_approve: true,
                  })
                }
                onNo={() =>
                  run('review_venue_claim', {
                    p_claim_id: item.id,
                    p_approve: false,
                  })
                }
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
                    : run('review_venue_issue', {
                        p_issue_id: item.id,
                        p_accept: true,
                      })
                }
                onNo={() =>
                  run('review_venue_issue', {
                    p_issue_id: item.id,
                    p_accept: false,
                  })
                }
              />
            </View>
          ))}

          <WelcomeClipsAdmin />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.displayBold, fontSize: 18 },
  card: { padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  name: { fontFamily: Fonts.bodyBold, fontSize: 16 },
  method: { fontFamily: Fonts.bodyBold, fontSize: 14 },
  code: { fontFamily: Fonts.bodyBold, fontSize: 18, letterSpacing: 2 },
  link: { textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1, padding: 12, borderRadius: 999, alignItems: 'center' },
  actionText: { fontFamily: Fonts.bodyBold },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 999, gap: 4 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
});
