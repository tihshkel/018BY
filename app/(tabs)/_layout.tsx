import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, Tabs, useSegments } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomTabButton } from '@/components/custom-tab-button';
import { shouldShowOnboarding } from '@/constants/onboardingFlow';
import { colors, createShadow } from '@/constants/design-tokens';
import { useNotificationTabContext } from '@/contexts/notification-tab-context';
import { useResponsiveLayout } from '@/utils/responsive';

type EntryGuardState = 'loading' | 'onboarding' | 'login' | 'ready';

export default function TabLayout() {
  const { isNotificationTabActive, deactivateNotificationTab } = useNotificationTabContext();
  const segments = useSegments();
  const isOnNotificationsTab = (segments as readonly string[]).includes('notifications');
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const [entryGuardState, setEntryGuardState] = useState<EntryGuardState>('loading');

  useEffect(() => {
    let cancelled = false;

    const checkEntryState = async () => {
      try {
        const [showOnboarding, userName] = await Promise.all([
          shouldShowOnboarding(),
          AsyncStorage.getItem('@user_name'),
        ]);

        if (cancelled) return;

        if (showOnboarding) {
          setEntryGuardState('onboarding');
        } else if (!userName?.trim()) {
          setEntryGuardState('login');
        } else {
          setEntryGuardState('ready');
        }
      } catch (error) {
        console.warn('[TabLayout] Failed to check entry state:', error);
        if (!cancelled) {
          setEntryGuardState('onboarding');
        }
      }
    };

    void checkEntryState();

    return () => {
      cancelled = true;
    };
  }, []);

  const tabBarStyle = useMemo(() => {
    const compactLandscapeTablet = layout.isTablet && layout.isLandscape;
    const topPadding = compactLandscapeTablet ? 8 : 10;
    const bottomPadding = compactLandscapeTablet
      ? Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12)
      : Platform.OS === 'ios'
        ? Math.max(insets.bottom, 32)
        : Math.max(insets.bottom, 20);
    const contentHeight = compactLandscapeTablet ? 52 : 54;

    return {
      backgroundColor: colors.background,
      borderTopWidth: 0,
      height: topPadding + contentHeight + bottomPadding,
      minHeight: 72,
      paddingBottom: bottomPadding,
      paddingTop: topPadding,
      elevation: 0,
      ...createShadow('sm'),
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    };
  }, [insets.bottom, layout.isLandscape, layout.isTablet]);

  useEffect(() => {
    if (isNotificationTabActive && !isOnNotificationsTab) {
      deactivateNotificationTab();
    }
  }, [deactivateNotificationTab, isNotificationTabActive, isOnNotificationsTab]);

  if (entryGuardState === 'loading') {
    return null;
  }

  if (entryGuardState === 'onboarding') {
    return <Redirect href="/onboarding" />;
  }

  if (entryGuardState === 'login') {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: CustomTabButton,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle,
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
          tabBarButtonTestID: 'tab-home',
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
          tabBarButtonTestID: 'tab-projects',
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
          tabBarButtonTestID: 'tab-profile',
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
