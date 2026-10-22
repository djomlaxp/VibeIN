import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router/js-tabs';
import { Heart, House, Map, Plus, UserRound } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, LiveGradient } from '@/constants/theme';

// Bottom bar like the mockup: home, map, a big "+" to report, favorites, profile
export default function TabsLayout() {
  // Lifts the bar above Android's navigation keys and the iPhone home bar.
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: Colors.background },
        headerTitleStyle: { fontFamily: Fonts.displayBold, fontSize: 17, color: Colors.text },
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.text,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.backgroundElement,
          height: 64 + bottom,
          paddingTop: 8,
          paddingBottom: bottom,
        },
        sceneStyle: { backgroundColor: Colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'VibeIN', tabBarIcon: ({ color }) => <House size={26} color={color} /> }} />
      <Tabs.Screen name="map" options={{ title: 'Mapa', tabBarIcon: ({ color }) => <Map size={26} color={color} /> }} />
      <Tabs.Screen
        name="new"
        options={{
          title: 'Objavi atmosferu',
          tabBarAccessibilityLabel: 'Objavi atmosferu',
          tabBarButton: ({ onPress, accessibilityLabel }) => (
            <Pressable onPress={onPress} aria-label={accessibilityLabel} style={styles.plusWrap}>
              <LinearGradient colors={LiveGradient} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.plus}>
                <Plus size={26} color={Colors.onAccent} strokeWidth={2.6} />
              </LinearGradient>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="favorites" options={{ title: 'Omiljeno', tabBarIcon: ({ color }) => <Heart size={26} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ color }) => <UserRound size={26} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  plusWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  plus: { width: 56, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
