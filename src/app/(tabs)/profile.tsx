import { router, type Href } from 'expo-router';
import { BarChart3, Bell, ChevronRight, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react-native';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fonts, OwnerColors, Spacing, useColors } from '@/constants/theme';
import type { IconComponent } from '@/components/icons';
import { FacebookIcon, InstagramIcon } from '@/components/social-icons';
import { APP_EMAIL, APP_FACEBOOK_URL, APP_INSTAGRAM, APP_INSTAGRAM_URL } from '@/lib/app-info';
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
      </View>
      <Pressable onPress={() => router.push('/owner')} style={[styles.card, styles.row, styles.business]}>
        <BarChart3 size={20} color={OwnerColors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowText, { color: OwnerColors.text }]}>VibeIN Biznis</Text>
          <Text style={styles.businessSub}>{mine.length ? `Tvoje mesto: ${mine.map((v) => v.name).join(', ')}` : 'Imaš lokal? Preuzmi profil besplatno'}</Text>
        </View>
        <ChevronRight size={20} color={OwnerColors.textSecondary} />
      </Pressable>
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <Row icon={Mail} label={APP_EMAIL} onPress={() => Linking.openURL(`mailto:${APP_EMAIL}`)} />
        <Row icon={InstagramIcon} label={`@${APP_INSTAGRAM}`} onPress={() => Linking.openURL(APP_INSTAGRAM_URL)} />
        <Row icon={FacebookIcon} label="VibeIN na Facebooku" onPress={() => Linking.openURL(APP_FACEBOOK_URL)} />
      </View>
      <Pressable onPress={() => supabase.auth.signOut()} style={[styles.card, styles.row, { backgroundColor: colors.backgroundElement }]}>
        <LogOut size={20} color={colors.danger} />
        <Text style={[styles.rowText, { color: colors.danger }]}>Odjavi se</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ icon: Icon, label, href, onPress }: { icon: IconComponent; label: string; href?: Href; onPress?: () => void }) {
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
  business: { backgroundColor: OwnerColors.background, borderWidth: 1, borderColor: OwnerColors.accent },
  businessSub: { fontFamily: Fonts.body, fontSize: 13, color: OwnerColors.textSecondary },
  rowText: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  emptyText: { fontFamily: Fonts.body, fontSize: 16, textAlign: 'center' },
  button: { paddingHorizontal: Spacing.four, paddingVertical: 12, borderRadius: 12 },
  buttonText: { fontFamily: Fonts.bodyBold, fontSize: 16 },
});
