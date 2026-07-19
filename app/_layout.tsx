import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'expo-asset';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { shouldShowOnboarding } from '@/constants/onboardingFlow';
import Constants from 'expo-constants';

function NotificationHandlersBootstrap() {
  useNotificationHandlers();
  return null;
}

const isExpoGo = Constants.executionEnvironment === 'storeClient';

async function hasCompletedEntryFlow(): Promise<boolean> {
  const [showOnboarding, userName] = await Promise.all([
    shouldShowOnboarding(),
    AsyncStorage.getItem('@user_name'),
  ]);

  return !showOnboarding && Boolean(userName?.trim());
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    initializeImagePreload();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void hasCompletedEntryFlow()
      .then((isReady) => {
        if (!cancelled && isReady) {
          return getAndStorePushToken();
        }
        return null;
      })
      .catch((error) => {
        console.warn('[RootLayout] Failed to check push bootstrap state:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isExpoGo) return;

    const timer = setTimeout(() => {
      void hasCompletedEntryFlow()
        .then((isReady) => {
          if (isReady) {
            return refreshAllAlbumNotifications({ skipCloudSync: true });
          }
          return null;
        })
        .catch((error) => {
          console.warn('[RootLayout] Failed to refresh album notifications:', error);
        });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void hasCompletedEntryFlow()
        .then((isReady) => {
          if (isReady) {
            syncToCloudNow();
          }
        })
        .catch((error) => {
          console.warn('[RootLayout] Failed to check sync bootstrap state:', error);
        });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        void hasCompletedEntryFlow()
          .then((isReady) => {
            if (isReady) {
              syncToCloudNow();
            }
          })
          .catch((error) => {
            console.warn('[RootLayout] Failed to check background sync state:', error);
          });
      }
      if (state === 'active') {
        void hasCompletedEntryFlow()
          .then((isReady) => {
            if (!isReady) return null;

            syncToCloudNow();
            if (!isExpoGo) {
              return refreshAllAlbumNotifications({ skipCloudSync: true });
            }
            return null;
          })
          .catch((error) => {
            console.warn('[RootLayout] Failed to run resume bootstraps:', error);
          });
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
              <Stack.Screen name="album-pages" />
              <Stack.Screen
                name="album-page-preview"
                options={{
                  animation: 'fade_from_bottom',
                  animationDuration: 380,
                }}
              />
              <Stack.Screen name="album-page-form" />
              <Stack.Screen name="album-page-photos" />
              <Stack.Screen name="album-add-page" />
              <Stack.Screen name="album-template-library" />
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
    </GestureHandlerRootView>
  );
}
