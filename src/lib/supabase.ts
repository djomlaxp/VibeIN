import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// The VibeIN project. The publishable key is meant to ship inside the app;
// access is controlled by row level security in supabase/migrations.
// Override both in .env to point the app at another Supabase project.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://solrsdvwszkwwmaiidyd.supabase.co';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_aay2OBQCrw1xFYaaeJXsMA_6MGGOf1j';

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export const VIDEO_BUCKET = 'vibe-videos';

export function videoUrl(path: string) {
  return supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path).data.publicUrl;
}
