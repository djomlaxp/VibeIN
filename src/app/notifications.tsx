import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { VideoClip } from '@/components/video-clip';
import { Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/lib/types';
import { errorMessage, timeAgo } from '@/lib/vibe';

export default function NotificationsScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('notifications')
      .select('*, venue:venues(name), report:vibe_reports(video_path, archived, archive_withdrawn)')
      .order('created_at', { ascending: false });
    setItems((data as AppNotification[]) ?? []);
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function withdraw(item: AppNotification) {
    Alert.alert('Povuci snimak', 'Snimak će biti uklonjen iz arhive objekta i obrisan.', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Povuci',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('withdraw_archived_video', { p_report_id: item.report_id });
          if (error) Alert.alert('Povuci snimak', errorMessage(error));
          load();
        },
      },
    ]);
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(n) => n.id}
      ListEmptyComponent={<Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Nema obaveštenja.</Text>}
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={{ color: colors.text }}>
            <Link href={{ pathname: '/venue/[id]', params: { id: item.venue_id ?? '' } }} style={styles.bold}>
              {item.venue?.name ?? 'Objekat'}
            </Link>{' '}
            je arhivirao tvoj snimak na svom profilu.
            <Text style={{ color: colors.textSecondary }}>  {timeAgo(item.created_at)}</Text>
          </Text>
          {item.report?.video_path && <VideoClip path={item.report.video_path} />}
          {item.report?.archived ? (
            <Pressable onPress={() => withdraw(item)}>
              <Text style={[styles.link, { color: colors.text }]}>Povuci snimak</Text>
            </Pressable>
          ) : (
            item.report?.archive_withdrawn && <Text style={{ color: colors.textSecondary }}>Snimak je povučen.</Text>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.two, maxWidth: 800, width: '100%', alignSelf: 'center' },
  card: { padding: Spacing.three, borderRadius: 12, gap: Spacing.two },
  bold: { fontWeight: '600' },
  link: { textDecorationLine: 'underline' },
});
