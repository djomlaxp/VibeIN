// Ways to prove you own a venue (see create_venue_claim in the database). For
// phone and email the admin sends a secret code to the venue itself and the
// owner types it in the app; for Instagram and Facebook the owner sends us the
// code we show them from the venue's profile; a video or a document is checked
// by the admin; express skips the proof and waits for the membership payment.
export type ClaimMethod = 'phone' | 'email' | 'instagram' | 'facebook' | 'video' | 'document' | 'express';

// VibeIN's own profiles, where owners send their code in a private message
export const VIBEIN_INSTAGRAM = '@vibein.app';
export const VIBEIN_FACEBOOK = 'VibeIN';

type MethodInfo = {
  label: string;
  // Shown before sending
  hint: string;
  // Shown to the claimant while the request waits
  howTo: (link: string | null) => string;
  // Shown to the admin
  check: (secretCode: string | null, link: string | null) => string;
};

export const CLAIM_METHODS: Record<ClaimMethod, MethodInfo> = {
  phone: {
    label: 'Poziv na broj lokala',
    hint: 'Pozvaćemo broj lokala i reći kod osobi koja se javi. Ti ga posle upišeš ovde. Najbrži način.',
    howTo: (link) => `Pozvaćemo lokal na ${link} i reći kod. Kad ti ga prenesu, upiši ga ovde.`,
    check: (secret, link) =>
      `Pozovi ${link} i reci kod ${secret}. Proveri da je to zaista broj ovog lokala (Google, meni, tabla na ulazu).`,
  },
  email: {
    label: 'Imejl lokala',
    hint: 'Poslaćemo kod na imejl sa domena lokala, na primer info@imelokala.rs. Gmail, Yahoo i slične adrese ne važe.',
    howTo: (link) => `Poslaćemo kod na ${link}. Kad stigne, upiši ga ovde.`,
    check: (secret, link) => `Pošalji kod ${secret} na ${link}. Proveri da je domen adrese isti kao sajt lokala.`,
  },
  instagram: {
    label: 'Poruka sa Instagrama',
    hint: `Dobićeš kod koji pošalješ privatnom porukom sa Instagram profila lokala na ${VIBEIN_INSTAGRAM}.`,
    howTo: (link) => `Pošalji ovaj kod privatnom porukom sa profila ${link} na ${VIBEIN_INSTAGRAM}.`,
    check: (_, link) =>
      `U porukama na ${VIBEIN_INSTAGRAM} nađi ovaj kod. Mora da stigne sa ${link}, a proveri i da je to zaista profil ovog lokala.`,
  },
  facebook: {
    label: 'Poruka sa Facebooka',
    hint: `Dobićeš kod koji pošalješ porukom sa Facebook stranice lokala na stranicu ${VIBEIN_FACEBOOK}.`,
    howTo: (link) => `Pošalji ovaj kod porukom sa stranice ${link} na Facebook stranicu ${VIBEIN_FACEBOOK}.`,
    check: (_, link) =>
      `U porukama Facebook stranice ${VIBEIN_FACEBOOK} nađi ovaj kod. Mora da stigne sa ${link}, a proveri i da je to zaista stranica ovog lokala.`,
  },
  video: {
    label: 'Video provera',
    hint: 'Snimi jedan video bez prekida, do 60 sekundi: tabla ili ulaz lokala spolja, pa unutrašnjost, pa nešto što samo osoblje može (otključaš vrata, otvoriš kasu, uđeš iza šanka).',
    howTo: () => 'Dobili smo video. Pogledaćemo ga i javiti ti čim odobrimo zahtev.',
    check: () => 'Pogledaj video. Mora biti jedan snimak bez prekida: lokal spolja sa tablom, unutrašnjost i nešto što samo osoblje može.',
  },
  document: {
    label: 'Dokument',
    hint: 'Pošalji sliku ili PDF rešenja iz APR-a, ugovora o zakupu ili računa za struju na ime lokala ili firme. Vidi ga samo administrator.',
    howTo: () => 'Dobili smo dokument. Proverićemo ga i javiti ti čim odobrimo zahtev.',
    check: () => 'Otvori dokument i proveri da se ime firme i adresa slažu sa lokalom.',
  },
  express: {
    label: 'Ekspresno, uz članarinu',
    hint: 'Bez provere: lokal postaje tvoj čim uplatiš članarinu. Nema besplatnog probnog perioda.',
    howTo: () =>
      'Javićemo ti se na imejl sa podacima za uplatu članarine. Čim uplata stigne, lokal je tvoj. Nema besplatnog probnog perioda.',
    check: () => 'Ekspresno preuzimanje: pošalji podatke za uplatu na imejl korisnika i odobri čim članarina stigne.',
  },
};

// Older requests may carry a way of proving that is no longer offered
export function claimMethodInfo(method: string | null): MethodInfo | null {
  return method && method in CLAIM_METHODS ? CLAIM_METHODS[method as ClaimMethod] : null;
}

export function hasSecretCode(method: string | null) {
  return method === 'phone' || method === 'email';
}

// A link the admin can tap to call, write to or open the venue's profile.
export function claimLinkUrl(method: string | null, link: string | null) {
  if (!link) return null;
  const value = link.trim();
  if (method === 'instagram' && !value.includes('/')) return `https://instagram.com/${value.replace(/^@/, '')}`;
  if (method === 'instagram' || method === 'facebook') return /^https?:\/\//.test(value) ? value : `https://${value}`;
  if (method === 'phone') return `tel:${link.replace(/[^\d+]/g, '')}`;
  if (method === 'email') return `mailto:${link.trim()}`;
  return null;
}
