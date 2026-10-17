import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing, useColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// Email + password for the first version; Google and Apple sign-in come later.
export default function LoginScreen() {
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage('Pogrešan email ili lozinka.');
    else router.back();
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    setMessage(error ? 'Registracija nije uspela, proveri podatke.' : 'Proveri email i potvrdi nalog.');
  }

  const input = [styles.input, { color: colors.text, backgroundColor: colors.backgroundElement }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TextInput style={input} placeholder="Email" placeholderTextColor={colors.textSecondary} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={input} placeholder="Lozinka" placeholderTextColor={colors.textSecondary} secureTextEntry value={password} onChangeText={setPassword} />
      {message && <Text style={{ color: colors.textSecondary }}>{message}</Text>}
      <Pressable style={[styles.button, { backgroundColor: colors.text }]} onPress={signIn}>
        <Text style={[styles.buttonText, { color: colors.background }]}>Prijavi se</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={signUp}>
        <Text style={[styles.buttonText, { color: colors.text }]}>Napravi nalog</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  input: { padding: Spacing.three, borderRadius: 12, fontSize: 16 },
  button: { padding: Spacing.three, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '600' },
});
