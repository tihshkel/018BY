import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import 'expo-asset';
import 'react-native-reanimated';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { AccessCodeModalManager } from '@/components/access-code-modal-manager';
import { MediaLibraryPermissionProvider } from '@/components/media-library-permission-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { syncToCloudNow } from '@/utils/account-sync';
import { getAndStorePushToken } from '@/utils/pushToken';
import { initializeImagePreload } from '@/utils/imagePreloader';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const isInTabs = segments[0] === '(tabs)';

  // Инициализируем предзагрузку изображений при старте приложения
  useEffect(() => {
    initializeImagePreload();
  }, []);

  // Получаем push token для уведомлений при старте
  useEffect(() => {
    getAndStorePushToken();
  }, []);

  // Пробуем синхронизировать сразу после старта (без ручных действий)
  useEffect(() => {
    const timer = setTimeout(() => {
      syncToCloudNow();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Синхронизация в облако при уходе приложения в фон (сворачивание/закрытие)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        syncToCloudNow();
      }
      if (state === 'active') {
        syncToCloudNow();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}>
      <MediaLibraryPermissionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack 
            screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: '#FFFFFF' },
              animation: 'default',
              animationDuration: 300,
              animationTypeForReplace: 'push',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="activation" />
            <Stack.Screen
              name="code-type-selection"
              options={{
                animation: 'fade_from_bottom',
                animationDuration: 420,
              }}
            />
            <Stack.Screen
              name="code-input"
              options={{
                // Мягкий переход для "ввод кода" (ощущение как iOS sheet)
                animation: 'fade_from_bottom',
                animationDuration: 420,
              }}
            />
            <Stack.Screen
              name="account-code-input"
              options={{
                animation: 'fade_from_bottom',
                animationDuration: 420,
              }}
            />
            <Stack.Screen
              name="name-input"
              options={{
                // Тот же нежный переход между code-input -> name-input
                animation: 'fade_from_bottom',
                animationDuration: 420,
              }}
            />
            <Stack.Screen name="new-project" />
            <Stack.Screen name="select-album" />
            <Stack.Screen name="edit-project" />
            <Stack.Screen name="edit-album" />
            <Stack.Screen name="export-pdf" />
            <Stack.Screen name="help" />
            <Stack.Screen name="reminders-list" />
            <Stack.Screen name="export-history" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style="auto" />
          <AccessCodeModalManager isEligibleToShow={isInTabs} />
        </ThemeProvider>
      </MediaLibraryPermissionProvider>
    </SafeAreaProvider>
  );
}
