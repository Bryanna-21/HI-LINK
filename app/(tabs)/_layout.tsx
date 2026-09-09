import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useColors } from '../../src/constants/theme';

// Simple text-glyph icons for now — no icon library added yet since
// none was needed until this exact point. Swappable later for a real
// icon set (e.g. @expo/vector-icons, already bundled with Expo) without
// changing any navigation logic.
import type { ColorValue } from 'react-native';

function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return (
    <View>
      <Text style={{ fontSize: 20, color }}>{glyph}</Text>
    </View>
  );
}

export default function TabsLayout() {
  // Was a static Colors import — meant the tab bar stayed pure white
  // at the bottom of every screen even in dark mode, visible on all
  // five tabs, all the time. Same bug class as emergency.tsx and
  // chat[id].tsx: hardcoded palette that never re-renders on toggle.
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon glyph="⌂" color={color} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color }) => <TabIcon glyph="📚" color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color }) => <TabIcon glyph="👥" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <TabIcon glyph="🧭" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon glyph="👤" color={color} />,
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
