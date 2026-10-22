import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { genreIcon } from '@/components/icons';
import { formStyles } from '@/components/form';
import { VENUE_ICONS } from '@/components/venue-avatar';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { VenueType } from '@/lib/types';
import { errorMessage } from '@/lib/vibe';

type Ranked = {
  id?: string;
  name: string;
  type?: VenueType;
  count: number;
  score?: number;
};
type Stats = {
  users: { total: number; today: number; week: number };
  reports: {
    total: number;
    today: number;
    week: number;
    with_video: number;
    with_video_week: number;
  };
  live_now: number;
  venues: number;
  owners: number;
  posts: { total: number; week: number };
  favorites: number;
  signups_by_day: { day: string; count: number }[];
  reports_by_weekday: number[];
  reports_by_hour: number[];
  top_genres: { genre: string; count: number }[];
  most_reported: Ranked[];
  best_rated: Ranked[];
  most_saved: Ranked[];
  top_reporters: Ranked[];
  never_reported: Ranked[];
  never_reported_count: number;
};

const WEEKDAYS = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];
const CHART_HEIGHT = 110;

// Admin: numbers, charts and top lists for the whole app (admin_stats() in the database).
export function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('admin_stats');
    setError(rpcError ? errorMessage(rpcError) : null);
    if (data) setStats(data as Stats);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!stats) {
    return loading ? (
      <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.five }} />
    ) : (
      <Text style={formStyles.error}>{error}</Text>
    );
  }

  const s = stats;
  return (
    <View style={{ gap: Spacing.four }}>
      <View style={styles.headerRow}>
        <Text style={formStyles.hint}>Danas = od ponoći, nedelja = poslednjih 7 dana.</Text>
        <Pressable onPress={load} style={styles.refresh}>
          <Text style={styles.refreshText}>{loading ? 'Osvežavam…' : 'Osveži'}</Text>
        </Pressable>
      </View>
      {error && <Text style={formStyles.error}>{error}</Text>}

      <View style={styles.grid}>
        <Tile title="Korisnici" value={s.users.total} lines={[`+${s.users.today} danas`, `+${s.users.week} ove nedelje`]} />
        <Tile title="Objave atmosfere" value={s.reports.total} lines={[`+${s.reports.today} danas`, `+${s.reports.week} ove nedelje`]} />
        <Tile title="Objave sa snimkom" value={s.reports.with_video} lines={[`+${s.reports.with_video_week} ove nedelje`]} />
        <Tile title="Mesta uživo sada" value={s.live_now} lines={['objava u poslednjih 90 min']} accent />
        <Tile title="Mesta u aplikaciji" value={s.venues} lines={[`${s.never_reported_count} bez ijedne objave`]} />
        <Tile title="Vlasnici mesta" value={s.owners} lines={[`${s.posts.total} objava i promocija`, `+${s.posts.week} ove nedelje`]} />
        <Tile title="Sačuvano u omiljena" value={s.favorites} />
      </View>

      <Section title="Nove registracije, poslednjih 30 dana">
        <Bars
          values={s.signups_by_day.map((d) => d.count)}
          labels={s.signups_by_day.map((d, i) => (i % 5 === 4 ? `${Number(d.day.slice(8))}.` : ''))}
        />
      </Section>

      <Section title="Kad se najviše izlazi: objave po danu">
        <Bars values={s.reports_by_weekday} labels={WEEKDAYS} />
      </Section>

      <Section title="Objave po satu">
        <Bars values={s.reports_by_hour} labels={s.reports_by_hour.map((_, h) => (h % 3 === 0 ? `${h}h` : ''))} />
      </Section>

      <Section title="Najčešći žanrovi">
        {s.top_genres.length === 0 && <Empty />}
        {s.top_genres.map((g) => {
          const Icon = genreIcon(g.genre);
          const max = s.top_genres[0].count;
          return (
            <View key={g.genre} style={styles.genreRow}>
              <Icon size={18} color={Colors.accent} />
              <Text style={styles.genreName} numberOfLines={1}>
                {g.genre}
              </Text>
              <View style={styles.genreTrack}>
                <View style={[styles.genreBar, { width: `${(g.count / max) * 100}%` }]} />
              </View>
              <Text style={styles.value}>{g.count}</Text>
            </View>
          );
        })}
      </Section>

      <Ranking title="Najviše objava" rows={s.most_reported} value={(r) => `${r.count}`} />
      <Ranking title="Najbolja ocena (bar 3 objave)" rows={s.best_rated} value={(r) => `${Number(r.score).toFixed(1)} · ${r.count}×`} />
      <Ranking title="Najviše puta sačuvana u omiljena" rows={s.most_saved} value={(r) => `${r.count}`} />
      <Ranking title="Najaktivniji korisnici" rows={s.top_reporters} value={(r) => `${r.count} objava`} />
      <Ranking title={`Mesta bez ijedne objave (${s.never_reported_count})`} rows={s.never_reported} hint="Dobri kandidati za reklamu." />
    </View>
  );
}

