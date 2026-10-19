import { Manrope_500Medium, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Unbounded_700Bold, Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { Text } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.accent,
    background: Colors.background,
    card: Colors.background,
    text: Colors.text,
    border: Colors.backgroundElement,
    notification: Colors.accent,
  },
};

function Logo() {
  return (
    <Text style={{ fontFamily: Fonts.display, fontSize: 22, color: Colors.text }}>
      Vibe<Text style={{ color: Colors.accent }}>IN</Text>
    </Text>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Unbounded_700Bold, Unbounded_800ExtraBold, Manrope_500Medium, Manrope_700Bold });
  if (!loaded && !error) return null;

  return (
    <AuthProvider>
      <ThemeProvider value={theme}>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerTitleStyle: { fontFamily: Fonts.displayBold, fontSize: 17 },
            contentStyle: { backgroundColor: Colors.background },
          }}>
          <Stack.Screen name="index" options={{ title: 'VibeIN', headerTitle: () => <Logo /> }} />
          <Stack.Screen name="venue/[id]" options={{ title: '' }} />
          <Stack.Screen name="report/[id]" options={{ title: 'Prijavi atmosferu', presentation: 'modal' }} />
          <Stack.Screen name="map" options={{ title: 'Mapa' }} />
          <Stack.Screen name="claim/[id]" options={{ title: 'Preuzmi profil mesta', presentation: 'modal' }} />
          <Stack.Screen name="edit/[id]" options={{ title: 'Uredi profil mesta' }} />
          <Stack.Screen name="post/[id]" options={{ title: 'Nova objava', presentation: 'modal' }} />
          <Stack.Screen name="admin" options={{ title: 'Admin' }} />
          <Stack.Screen name="notifications" options={{ title: 'Obaveštenja' }} />
          <Stack.Screen name="login" options={{ title: 'Prijava', presentation: 'modal' }} />
          <Stack.Screen name="new-password" options={{ title: 'Nova lozinka' }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
