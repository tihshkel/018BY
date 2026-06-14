import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { AppButton, AppCenterModal, AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';

const HAS_SHOWN_PREPROMPT_KEY = '@has_shown_media_library_permission_preprompt';

type PermissionModalVariant = 'preprompt' | 'denied';

interface MediaLibraryPermissionContextValue {
  ensureMediaLibraryPermission: () => Promise<boolean>;
}

const MediaLibraryPermissionContext = createContext<MediaLibraryPermissionContextValue | null>(null);

export function useMediaLibraryPermission() {
  const ctx = useContext(MediaLibraryPermissionContext);
  if (!ctx) {
    throw new Error('useMediaLibraryPermission must be used within MediaLibraryPermissionProvider');
  }
  return ctx;
}

function openSystemSettings() {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
    return;
  }
  Linking.openSettings();
}

export function MediaLibraryPermissionProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [variant, setVariant] = useState<PermissionModalVariant>('preprompt');
  const pendingResolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    setIsVisible(false);
    const resolve = pendingResolveRef.current;
    pendingResolveRef.current = null;
    if (resolve) {
      requestAnimationFrame(() => resolve(result));
    }
  }, []);

  const showModalAndWait = useCallback(async (nextVariant: PermissionModalVariant) => {
    if (pendingResolveRef.current) return false;

    setVariant(nextVariant);
    setIsVisible(true);

    return await new Promise<boolean>((resolve) => {
      pendingResolveRef.current = resolve;
    });
  }, []);

  const requestSystemPermission = useCallback(async () => {
    try {
      const requestResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (requestResult.granted) return true;
      if (requestResult.canAskAgain) return false;
      await showModalAndWait('denied');
      return false;
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      return false;
    }
  }, [showModalAndWait]);

  const ensureMediaLibraryPermission = useCallback(async () => {
    if (Platform.OS === 'web') return true;

    try {
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (current.granted) return true;

      const hasShownPreprompt =
        (await AsyncStorage.getItem(HAS_SHOWN_PREPROMPT_KEY)) === 'true';

      if (!current.canAskAgain) {
        await showModalAndWait('denied');
        return false;
      }

      if (!hasShownPreprompt) {
        await AsyncStorage.setItem(HAS_SHOWN_PREPROMPT_KEY, 'true');
        const userConfirmed = await showModalAndWait('preprompt');
        if (!userConfirmed) return false;
        return await requestSystemPermission();
      }

      return await requestSystemPermission();
    } catch (error) {
      console.error('Error ensuring media library permission:', error);
      return false;
    }
  }, [requestSystemPermission, showModalAndWait]);

  const content = useMemo(() => {
    if (variant === 'denied') {
      return {
        icon: 'settings-outline' as const,
        title: 'Доступ к галерее отключён',
        text:
          'Чтобы добавить фото, включите доступ к галерее в настройках устройства. Это нужно только для выбора изображения — мы ничего не публикуем без вашего согласия.',
        primary: 'Открыть настройки',
        secondary: 'Отмена',
      };
    }

    return {
      icon: 'images-outline' as const,
      title: 'Разрешить доступ к галерее?',
      text:
        'Мы используем галерею, чтобы вы могли красиво добавить фото в профиль и в альбом. Сейчас появится системный запрос — нажмите «Разрешить».',
      primary: 'Разрешить',
      secondary: 'Не сейчас',
    };
  }, [variant]);

  const ctxValue = useMemo(
    () => ({ ensureMediaLibraryPermission }),
    [ensureMediaLibraryPermission]
  );

  const handlePrimary = () => {
    if (variant === 'denied') openSystemSettings();
    close(true);
  };

  return (
    <MediaLibraryPermissionContext.Provider value={ctxValue}>
      {children}
      <AppCenterModal
        visible={isVisible}
        onClose={() => close(false)}
        title={content.title}
        dismissOnBackdrop={false}
        showClose={false}
        footer={
          <View style={styles.footer}>
            <AppButton
              title={content.secondary}
              variant="outline"
              onPress={() => close(false)}
            />
            <AppButton title={content.primary} onPress={handlePrimary} />
          </View>
        }
      >
        <View style={styles.iconCircle}>
          <Ionicons name={content.icon} size={28} color={colors.primary} />
        </View>
        <AppText variant="bodySm" style={styles.text}>
          {content.text}
        </AppText>
      </AppCenterModal>
    </MediaLibraryPermissionContext.Provider>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  text: {
    textAlign: 'center',
  },
  footer: {
    gap: spacing.sm,
  },
});
