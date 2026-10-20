import type { ClaimMethod } from '@/lib/claims';

export type VenueType = 'club' | 'cafe' | 'restaurant' | 'concert_venue' | 'stadium';

export type Venue = {
  id: string;
  name: string;
  type: VenueType;
  address: string | null;
  city: string;
  description: string | null;
  owner_id: string | null;
  verified: boolean;
  opening_hours: { text?: string } | null;
  contact: { phone?: string | null; instagram?: string | null; website?: string | null } | null;
  lat: number;
  lng: number;
};

export type VibeNow = {
  venue_id: string;
  vibe_score: number | null;
  crowd: number | null;
  report_count: number;
  last_report_at: string | null;
};

export type VibeReport = {
  id: string;
  venue_id: string;
  user_id: string;
  vibe: number;
  crowd: number;
  music_genre: string | null;
  video_path: string | null;
  video_duration_s: number | null;
  video_expires_at: string | null;
  archived: boolean;
  archive_withdrawn: boolean;
  created_at: string;
};

export type PostType = 'promo' | 'event' | 'info';

export type Post = {
  id: string;
  venue_id: string;
  type: PostType;
  title: string;
  body: string | null;
  valid_to: string | null;
  created_at: string;
};

export type AppNotification = {
  id: string;
  type: 'video_archived' | 'venue_issue' | 'venue_claim';
  report_id: string | null;
  venue_id: string | null;
  read_at: string | null;
  created_at: string;
  venue: { name: string } | null;
  report: { video_path: string | null; archived: boolean; archive_withdrawn: boolean } | null;
};

// A request to manage a venue, as the admin sees it (admin_pending_claims())
export type VenueClaim = {
  id: string;
  venue_id: string;
  venue_name: string;
  venue_contact: { phone?: string | null; instagram?: string | null; website?: string | null } | null;
  proof: string | null;
  method: ClaimMethod | null;
  venue_link: string | null;
  code: string | null;
  secret_code: string | null;
  secret_confirmed: boolean;
  secret_attempts: number;
  document_path: string | null;
  email: string | null;
  created_at: string;
};

export type VenueIssue = {
  id: string;
  venue_id: string;
  kind: 'closed' | 'renamed';
  new_name: string | null;
  created_at: string;
  venue: { name: string } | null;
};

export type WelcomeClip = { slot: number; video_path: string; label: string };
