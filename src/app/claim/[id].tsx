import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Choice, Field, SubmitButton, formStyles } from '@/components/form';
import { VideoRecorder, type RecordedVideo } from '@/components/video-recorder';
import { Fonts, Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { CLAIM_METHODS, claimMethodInfo, hasSecretCode, type ClaimMethod } from '@/lib/claims';
import { CLAIM_DOCS_BUCKET, supabase } from '@/lib/supabase';
import type { Venue } from '@/lib/types';
import { errorMessage } from '@/lib/vibe';

type PendingClaim = {
  id: string;
  method: string | null;
  venue_link: string | null;
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

// A person asks to manage a venue and proves it is theirs the way the big
// services do: a code sent to the venue's phone, email or address, a video
// filmed on the spot, or a document. An admin checks it and approves. While
// the request waits, this screen says what happens next and takes the code.
export default function ClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { session } = useAuth();
  const [venue, setVenue] = useState<Pick<Venue, 'name' | 'address' | 'contact'> | null>(null);
  const [claim, setClaim] = useState<PendingClaim | null | undefined>(undefined);
  const [method, setMethod] = useState<ClaimMethod>('phone');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [video, setVideo] = useState<RecordedVideo | null>(null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [code, setCode] = useState('');
  const [codeResult, setCodeResult] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const [{ data: venueRow }, { data }] = await Promise.all([
      supabase.from('venues').select('name, address, contact').eq('id', id).maybeSingle(),
      supabase
        .from('venue_claims')
        .select('id, method, venue_link, secret_confirmed')
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

  // The venue's phone and address already in the app are used as they are
  const knownPhone = venue?.contact?.phone?.trim() || null;
  const knownAddress = venue?.address?.trim() || null;
  const known = method === 'phone' ? knownPhone : method === 'postcard' ? knownAddress : null;
  const askLink = (method === 'phone' || method === 'email' || method === 'postcard') && !known;
  const ready = method === 'document' ? !!file : method === 'video' ? !!video : !askLink || link.trim().length >= 3;

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
        return setError('Dokument nije poslat, pokušaj ponovo. Slika ili PDF, najviše 50 MB.');
      }
    }
    if (method === 'video' && video) {
      filePath = await upload(await (await fetch(video.uri)).arrayBuffer(), 'mp4', 'video/mp4');
      if (!filePath) {
        setBusy(false);
        return setError('Video nije poslat, pokušaj ponovo.');
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
      <Text style={formStyles.hint}>{CLAIM_METHODS[method].hint}</Text>
      {known && (
        <View style={[styles.known, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.knownLabel, { color: colors.textSecondary }]}>
            {method === 'phone' ? 'Zovemo broj' : 'Šaljemo na adresu'}
          </Text>
          <Text style={[styles.body, text]}>{known}</Text>
        </View>
      )}
      {askLink && (
        <Field
          label={method === 'phone' ? 'Javni broj telefona lokala' : method === 'email' ? 'Imejl lokala' : 'Adresa lokala'}
          placeholder={
            method === 'phone' ? 'Broj sa Google-a, menija ili ulaza' : method === 'email' ? 'info@imelokala.rs' : 'Ulica i broj, grad'
          }
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          keyboardType={method === 'phone' ? 'phone-pad' : method === 'email' ? 'email-address' : 'default'}
        />
      )}
      {method === 'video' && (
        <Pressable
          onPress={() => (video ? setVideo(null) : setRecorderOpen(true))}
          style={[styles.pick, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.pickText, text]}>{video ? `Video ${video.durationS} s (snimi ponovo)` : 'Snimi video'}</Text>
        </Pressable>
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

      <Modal visible={recorderOpen} animationType="slide" onRequestClose={() => setRecorderOpen(false)}>
        <VideoRecorder
          caption={venue?.name}
          onCancel={() => setRecorderOpen(false)}
          onDone={(v) => {
            setVideo(v);
            setRecorderOpen(false);
          }}
        />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.displayBold, fontSize: 22 },
  body: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 23 },
  known: { padding: Spacing.three, borderRadius: 12, gap: 2 },
  knownLabel: { fontFamily: Fonts.bodyBold, fontSize: 13 },
  pick: { padding: Spacing.three, borderRadius: 12, alignItems: 'center' },
  pickText: { fontFamily: Fonts.bodyBold, fontSize: 15 },
});
