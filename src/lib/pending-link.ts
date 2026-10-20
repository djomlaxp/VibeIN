import { Platform } from 'react-native';

// When a signed-out visitor opens a shared link (say a venue from Instagram),
// they land on the welcome screen first. Remember where the link pointed so
// login can take them there afterwards.
let pending: string | null = null;

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
  let path = window.location.pathname;
  if (base && path.startsWith(base)) path = path.slice(base.length);
  if (path && path !== '/' && !/^\/(welcome|login|new-password)\b/.test(path)) pending = path + window.location.search;
}

export function takePendingLink() {
  const link = pending;
  pending = null;
  return link;
}
