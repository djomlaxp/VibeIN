import type { Post, VibeReport } from './types';

// Newest report of a venue that still has a playable clip
export function latestClip(reports: VibeReport[], venueId: string) {
  const now = Date.now();
  return reports.find(
    (r) => r.venue_id === venueId && r.video_path && (r.archived || !r.video_expires_at || new Date(r.video_expires_at).getTime() > now),
  );
}

// Music people heard most recently at a venue
export function latestGenre(reports: VibeReport[], venueId: string) {
  return reports.find((r) => r.venue_id === venueId && r.music_genre)?.music_genre ?? null;
}

export function latestPost(posts: Post[], venueId: string) {
  return posts.find((p) => p.venue_id === venueId);
}
