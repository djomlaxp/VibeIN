import type { VenueType } from './types';

export const CITY = 'Pančevo';

// Same limits the database enforces in submit_vibe_report()
export const MAX_REPORT_DISTANCE_M = 100;
export const REPORT_COOLDOWN_MIN = 15;
export const MAX_VIDEO_SECONDS = 60;

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  club: 'Klub',
  cafe: 'Kafić',
  restaurant: 'Restoran',
  concert_venue: 'Koncert',
  stadium: 'Stadion',
};

export const POST_TYPE_LABELS = { promo: 'Promocija', event: 'Najava', info: 'Obaveštenje' } as const;

export const CROWD_LABELS = ['Prazno', 'Umereno', 'Puno', 'Krcato'];

// Music choices in an atmosphere report; the name is what gets saved
export const MUSIC_GENRES: [string, string][] = [
  ['🎧', 'Elektronska'],
  ['🎤', 'Pop'],
  ['🪗', 'Narodna'],
  ['🎸', 'Rok'],
  ['🎙️', 'Rep'],
  ['🎷', 'Džez'],
  ['🎻', 'Tamburaši'],
  ['🥁', 'Svirka uživo'],
  ['🔇', 'Bez muzike'],
];

export function musicLabel(genre: string) {
  const match = MUSIC_GENRES.find(([, name]) => name === genre);
  return match ? `${match[0]} ${match[1]}` : genre;
}

export const VIBE_EMOJI = ['😴', '😐', '🙂', '😄', '🔥'];

export function vibeColor(score: number | null) {
  if (score == null) return '#9BA1A6';
  if (score >= 4.2) return '#E5484D';
  if (score >= 3.4) return '#F76B15';
  if (score >= 2.6) return '#FFC53D';
  return '#3E63DD';
}

// Errors raised by the database functions, shown to the user in Serbian
const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: 'Prijavi se da bi poslao prijavu atmosfere.',
  too_far_from_venue: `Moraš biti na manje od ${MAX_REPORT_DISTANCE_M} m od objekta.`,
  rate_limited: `Možeš poslati jednu prijavu za ovaj objekat na ${REPORT_COOLDOWN_MIN} minuta.`,
  owner_cannot_report: 'Vlasnik ne može da ocenjuje atmosferu u svom objektu.',
  invalid_video_path: 'Snimak nije ispravan, pokušaj ponovo.',
  not_venue_owner: 'Samo vlasnik objekta može arhivirati snimke.',
  video_expired: 'Snimak je istekao i ne može se arhivirati.',
  archive_withdrawn: 'Autor je povukao ovaj snimak, ne može se ponovo arhivirati.',
  not_video_author: 'Samo autor može da povuče svoj snimak.',
  venue_claims_one_pending: 'Već si poslao zahtev za ovo mesto. Javićemo ti kad ga pregledamo.',
  not_admin: 'Ovo može samo administrator.',
  claim_not_pending: 'Ovaj zahtev je već pregledan.',
  'row-level security': 'Nemaš dozvolu za ovu izmenu.',
};

export function errorMessage(error: { message?: string } | null | undefined) {
  const key = Object.keys(ERROR_MESSAGES).find((k) => error?.message?.includes(k));
  return key ? ERROR_MESSAGES[key] : 'Nešto nije u redu, pokušaj ponovo.';
}

export function timeAgo(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'upravo';
  if (min < 60) return `pre ${min} min`;
  return `pre ${Math.floor(min / 60)} h`;
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
