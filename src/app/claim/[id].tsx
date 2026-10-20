import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Choice, Field, SubmitButton, formStyles } from '@/components/form';
import { Fonts, Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { CLAIM_METHODS, hasSecretCode, type ClaimMethod } from '@/lib/claims';
import { CLAIM_DOCS_BUCKET, supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/vibe';

type PendingClaim = {
  id: string;
  method: ClaimMethod | null;
  venue_link: string | null;
  code: string | null;
  secret_confirmed: boolean;
};

// Opens the browser's file chooser for one image or PDF.
function pickDocument(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/heic,image/webp,application/pdf';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

// A person asks to manage a venue and proves it is theirs in one of several
// ways; an admin checks the proof and approves. While the request waits, this
// screen shows the code and what to do with it.
export default function ClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { session } = useAuth();
  const [claim, setClaim] = useState<PendingClaim | null | undefined>(undefined);
  const [method, setMethod] = useState<ClaimMethod>('instagram');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState('');
  const [codeResult, setCodeResult] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('venue_claims')
      .select('id, method, venue_link, code, secret_confirmed')
      .eq('venue_id', id)
      .eq('user_id', session.user.id)
      .eq('status', 'pending')
      .maybeSingle();
    setClaim((data as PendingClaim | null) ?? null);
  }, [id, session]);

  useEffect(() => {
    load();
  }, [load]);

  const info = CLAIM_METHODS[method];
  const ready = method === 'document' ? !!file : !info.link || link.trim().length >= 3;

  async function send() {
    if (!session) return router.replace('/login');
    setBusy(true);
    setError(null);
    let documentPath: string | null = null;
    if (method === 'document' && file) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      documentPath = `${session.user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(CLAIM_DOCS_BUCKET).upload(documentPath, file, { contentType: file.type });
      if (uploadError) {
        setBusy(false);
        return setError('Dokument nije poslat, pokušaj ponovo. Najviše 10 MB, slika ili PDF.');
      }
    }
    const { error: rpcError } = await supabase.rpc('create_venue_claim', {
      p_venue_id: id,
      p_method: method,
      p_venue_link: info.link ? link.trim() : null,
      p_note: note.trim() || null,
      p_document_path: documentPath,
    });
    setBusy(false);
    if (rpcError) return setError(errorMessage(rpcError));
    load();
  }

  async function confirm() {
    if (!claim) return;
    setBusy(true);
    const { data, error: rpcError } = await supabase.rpc('confirm_claim_code', { p_claim_id: claim.id, p_code: code });
    setBusy(false);
    setError(rpcError ? errorMessage(rpcError) : null);
    if (!rpcError) {
      setCodeResult(!!data);
      if (data) load();
    }
  }

  const text = { color: colors.text };

  if (claim === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (claim) {
    const m = claim.method ? CLAIM_METHODS[claim.method] : null;
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={formStyles.content}>
        <Text style={[styles.title, text]}>Zahtev je poslat</Text>
        {m ? (
          <>
            <Text style={[styles.body, text]}>{m.howTo(claim.code, claim.venue_link)}</Text>
            {claim.code && (
              <View style={[styles.codeBox, { backgroundColor: colors.backgroundElement }]}>
                <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Tvoj kod</Text>
                <Text style={[styles.code, { color: colors.accent }]} selectable>
                  {claim.code}
                </Text>
              </View>
            )}
            {hasSecretCode(claim.method) &&
              (claim.secret_confirmed ? (
                <Text style={[styles.body, { color: colors.accent }]}>Kod je tačan. Odobrićemo zahtev uskoro.</Text>
              ) : (
                <>
                  <Field
                    label="Kod koji si dobio"
                    placeholder="6 cifara"
                    value={code}
                    onChangeText={(v) => {
                      setCode(v.replace(/\D/g, '').slice(0, 6));
                      setCodeResult(null);
                    }}
                    keyboardType="number-pad"
                  />
                  {codeResult === false && <Text style={formStyles.error}>Kod nije tačan, proveri i pokušaj ponovo.</Text>}
                  <SubmitButton title="Potvrdi kod" onPress={confirm} busy={busy} disabled={code.length !== 6} />
                </>
              ))}
          </>
        ) : (
          <Text style={[styles.body, text]}>Proverićemo podatke koje si poslao i javiti ti.</Text>
        )}
        {error && <Text style={formStyles.error}>{error}</Text>}
        <Text style={formStyles.hint}>Kad odobrimo zahtev, na stranici mesta pojaviće ti se dugmad za uređivanje i objave.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={formStyles.content}>
      <Text style={formStyles.hint}>
        Kada odobrimo zahtev, moći ćeš da uređuješ opis, radno vreme i kontakt ovog mesta i da objavljuješ promocije i najave. Sve je
        besplatno.
      </Text>
      <Choice
        label="Kako ćeš dokazati da je mesto tvoje?"
        options={Object.entries(CLAIM_METHODS).map(([key, m]) => [key as ClaimMethod, m.label])}
        value={method}
        onChange={(m) => {
          setMethod(m);
          setLink('');
          setError(null);
        }}
      />
      <Text style={formStyles.hint}>{METHOD_HINTS[method]}</Text>
      {info.link && (
        <Field label={info.link.label} placeholder={info.link.placeholder} value={link} onChangeText={setLink} autoCapitalize="none" />
      )}
      {method === 'document' &&
        (Platform.OS === 'web' ? (
          <Pressable
            onPress={async () => setFile(await pickDocument())}
            style={[styles.pick, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.pickText, text]} numberOfLines={1}>
              {file ? file.name : 'Izaberi sliku ili PDF'}
            </Text>
          </Pressable>
        ) : (
          <Text style={formStyles.hint}>Dokument za sada šalješ sa sajta, u pregledaču.</Text>
        ))}
      <Field
        label="Napomena (nije obavezno)"
        placeholder="Tvoje ime i uloga u lokalu, kad te najlakše dobijemo"
        value={note}
        onChangeText={setNote}
        multiline
      />
      {error && <Text style={formStyles.error}>{error}</Text>}
      <SubmitButton title="Pošalji zahtev" onPress={send} busy={busy} disabled={!ready} />
    </ScrollView>
  );
}

// What each way of proving involves, shown before sending
const METHOD_HINTS: Record<ClaimMethod, string> = {
  instagram: 'Dobićeš kod koji staviš u opis ili story Instagram profila lokala. Samo vlasnik profila to može.',
  facebook: 'Dobićeš kod koji objaviš na Facebook stranici lokala. Samo onaj ko upravlja stranicom to može.',
  website: 'Dobićeš kod koji staviš na sajt lokala.',
  phone: 'Pozvaćemo javni broj lokala i reći kod. Ti ga posle upišeš ovde.',
  email: 'Poslaćemo kod na zvanični imejl lokala. Ti ga posle upišeš ovde.',
  document:
    'Pošalji sliku ili PDF rešenja iz APR-a, ugovora o zakupu ili računa za struju na ime lokala ili firme. Dokument vidi samo administrator.',
  visit: 'Doći ćemo u lokal, a ti nam pokažeš kod iz aplikacije. Najsporiji način.',
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.displayBold, fontSize: 22 },
  body: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 23 },
  codeBox: { alignItems: 'center', padding: Spacing.four, borderRadius: 16, gap: Spacing.one },
  codeLabel: { fontFamily: Fonts.bodyBold, fontSize: 13 },
  code: { fontFamily: Fonts.display, fontSize: 40, letterSpacing: 6 },
  pick: { padding: Spacing.three, borderRadius: 12, alignItems: 'center' },
  pickText: { fontFamily: Fonts.bodyBold, fontSize: 15 },
});
