import { Manrope_500Medium, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Unbounded_700Bold, Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';

import { Colors, Fonts } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CityProvider } from '@/lib/city';
import { takePendingLink } from '@/lib/pending-link';

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

export default function RootLayout() {
  const [loaded, error] = useFonts({ Unbounded_700Bold, Unbounded_800ExtraBold, Manrope_500Medium, Manrope_700Bold });
  if (!loaded && !error) return null;

  return (
    <AuthProvider>
      <CityProvider>
        <ThemeProvider value={theme}>
          <RootStack />
        </ThemeProvider>
      </CityProvider>
    </AuthProvider>
  );
}

// Nothing in the app is visible without a profile: signed-out visitors only
// get the welcome screen and login.
function RootStack() {
  const { session, loading } = useAuth();

  // Already signed in when the app opened, so a shared link opens directly.
  useEffect(() => {
    if (!loading && session) takePendingLink();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: Fonts.displayBold, fontSize: 17 },
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Protected guard={!!session} redirectTo="/welcome">
        <Stack.Screen name="(tabs)" options={{ title: 'VibeIN', headerShown: false }} />
        <Stack.Screen name="live" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="venue/[id]" options={{ title: '' }} />
        <Stack.Screen name="report/[id]" options={{ title: 'Prijavi atmosferu', presentation: 'modal' }} />
        <Stack.Screen name="claim/[id]" options={{ title: 'Preuzmi profil mesta', presentation: 'modal' }} />
        <Stack.Screen name="issue/[id]" options={{ title: 'Javi promenu', presentation: 'modal' }} />
        <Stack.Screen name="edit/[id]" options={{ title: 'Uredi profil mesta' }} />
        <Stack.Screen name="post/[id]" options={{ title: 'Nova objava', presentation: 'modal' }} />
        <Stack.Screen name="admin" options={{ title: 'Admin panel' }} />
        <Stack.Screen name="notifications" options={{ title: 'Obaveštenja' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session} redirectTo="/">
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="login" options={{ title: 'Prijava', presentation: 'modal' }} />
      <Stack.Screen name="new-password" options={{ title: 'Nova lozinka' }} />
    </Stack>
  );
}
