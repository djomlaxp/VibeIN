import { StyleSheet, Text, View } from 'react-native';

import { CROWD_LABELS, vibeColor } from '@/lib/vibe';

export function VibeBadge({ score, crowd, size = 'small' }: { score: number | null; crowd?: number | null; size?: 'small' | 'large' }) {
  const large = size === 'large';
  const dim = large ? 56 : 36;
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: vibeColor(score), width: dim, height: dim }]}>
        <Text style={[styles.score, large && { fontSize: 20 }]}>{score == null ? '–' : Number(score).toFixed(1)}</Text>
      </View>
      {crowd != null && <Text style={styles.crowd}>{CROWD_LABELS[crowd]}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  score: { color: '#fff', fontWeight: '700' },
  crowd: { color: '#888', fontSize: 15 },
});
