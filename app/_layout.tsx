import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import 'expo-asset';
import 'react-native-reanimated';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { AppUpdateBootstrap } from '@/components/app-update-bootstrap';
import { MediaLibraryPermissionProvider } from '@/components/media-library-permission-provider';
import { ExportSubscriptionProvider } from '@/contexts/export-subscription-context';
import { NotificationTabProvider } from '@/contexts/notification-tab-context';
import { useNotificationHandlers } from '@/hooks/use-notification-handlers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { refreshAllAlbumNotifications } from '@/utils/albumNotificationCoordinator';
import { syncToCloudNow } from '@/utils/account-sync';
import { getAndStorePushToken } from '@/utils/pushToken';
import { initializeImagePreload } from '@/utils/imagePreloader';
import Constants from 'expo-constants';

function NotificationHandlersBootstrap() {
  useNotificationHandlers();
  return null;
}

const isExpoGo = Constants.executionEnvironment === 'storeClient';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    initializeImagePreload();
  }, []);

  useEffect(() => {
    getAndStorePushToken();
  }, []);

  useEffect(() => {
    if (isExpoGo) return;

    const timer = setTimeout(() => {
      void refreshAllAlbumNotifications({ skipCloudSync: true }).catch((error) => {
        console.warn('[RootLayout] Failed to refresh album notifications:', error);
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      syncToCloudNow();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        syncToCloudNow();
      }
      if (state === 'active') {
        syncToCloudNow();
        if (!isExpoGo) {
          void refreshAllAlbumNotifications({ skipCloudSync: true }).catch((error) => {
            console.warn('[RootLayout] Failed to refresh album notifications on resume:', error);
          });
        }
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}>
      <ExportSubscriptionProvider>
        <NotificationTabProvider>
          <NotificationHandlersBootstrap />
          <AppUpdateBootstrap />
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
              <Stack.Screen name="login" />
              <Stack.Screen name="forgot-password" />
              <Stack.Screen name="reset-password" />
              <Stack.Screen name="register" />
              <Stack.Screen
                name="name-input"
                options={{
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
            </ThemeProvider>
          </MediaLibraryPermissionProvider>
        </NotificationTabProvider>
      </ExportSubscriptionProvider>
    </SafeAreaProvider>
  );
}
