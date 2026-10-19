import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { VenueAvatar } from '@/components/venue-avatar';
import { Fonts, Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useCity } from '@/lib/city';
import { VENUE_TYPE_LABELS, distanceMeters, formatDistance } from '@/lib/vibe';

// The "+" tab: pick the place you are at, nearest first, then report its atmosphere
export default function NewReport() {
  const colors = useColors();
  const { session } = useAuth();
  const { venues, vibes, position } = useCity();

  const rows = useMemo(
    () =>
      venues
        .map((v) => ({ ...v, distance: position ? distanceMeters(position, v) : null }))
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0) || a.name.localeCompare(b.name)),
    [venues, position],
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(v) => v.id}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          {position ? 'Gde si sada? Najbliža mesta su prva.' : 'Gde si sada? Izaberi mesto sa spiska.'}
        </Text>
      }
      renderItem={({ item: v }) => (
        <Pressable
          onPress={() => router.push(session ? { pathname: '/report/[id]', params: { id: v.id } } : '/login')}
          style={[styles.row, { backgroundColor: colors.backgroundElement }]}>
          <VenueAvatar type={v.type} size={44} live={!!vibes[v.id]?.report_count} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>{v.name}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {VENUE_TYPE_LABELS[v.type]}
              {v.distance != null ? ` · ${formatDistance(v.distance)}` : ''}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.three, gap: Spacing.two, maxWidth: 600, width: '100%', alignSelf: 'center' },
  intro: { fontFamily: Fonts.body, fontSize: 15, marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18 },
  name: { fontSize: 16, fontFamily: Fonts.bodyBold },
  meta: { fontFamily: Fonts.body, fontSize: 13 },
});
