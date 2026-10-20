import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Choice, Field, SubmitButton, formStyles } from '@/components/form';
import { Fonts, Spacing, useColors } from '@/constants/theme';
import { APP_EMAIL } from '@/lib/app-info';
import { useAuth } from '@/lib/auth';
import { CLAIM_METHODS, claimMethodInfo, hasSecretCode, type ClaimMethod } from '@/lib/claims';
import { CLAIM_DOCS_BUCKET, supabase } from '@/lib/supabase';
import type { Venue } from '@/lib/types';
import { errorMessage } from '@/lib/vibe';

type PendingClaim = {
  id: string;
  method: string | null;
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

// A person asks to manage a venue and proves it is theirs: a code sent to the
// venue's phone or email, a code they message us from the venue's Instagram or
// Facebook, a document, or express (no proof, paid
// membership). An admin checks it and approves. While the request waits, this
// screen says what happens next and shows or takes the code.
export default function ClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { session } = useAuth();
  const [venue, setVenue] = useState<Pick<Venue, 'name' | 'contact'> | null>(null);
  const [claim, setClaim] = useState<PendingClaim | null | undefined>(undefined);
  const [method, setMethod] = useState<ClaimMethod>('phone');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState('');
  const [codeResult, setCodeResult] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const [{ data: venueRow }, { data }] = await Promise.all([
      supabase.from('venues').select('name, contact').eq('id', id).maybeSingle(),
      supabase
        .from('venue_claims')
        .select('id, method, venue_link, code, secret_confirmed')
        .eq('venue_id', id)
        .eq('user_id', session.user.id)
        .eq('status', 'pending')
        .maybeSingle(),
    ]);
    setVenue(venueRow);
    setClaim((data as PendingClaim | null) ?? null);
  }, [id, session]);

  useEffect(() => {
    load();
  }, [load]);

  // The venue's phone already in the app is used as it is
  const known = method === 'phone' ? venue?.contact?.phone?.trim() || null : null;
  const askLink = ['phone', 'email', 'instagram', 'facebook'].includes(method) && !known;
  const ready = method === 'document' ? !!file : !askLink || link.trim().length >= 3;

  async function upload(body: Blob | ArrayBuffer, ext: string, contentType: string) {
    const path = `${session!.user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(CLAIM_DOCS_BUCKET).upload(path, body, { contentType });
    return uploadError ? null : path;
  }

  async function send() {
    if (!session) return router.replace('/login');
    setBusy(true);
    setError(null);
    let filePath: string | null = null;
    if (method === 'document' && file) {
      filePath = await upload(file, file.name.split('.').pop()?.toLowerCase() || 'jpg', file.type);
      if (!filePath) {
        setBusy(false);
        return setError('Dokument nije poslat, pokušaj ponovo. Slika ili PDF, najviše 10 MB.');
      }
    }
    const { error: rpcError } = await supabase.rpc('create_venue_claim', {
      p_venue_id: id,
      p_method: method,
      p_venue_link: askLink ? link.trim() : null,
      p_note: note.trim() || null,
      p_document_path: filePath,
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
    const m = claimMethodInfo(claim.method);
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={formStyles.content}>
        <Text style={[styles.title, text]}>Zahtev je poslat</Text>
        <Text style={[styles.body, text]}>{m ? m.howTo(claim.venue_link) : 'Proverićemo podatke koje si poslao i javiti ti.'}</Text>
        {claim.code && (
          <View style={[styles.codeBox, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.knownLabel, { color: colors.textSecondary }]}>Tvoj kod</Text>
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
        {error && <Text style={formStyles.error}>{error}</Text>}
        <Text style={formStyles.hint}>
          Kad odobrimo zahtev, na stranici mesta pojaviće ti se dugmad za uređivanje i objave. Pitanja? Piši nam na {APP_EMAIL}.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={formStyles.content}>
      <Text style={formStyles.hint}>
        Kada odobrimo zahtev, moći ćeš da uređuješ opis, radno vreme i kontakt ovog mesta i da objavljuješ promocije i najave.
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
      <Text style={formStyles.hint}>{CLAIM_METHODS[method].hint}</Text>
      {known && (
        <View style={[styles.known, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.knownLabel, { color: colors.textSecondary }]}>Zovemo broj</Text>
          <Text style={[styles.body, text]}>{known}</Text>
        </View>
      )}
      {askLink && (
        <Field
          label={LINK_FIELDS[method]!.label}
          placeholder={LINK_FIELDS[method]!.placeholder}
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          keyboardType={method === 'phone' ? 'phone-pad' : method === 'email' ? 'email-address' : 'default'}
        />
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

// What we ask about the venue for the methods that need it
const LINK_FIELDS: Partial<Record<ClaimMethod, { label: string; placeholder: string }>> = {
  phone: { label: 'Javni broj telefona lokala', placeholder: 'Broj sa Google-a, menija ili ulaza' },
  email: { label: 'Imejl lokala', placeholder: 'info@imelokala.rs' },
  instagram: { label: 'Instagram profil lokala', placeholder: '@imelokala' },
  facebook: { label: 'Facebook stranica lokala', placeholder: 'facebook.com/imelokala' },
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.displayBold, fontSize: 22 },
  body: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 23 },
  known: { padding: Spacing.three, borderRadius: 12, gap: 2 },
  codeBox: { alignItems: 'center', padding: Spacing.four, borderRadius: 16, gap: Spacing.one },
  code: { fontFamily: Fonts.display, fontSize: 40, letterSpacing: 6 },
  knownLabel: { fontFamily: Fonts.bodyBold, fontSize: 13 },
  pick: { padding: Spacing.three, borderRadius: 12, alignItems: 'center' },
  pickText: { fontFamily: Fonts.bodyBold, fontSize: 15 },
});
