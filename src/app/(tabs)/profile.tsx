import { router, type Href } from 'expo-router';
import { AtSign, Bell, ChevronRight, LogOut, Mail, ShieldCheck, Store, UserRound, type LucideIcon } from 'lucide-react-native';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fonts, Spacing, useColors } from '@/constants/theme';
import { APP_EMAIL, APP_INSTAGRAM } from '@/lib/app-info';
import { useAuth } from '@/lib/auth';
import { useCity } from '@/lib/city';
import { supabase } from '@/lib/supabase';

export default function Profile() {
  const colors = useColors();
  const { session, role } = useAuth();
  const { venues } = useCity();

  if (!session) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <UserRound size={48} color={colors.accent} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          Prijavi se da bi javljao atmosferu, čuvao omiljena mesta i dobijao obaveštenja.
        </Text>
        <Pressable onPress={() => router.push('/login')} style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={[styles.buttonText, { color: colors.onAccent }]}>Prijavi se</Text>
        </Pressable>
      </View>
    );
  }

  const mine = venues.filter((v) => v.owner_id === session.user.id);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.me}>
        <View style={[styles.avatar, { backgroundColor: colors.backgroundElement }]}>
          <UserRound size={36} color={colors.accent} />
        </View>
        <Text style={[styles.email, { color: colors.text }]}>{session.user.email}</Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <Row icon={Bell} label="Obaveštenja" href="/notifications" />
        {role === 'admin' && <Row icon={ShieldCheck} label="Admin" href="/admin" />}
        {mine.map((v) => (
          <Row key={v.id} icon={Store} label={`Moje mesto: ${v.name}`} href={{ pathname: '/venue/[id]', params: { id: v.id } }} />
        ))}
        <Row icon={Mail} label={`Piši nam: ${APP_EMAIL}`} onPress={() => Linking.openURL(`mailto:${APP_EMAIL}`)} />
        <Row
          icon={AtSign}
          label={`Instagram: @${APP_INSTAGRAM}`}
          onPress={() => Linking.openURL(`https://instagram.com/${APP_INSTAGRAM}`)}
        />
      </View>
      <Pressable onPress={() => supabase.auth.signOut()} style={[styles.card, styles.row, { backgroundColor: colors.backgroundElement }]}>
        <LogOut size={20} color={colors.danger} />
        <Text style={[styles.rowText, { color: colors.danger }]}>Odjavi se</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ icon: Icon, label, href, onPress }: { icon: LucideIcon; label: string; href?: Href; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress ?? (() => router.push(href!))} style={styles.row}>
      <Icon size={20} color={colors.text} />
      <Text style={[styles.rowText, { color: colors.text }]}>{label}</Text>
      <ChevronRight size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, maxWidth: 600, width: '100%', alignSelf: 'center' },
  me: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  email: { fontFamily: Fonts.bodyBold, fontSize: 16 },
  card: { borderRadius: 16, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 14 },
  rowText: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  emptyText: { fontFamily: Fonts.body, fontSize: 16, textAlign: 'center' },
  button: { paddingHorizontal: Spacing.four, paddingVertical: 12, borderRadius: 12 },
  buttonText: { fontFamily: Fonts.bodyBold, fontSize: 16 },
});
