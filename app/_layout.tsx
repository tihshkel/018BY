import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeImagePreload } from '@/utils/imagePreloader';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Инициализируем предзагрузку изображений при старте приложения
  useEffect(() => {
    initializeImagePreload();
  }, []);

  return (
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
        <Stack.Screen name="code-input" />
        <Stack.Screen name="purchase" />
        <Stack.Screen name="name-input" />
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
  );
}
