import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/lib/auth';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'VibeIN' }} />
          <Stack.Screen name="venue/[id]" options={{ title: '' }} />
          <Stack.Screen name="report/[id]" options={{ title: 'Prijavi atmosferu', presentation: 'modal' }} />
          <Stack.Screen name="notifications" options={{ title: 'Obaveštenja' }} />
          <Stack.Screen name="login" options={{ title: 'Prijava', presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
