/**
 * ETFLens — Tab Navigator
 * 5 tabs: Home, Watchlist, AI Summary, News, Settings
 */
import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Simple icon components using text/emoji for zero native deps
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <View style={styles.emojiWrap}>
        {/* Using a View-based indicator instead of emoji for crispness */}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'dark'];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#0F1520' : '#FFFFFF',
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          borderTopWidth: 1,
          height: (Platform.OS === 'ios' ? 88 : 64) + insets.bottom,
          paddingBottom: (Platform.OS === 'ios' ? 28 : 8) + insets.bottom,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.tabInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Inter_500Medium',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabEmoji emoji="📊" color={color} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color }) => <TabEmoji emoji="👁️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: 'AI Summary',
          tabBarIcon: ({ color }) => <TabEmoji emoji="🧠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'News',
          tabBarIcon: ({ color }) => <TabEmoji emoji="📰" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabEmoji emoji="⚙️" color={color} />,
        }}
      />
    </Tabs>
  );
}

// Minimal emoji tab icon
function TabEmoji({ emoji, color }: { emoji: string; color: string }) {
  return (
    <View style={styles.tabIcon}>
      {/* Dot indicator for active state handled by tint color */}
      <View>
        {/* Placeholder — actual icon is label emoji rendered by tabBarIcon */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(0,230,118,0.12)',
  },
  emojiWrap: {},
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
