import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { CROWD_LABELS, vibeColor } from '@/lib/vibe';

// A ring in the vibe color; the hottest places glow.
export function VibeBadge({ score, crowd, size = 'small' }: { score: number | null; crowd?: number | null; size?: 'small' | 'large' }) {
  const large = size === 'large';
  const dim = large ? 72 : 44;
  const color = vibeColor(score);
  const hot = score != null && score >= 4.2;
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.ring,
          { borderColor: color, width: dim, height: dim, borderWidth: large ? 4 : 3 },
          hot && { boxShadow: `0 0 ${large ? 24 : 16}px ${color}` },
        ]}>
        <Text style={[styles.score, { fontSize: large ? 22 : 13 }]}>{score == null ? '–' : Number(score).toFixed(1)}</Text>
      </View>
      {crowd != null && <Text style={styles.crowd}>{CROWD_LABELS[crowd]}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ring: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.backgroundElement },
  score: { color: Colors.text, fontFamily: Fonts.displayBold },
  crowd: { color: Colors.text, fontSize: 16, fontFamily: Fonts.bodyBold },
});
