import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Fonts, Spacing, useColors } from '@/constants/theme';
import { takePendingLink } from '@/lib/pending-link';
import { supabase } from '@/lib/supabase';

// Plain-language reasons for the Supabase auth errors people actually hit.
function authMessage(error: AuthError) {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Pogrešan email ili lozinka. Ako još nemaš nalog, klikni "Napravi nalog".';
    case 'email_not_confirmed':
      return 'Nalog još nije potvrđen. Otvori email za potvrdu i klikni link u njemu.';
    case 'user_already_exists':
      return 'Nalog sa ovim emailom već postoji. Klikni "Prijavi se".';
    case 'weak_password':
      return 'Lozinka mora imati najmanje 6 znakova.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Proveri da li je email ispravno upisan.';
    case 'over_email_send_rate_limit':
      return 'Poslato je previše emailova. Pokušaj ponovo za sat vremena.';
    default:
      return `Nešto nije u redu: ${error.message}`;
  }
}

// On web, bring people back to the app from the confirmation and reset emails.
function redirectUrl() {
  return Platform.OS === 'web' ? new URL('.', window.location.href).href : undefined;
}

// After signing in, open the shared link the visitor came from, or the home feed.
function enterApp() {
  router.replace((takePendingLink() ?? '/') as never);
}

// Email + password for the first version; Google and Apple sign-in come later.
// The welcome screen opens it with mode=signup for "Napravi profil".
export default function LoginScreen() {
  const colors = useColors();
  const signup = useLocalSearchParams<{ mode?: string }>().mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setMessage(authMessage(error));
    else enterApp();
  }

  async function signUp() {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirectUrl() } });
    if (error) setMessage(authMessage(error));
    else if (data.session) enterApp();
    else setMessage('Poslali smo ti email. Klikni link u njemu da potvrdiš nalog, pa se prijavi.');
  }

  async function resetPassword() {
    if (!email) return setMessage('Upiši svoj email, pa ponovo klikni "Zaboravio sam lozinku".');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl() });
    setMessage(error ? authMessage(error) : 'Poslali smo ti email. Klikni link u njemu da postaviš novu lozinku.');
  }

  const input = [styles.input, { color: colors.text, backgroundColor: colors.backgroundElement }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: signup ? 'Napravi profil' : 'Prijava' }} />
      <TextInput style={input} placeholder="Email" placeholderTextColor={colors.textSecondary} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={input} placeholder="Lozinka" placeholderTextColor={colors.textSecondary} secureTextEntry autoCapitalize="none" value={password} onChangeText={setPassword} />
      {message && <Text style={{ color: colors.textSecondary }}>{message}</Text>}
      <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={signup ? signUp : signIn}>
        <Text style={[styles.buttonText, { color: colors.onAccent }]}>{signup ? 'Napravi nalog' : 'Prijavi se'}</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={signup ? signIn : signUp}>
        <Text style={[styles.buttonText, { color: colors.text }]}>{signup ? 'Već imam nalog, prijavi me' : 'Napravi nalog'}</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={resetPassword}>
        <Text style={{ color: colors.textSecondary }}>Zaboravio sam lozinku</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  input: { padding: Spacing.three, borderRadius: 12, fontSize: 16 },
  button: { padding: Spacing.three, borderRadius: 999, alignItems: 'center' },
  buttonText: { fontSize: 17, fontFamily: Fonts.bodyBold },
  link: { padding: Spacing.two, alignItems: 'center' },
});
