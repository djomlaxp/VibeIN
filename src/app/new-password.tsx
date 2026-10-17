import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing, useColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Opened from a password reset email; the link has already signed the person in.
export default function NewPasswordScreen() {
  const colors = useColors();
  const { session, setRecovering } = useAuth();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    if (password.length < 6) return setMessage('Lozinka mora imati najmanje 6 znakova.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMessage(`Nešto nije u redu: ${error.message}`);
    setRecovering(false);
    router.replace('/');
  }

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Link je istekao. Na stranici za prijavu ponovo klikni "Zaboravio sam lozinku".</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.text }}>Nova lozinka za {session.user.email}</Text>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement }]}
        placeholder="Nova lozinka"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />
      {message && <Text style={{ color: colors.textSecondary }}>{message}</Text>}
      <Pressable style={[styles.button, { backgroundColor: colors.text }]} onPress={save}>
        <Text style={[styles.buttonText, { color: colors.background }]}>Sačuvaj lozinku</Text>
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
