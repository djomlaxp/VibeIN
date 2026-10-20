import { Check, Copy, Download, Share2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Spacing } from '@/constants/theme';
import { venueLink } from '@/lib/share';
import { videoUrl } from '@/lib/supabase';
import type { Venue, VibeReport } from '@/lib/types';

const web = Platform.OS === 'web';

// "Podeli": copies the venue's VibeIN link and sends the clip on to Instagram,
// WhatsApp, Viber... Instagram only opens links from a story's Link sticker,
// so the sheet tells people to paste the link there.
export function ShareSheet({ venue, clip, onClose }: { venue: Venue; clip: VibeReport | null; onClose: () => void }) {
  const link = venueLink(venue.id);
  const text = `${venue.name} uživo na VibeIN-u`;
  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Fetch the clip up front: phones only open the share menu right after a tap
  useEffect(() => {
    if (!web || !clip?.video_path) return;
    let cancelled = false;
    fetch(videoUrl(clip.video_path))
      .then((r) => r.blob())
      .then((b) => !cancelled && setFile(new File([b], `vibein-${venue.name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.mp4`, { type: 'video/mp4' })))
      .catch(() => !cancelled && setStatus('Snimak nije mogao da se učita.'));
    return () => {
      cancelled = true;
    };
  }, [clip?.video_path, venue.name]);

  async function copy() {
    if (web && navigator.clipboard) {
      await navigator.clipboard.writeText(link).catch(() => null);
      setCopied(true);
    } else {
      await Share.share({ message: link });
    }
  }

  async function shareClip() {
    if (!web) {
      await Share.share({ message: `${text}: ${link}`, url: clip?.video_path ? videoUrl(clip.video_path) : link });
      return;
    }
    if (!file) return;
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: text }).catch(() => null);
      return;
    }
    // Computers can't share files: save it so it can be posted by hand
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setStatus('Snimak je sačuvan na uređaju.');
  }

  async function shareLink() {
    if (web && navigator.share) await navigator.share({ title: text, url: link }).catch(() => null);
    else await Share.share({ message: `${text}: ${link}` });
  }

  const canShareFiles = web && typeof navigator !== 'undefined' && !!navigator.canShare;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => null}>
          <View style={styles.head}>
            <Text style={styles.title}>Podeli {venue.name}</Text>
            <Pressable onPress={onClose} aria-label="Zatvori" hitSlop={10}>
              <X size={24} color={Colors.text} />
            </Pressable>
          </View>

          <Step n={1} text="Kopiraj link ka ovom mestu u VibeIN-u." />
          <Pressable onPress={copy} style={[styles.button, styles.secondary]}>
            {copied ? <Check size={18} color={Colors.accent} /> : <Copy size={18} color={Colors.text} />}
            <Text style={styles.buttonText} numberOfLines={1}>
              {copied ? 'Link je kopiran' : link.replace('https://', '')}
            </Text>
          </Pressable>

          {clip?.video_path ? (
            <>
              <Step n={2} text="Pošalji snimak na Instagram (Story), WhatsApp ili Viber." />
              <Pressable onPress={shareClip} disabled={web && !file} style={[styles.button, styles.primary, web && !file && { opacity: 0.5 }]}>
                {web && !canShareFiles ? <Download size={18} color={Colors.onAccent} /> : <Share2 size={18} color={Colors.onAccent} />}
                <Text style={[styles.buttonText, { color: Colors.onAccent }]}>
                  {web && !file ? 'Pripremam snimak…' : web && !canShareFiles ? 'Sačuvaj snimak' : 'Podeli snimak'}
                </Text>
              </Pressable>
              <Step n={3} text='Na Instagramu u storiju dodaj nalepnicu "Link" i nalepi link. Ko je dodirne, otvoriće mu se ovo mesto u VibeIN-u.' />
            </>
          ) : (
            <>
              <Step n={2} text="Pošalji link prijateljima ili ga nalepi u Instagram story kao nalepnicu Link." />
              <Pressable onPress={shareLink} style={[styles.button, styles.primary]}>
                <Share2 size={18} color={Colors.onAccent} />
                <Text style={[styles.buttonText, { color: Colors.onAccent }]}>Podeli link</Text>
              </Pressable>
            </>
          )}
          {status && <Text style={styles.status}>{status}</Text>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.backgroundElement,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  title: { flex: 1, color: Colors.text, fontFamily: Fonts.displayBold, fontSize: 18 },
  step: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.backgroundSelected, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: Colors.accent, fontFamily: Fonts.bodyBold, fontSize: 13 },
  stepText: { flex: 1, color: Colors.text, fontFamily: Fonts.body, fontSize: 15, lineHeight: 21 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: 14, paddingHorizontal: Spacing.three, borderRadius: 14 },
  primary: { backgroundColor: Colors.accent },
  secondary: { backgroundColor: Colors.backgroundSelected },
  buttonText: { color: Colors.text, fontFamily: Fonts.bodyBold, fontSize: 15, flexShrink: 1 },
  status: { color: Colors.textSecondary, fontFamily: Fonts.body, textAlign: 'center' },
});
