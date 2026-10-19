import { Text } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export function Logo() {
  return (
    <Text style={{ fontFamily: Fonts.display, fontSize: 22, color: Colors.text }}>
      Vibe<Text style={{ color: Colors.accent }}>IN</Text>
    </Text>
  );
}
