import { Tabs, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CustomTabButton } from '@/components/custom-tab-button';
import { colors, createShadow } from '@/constants/design-tokens';
import { useNotificationTabContext } from '@/contexts/notification-tab-context';

export default function TabLayout() {
  const { isNotificationTabActive, deactivateNotificationTab } = useNotificationTabContext();
  const segments = useSegments();
  const isOnNotificationsTab = (segments as readonly string[]).includes('notifications');

  useEffect(() => {
    if (isNotificationTabActive && !isOnNotificationsTab) {
      deactivateNotificationTab();
    }
  }, [deactivateNotificationTab, isNotificationTabActive, isOnNotificationsTab]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: CustomTabButton,
        contentStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 90 : 72,
          paddingBottom: Platform.OS === 'ios' ? 32 : 12,
          paddingTop: 12,
          elevation: 0,
          ...createShadow('sm'),
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
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
          href: isNotificationTabActive ? null : undefined,
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
      <Tabs.Screen
        name="notifications"
        options={{
          href: isNotificationTabActive ? undefined : null,
          title: 'Уведомления',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'notifications' : 'notifications-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
