// Where shared links point: the published web app
export const SITE_URL = 'https://djomlaxp.github.io/VibeIN';
export const SITE_LABEL = 'djomlaxp.github.io/VibeIN';

export function venueLink(venueId: string) {
  return `${SITE_URL}/venue/${venueId}`;
}