function Tile({ title, value, lines = [], accent }: { title: string; value: number; lines?: string[]; accent?: boolean }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={[styles.tileValue, accent && { color: Colors.accent }]}>{value}</Text>
      {lines.map((l) => (
        <Text key={l} style={styles.tileLine}>
          {l}
        </Text>
      ))}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Empty({ text = 'Još nema podataka.' }: { text?: string }) {
  return <Text style={formStyles.hint}>{text}</Text>;
}

// A simple column chart: the tallest column fills the height, its number on top.
function Bars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1);
  const top = values.indexOf(max);
  return (
    <View>
      <View style={styles.bars}>
        {values.map((v, i) => (
          <View key={i} style={styles.barSlot}>
            {i === top && <Text style={styles.barTop}>{v}</Text>}
            <View
              style={[
                styles.bar,
                {
                  height: Math.max((v / max) * CHART_HEIGHT, v > 0 ? 4 : 1),
                  opacity: v > 0 ? 1 : 0.25,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.barLabels}>
        {labels.map((l, i) => (
          <Text key={i} style={styles.barLabel} numberOfLines={1}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Ranking({ title, rows, value, hint }: { title: string; rows: Ranked[]; value?: (r: Ranked) => string; hint?: string }) {
  return (
    <Section title={title}>
      {hint && <Text style={formStyles.hint}>{hint}</Text>}
      {rows.length === 0 && <Empty />}
      {rows.map((r, i) => {
        const Icon = r.type ? VENUE_ICONS[r.type] : null;
        const open = r.id ? () => router.push({ pathname: '/venue/[id]', params: { id: r.id! } }) : undefined;
        return (
          <Pressable key={`${r.id ?? r.name}${i}`} onPress={open} disabled={!open} style={styles.rankRow}>
            <Text style={styles.rank}>{i + 1}</Text>
            {Icon && <Icon size={16} color={Colors.textSecondary} />}
            <Text style={styles.rankName} numberOfLines={1}>
              {r.name}
            </Text>
            {value && <Text style={styles.value}>{value(r)}</Text>}
          </Pressable>
        );
      })}
    </Section>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  refresh: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.backgroundSelected,
  },
  refreshText: { color: Colors.text, fontFamily: Fonts.bodyBold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: Spacing.three,
    borderRadius: 16,
    backgroundColor: Colors.backgroundElement,
    gap: 2,
  },
  tileTitle: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
  },
  tileValue: {
    color: Colors.text,
    fontFamily: Fonts.display,
    fontSize: 28,
    marginVertical: 2,
  },
  tileLine: {
    color: Colors.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  section: {
    padding: Spacing.three,
    borderRadius: 16,
    backgroundColor: Colors.backgroundElement,
    gap: Spacing.two,
  },
  sectionTitle: {
    color: Colors.text,
    fontFamily: Fonts.displayBold,
    fontSize: 15,
    marginBottom: Spacing.one,
  },
  bars: { height: CHART_HEIGHT + 16, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barSlot: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: Colors.accent,
  },
  barTop: {
    color: Colors.text,
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    marginBottom: 2,
  },
  barLabels: { flexDirection: 'row', gap: 2, marginTop: 4 },
  barLabel: {
    flex: 1,
    color: Colors.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 10,
    textAlign: 'center',
    overflow: 'visible',
  },
  genreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  genreName: { width: 90, color: Colors.text, fontFamily: Fonts.body },
  genreTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.backgroundSelected,
    overflow: 'hidden',
  },
  genreBar: { height: '100%', borderRadius: 5, backgroundColor: Colors.accent },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 6,
  },
  rank: { width: 20, color: Colors.textSecondary, fontFamily: Fonts.bodyBold },
  rankName: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  value: { color: Colors.text, fontFamily: Fonts.bodyBold },
});
