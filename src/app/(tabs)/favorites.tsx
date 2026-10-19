import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { VenueAvatar } from '@/components/venue-avatar';
import { VibeBadge } from '@/components/vibe-badge';
import { Fonts, Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useCity } from '@/lib/city';
import { VENUE_TYPE_LABELS, timeAgo } from '@/lib/vibe';

// Venues saved with the heart, the ones on fire first
export default function Favorites() {
  const colors = useColors();
  const { session } = useAuth();
  const { venues, vibes, favorites, toggleFavorite } = useCity();

  const rows = useMemo(
    () => venues.filter((v) => favorites.has(v.id)).sort((a, b) => (vibes[b.id]?.vibe_score ?? -1) - (vibes[a.id]?.vibe_score ?? -1)),
    [venues, vibes, favorites],
  );

  if (!session) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Heart size={48} color={colors.accent} />
        <Text style={[styles.emptyText, { color: colors.text }]}>Prijavi se da bi čuvao omiljena mesta.</Text>
        <Pressable onPress={() => router.push('/login')} style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={[styles.buttonText, { color: colors.onAccent }]}>Prijavi se</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(v) => v.id}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Heart size={48} color={colors.accent} />
          <Text style={[styles.emptyText, { color: colors.text }]}>Još nemaš omiljena mesta. Pritisni srce kod mesta koje ti se sviđa.</Text>
        </View>
      }
      renderItem={({ item: v }) => {
        const now = vibes[v.id];
        return (
          <Pressable onPress={() => router.push({ pathname: '/venue/[id]', params: { id: v.id } })} style={[styles.row, { backgroundColor: colors.backgroundElement }]}>
            <VenueAvatar type={v.type} size={48} live={!!now?.report_count} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>{v.name}</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {VENUE_TYPE_LABELS[v.type]} · {now?.last_report_at ? timeAgo(now.last_report_at) : 'nema svežih prijava'}
              </Text>
            </View>
            <VibeBadge score={now?.vibe_score ?? null} />
            <Pressable onPress={() => toggleFavorite(v.id)} aria-label="Ukloni iz omiljenih" hitSlop={8}>
              <Heart size={22} color={colors.accent} fill={colors.accent} />
            </Pressable>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.three, gap: Spacing.two, maxWidth: 600, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18 },
  name: { fontSize: 16, fontFamily: Fonts.bodyBold },
  meta: { fontFamily: Fonts.body, fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four, marginTop: Spacing.six },
  emptyText: { fontFamily: Fonts.body, fontSize: 16, textAlign: 'center' },
  button: { paddingHorizontal: Spacing.four, paddingVertical: 12, borderRadius: 12 },
  buttonText: { fontFamily: Fonts.bodyBold, fontSize: 16 },
});
