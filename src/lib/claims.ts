// Ways to prove you own a venue (see create_venue_claim in the database).
// Public-code methods: the owner shows the code where only they can put it.
// Secret-code methods: the admin sends the code to the venue's public phone or
// email, and the owner types it in the app.
export type ClaimMethod = 'instagram' | 'facebook' | 'website' | 'phone' | 'email' | 'document' | 'visit';

type MethodInfo = {
  label: string;
  // What we ask for about the venue, if anything
  link?: { label: string; placeholder: string };
  // Shown to the claimant after sending
  howTo: (code: string | null, link: string | null) => string;
  // Shown to the admin
  check: (secretCode: string | null) => string;
};

export const CLAIM_METHODS: Record<ClaimMethod, MethodInfo> = {
  instagram: {
    label: 'Instagram lokala',
    link: { label: 'Instagram profil lokala', placeholder: '@imelokala' },
    howTo: (code) =>
      `Stavi kod ${code} u opis (bio) Instagram profila lokala ili ga objavi u story. Kad odobrimo zahtev, kod možeš da skloniš.`,
    check: () => 'Otvori profil i nađi kod u opisu ili u story-ju. Proveri da je to zaista profil ovog lokala.',
  },
  facebook: {
    label: 'Facebook stranica',
    link: { label: 'Link do Facebook stranice lokala', placeholder: 'facebook.com/imelokala' },
    howTo: (code) =>
      `Objavi kod ${code} na Facebook stranici lokala ili ga stavi u opis stranice. Kad odobrimo zahtev, možeš da ga skloniš.`,
    check: () => 'Otvori stranicu i nađi kod u objavi ili opisu. Proveri da je to zaista stranica ovog lokala.',
  },
  website: {
    label: 'Sajt lokala',
    link: { label: 'Adresa sajta lokala', placeholder: 'www.imelokala.rs' },
    howTo: (code) => `Stavi kod ${code} bilo gde na početnu stranu sajta lokala. Kad odobrimo zahtev, možeš da ga skloniš.`,
    check: () => 'Otvori sajt i nađi kod na početnoj strani.',
  },
  phone: {
    label: 'Telefon lokala',
    link: { label: 'Javni broj telefona lokala', placeholder: 'Broj sa Google-a, menija ili ulaza' },
    howTo: (_, link) => `Pozvaćemo lokal na ${link} i reći kod osobi koja se javi. Kad ti prenesu kod, upiši ga ovde.`,
    check: (secret) =>
      `Pozovi javni broj lokala i reci kod ${secret}. Ako se broj koji je poslao korisnik ne slaže sa brojem lokala, pozovi broj lokala.`,
  },
  email: {
    label: 'Imejl lokala',
    link: { label: 'Zvanični imejl lokala', placeholder: 'info@imelokala.rs' },
    howTo: (_, link) => `Poslaćemo kod na ${link}. Kad stigne, upiši ga ovde.`,
    check: (secret) => `Pošalji kod ${secret} na zvanični imejl lokala i sačekaj da ga vlasnik upiše.`,
  },
  document: {
    label: 'Dokument',
    howTo: () => 'Dobili smo dokument. Proverićemo ga i javiti ti čim odobrimo zahtev.',
    check: () => 'Otvori dokument i proveri da se ime firme i adresa slažu sa lokalom.',
  },
  visit: {
    label: 'Lična poseta',
    howTo: (code) => `Doći ćemo u lokal. Kada dođemo, pokaži nam kod ${code} u aplikaciji.`,
    check: () => 'Idi u lokal i traži da ti vlasnik pokaže ovaj kod u aplikaciji.',
  },
};

export function hasSecretCode(method: ClaimMethod | null) {
  return method === 'phone' || method === 'email';
}

// Turns what the claimant typed into a link the admin can open.
export function claimLinkUrl(method: ClaimMethod | null, link: string | null) {
  if (!link) return null;
  const value = link.trim();
  if (method === 'instagram' && !value.includes('/')) return `https://instagram.com/${value.replace(/^@/, '')}`;
  if (method === 'facebook' || method === 'website' || method === 'instagram')
    return /^https?:\/\//.test(value) ? value : `https://${value}`;
  if (method === 'phone') return `tel:${value.replace(/[^\d+]/g, '')}`;
  if (method === 'email') return `mailto:${value}`;
  return null;
}
