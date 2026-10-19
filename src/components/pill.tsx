import { StyleSheet, Text, View } from 'react-native';

import type { IconComponent } from '@/components/icons';
import { Colors, Fonts } from '@/constants/theme';

// Small rounded label laid over pictures: "UŽIVO", crowd, genre, distance
export function Pill({ icon: Icon, label, live }: { icon?: IconComponent; label: string; live?: boolean }) {
  const color = live ? Colors.onAccent : Colors.text;
  return (
    <View style={[styles.pill, { backgroundColor: live ? Colors.accent : 'rgba(22,32,28,0.8)' }]}>
      {live && <View style={[styles.dot, { backgroundColor: Colors.onAccent }]} />}
      {Icon && <Icon size={14} color={live ? color : Colors.accent} />}
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: Fonts.bodyBold, fontSize: 13 },
});
