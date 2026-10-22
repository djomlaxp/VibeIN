import type { VibeReport } from './types';
import { MUSIC_GENRES } from './vibe';

export const WEEKDAYS = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];

export type OwnerStats = {
  today: number;
  week: number;
  month: number;
  withVideo: number;
  avgVibe: number | null;
  topGenre: string | null;
  // Guests' posts in the last 30 days by weekday (Monday first) and by hour
  byWeekday: number[];
  byHour: number[];
  busiestDay: number | null;
  busiestHour: number | null;
};

// What the owner's dashboard shows, worked out from the last 30 days of
// guests' posts about the venue (they are public, so no extra database access).
export function ownerStats(reports: VibeReport[]): OwnerStats {
  const now = Date.now();
  const midnight = new Date().setHours(0, 0, 0, 0);
  const byWeekday = Array(7).fill(0);
  const byHour = Array(24).fill(0);
  const genres = new Map<string, number>();
  let today = 0;
  let week = 0;
  let withVideo = 0;
  let vibeSum = 0;
  for (const r of reports) {
    const t = new Date(r.created_at);
    if (t.getTime() >= midnight) today++;
    if (now - t.getTime() < 7 * 24 * 60 * 60 * 1000) week++;
    if (r.video_path) withVideo++;
    vibeSum += r.vibe;
    byWeekday[(t.getDay() + 6) % 7]++;
    byHour[t.getHours()]++;
    if (r.music_genre && r.music_genre !== MUSIC_GENRES[MUSIC_GENRES.length - 1]) genres.set(r.music_genre, (genres.get(r.music_genre) ?? 0) + 1);
  }
  const top = [...genres].sort((a, b) => b[1] - a[1])[0];
  const peak = (xs: number[]) => (Math.max(...xs) > 0 ? xs.indexOf(Math.max(...xs)) : null);
  return {
    today,
    week,
    month: reports.length,
    withVideo,
    avgVibe: reports.length ? vibeSum / reports.length : null,
    topGenre: top?.[0] ?? null,
    byWeekday,
    byHour,
    busiestDay: peak(byWeekday),
    busiestHour: peak(byHour),
  };
}

// A guest's clip the owner can still keep: not yet deleted after 3 hours, or already kept
export function clipStillAvailable(r: VibeReport) {
  if (!r.video_path || r.archive_withdrawn) return false;
  return r.archived || (r.video_expires_at != null && new Date(r.video_expires_at).getTime() > Date.now());
}
