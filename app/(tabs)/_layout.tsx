import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomTabButton } from '@/components/custom-tab-button';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Минимум по доке safe-area-context (Math.max), на Android чуть выше — системная панель и inset иногда занижены
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'ios' ? 32 : 28
  );
  // Высота «ряда» иконка+подпись без учёта safe area: на Android нужно больше, иначе baseline текста режется
  const tabContentHeight = Platform.OS === 'ios' ? 58 : 64;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: CustomTabButton,
        contentStyle: { backgroundColor: '#FFFFFF' },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: tabContentHeight + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 12,
          elevation: 8,
          shadowColor: '#8B6F5F',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
        tabBarActiveTintColor: '#C9A89A',
        tabBarInactiveTintColor: '#D4C4B5',
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: Platform.select({
            ios: 'System',
            android: 'sans-serif-medium',
            default: 'sans-serif',
          }),
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Проекты',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'book' : 'book-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="gifts"
        options={{
          title: 'Каталог',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'gift' : 'gift-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
