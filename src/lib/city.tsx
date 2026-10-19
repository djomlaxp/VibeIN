import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { supabase } from './supabase';
import type { Post, Venue, VibeNow, VibeReport } from './types';
import { CITY } from './vibe';

// The reporter's GPS position (user_location) is not readable by clients, so
// select('*') is refused; ask only for the columns the app is granted.
export const REPORT_COLUMNS =
  'id, venue_id, user_id, vibe, crowd, music_genre, video_path, video_duration_s, video_expires_at, archived, archive_withdrawn, created_at';

type CityState = {
  venues: Venue[];
  vibes: Record<string, VibeNow>;
  // Reports from the last 3 hours (videos live that long), newest first
  reports: VibeReport[];
  // Promotions and announcements running right now, newest first
  posts: Post[];
  position: { lat: number; lng: number } | null;
  favorites: Set<string>;
  refreshing: boolean;
  reload: () => Promise<void>;
  // Returns false when the person has to sign in first
  toggleFavorite: (venueId: string) => Promise<boolean>;
};

const CityContext = createContext<CityState | null>(null);

// Everything the home feed, the live view and the favorites tab show, loaded
// once and refreshed whenever someone reports atmosphere.
export function CityProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [vibes, setVibes] = useState<Record<string, VibeNow>>({});
  const [reports, setReports] = useState<VibeReport[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [position, setPosition] = useState<CityState['position']>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();
    const [v, n, r, p] = await Promise.all([
      supabase.from('venues_with_coords').select('*').eq('city', CITY),
      supabase.from('venue_vibe_now').select('*'),
      supabase.from('vibe_reports').select(REPORT_COLUMNS).gte('created_at', since).order('created_at', { ascending: false }),
      supabase.from('posts').select('*').lte('valid_from', nowIso).or(`valid_to.is.null,valid_to.gt.${nowIso}`).order('created_at', { ascending: false }),
    ]);
    setVenues((v.data as Venue[]) ?? []);
    setVibes(Object.fromEntries(((n.data as VibeNow[]) ?? []).map((x) => [x.venue_id, x])));
    setReports((r.data as VibeReport[]) ?? []);
    setPosts((p.data as Post[]) ?? []);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    reload();
    const channel = supabase
      .channel('vibe-reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vibe_reports' }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const p = await Location.getCurrentPositionAsync({});
      setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
    })();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return setFavorites(new Set());
    supabase
      .from('favorites')
      .select('venue_id')
      .eq('user_id', userId)
      .then(({ data }) => setFavorites(new Set((data ?? []).map((f) => f.venue_id as string))));
  }, [userId]);

  const toggleFavorite = useCallback(
    async (venueId: string) => {
      if (!userId) return false;
      const saved = favorites.has(venueId);
      setFavorites((old) => {
        const next = new Set(old);
        if (saved) next.delete(venueId);
        else next.add(venueId);
        return next;
      });
      if (saved) await supabase.from('favorites').delete().eq('user_id', userId).eq('venue_id', venueId);
      else await supabase.from('favorites').insert({ user_id: userId, venue_id: venueId });
      return true;
    },
    [userId, favorites],
  );

  return (
    <CityContext.Provider value={{ venues, vibes, reports, posts, position, favorites, refreshing, reload, toggleFavorite }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const city = useContext(CityContext);
  if (!city) throw new Error('useCity outside CityProvider');
  return city;
}
