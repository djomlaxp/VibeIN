// Ways to prove you own a venue, as Google, Yelp and Facebook do it (see
// create_venue_claim in the database). For phone, email and postcard the admin
// sends a secret code to the venue itself and the owner types it in the app;
// a video or a document is checked by the admin.
export type ClaimMethod = 'phone' | 'email' | 'postcard' | 'video' | 'document';

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
  postcard: {
    label: 'Razglednica poštom',
    hint: 'Poslaćemo razglednicu sa kodom na adresu lokala. Stiže za nekoliko dana, a kod upišeš ovde.',
    howTo: (link) => `Poslaćemo razglednicu sa kodom na ${link}. Kad stigne, upiši kod ovde.`,
    check: (secret, link) => `Pošalji razglednicu ili pismo na ${link} sa kodom ${secret}, naslovljeno na vlasnika lokala.`,
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
};

// Older requests may carry a way of proving that is no longer offered
export function claimMethodInfo(method: string | null): MethodInfo | null {
  return method && method in CLAIM_METHODS ? CLAIM_METHODS[method as ClaimMethod] : null;
}

export function hasSecretCode(method: string | null) {
  return method === 'phone' || method === 'email' || method === 'postcard';
}

// A link the admin can tap to call or write to the venue.
export function claimLinkUrl(method: string | null, link: string | null) {
  if (!link) return null;
  if (method === 'phone') return `tel:${link.replace(/[^\d+]/g, '')}`;
  if (method === 'email') return `mailto:${link.trim()}`;
  return null;
}
