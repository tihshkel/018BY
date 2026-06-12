import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

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

  const overlayOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.96);
  const cardTranslateY = useSharedValue(10);

  const pendingResolveRef = useRef<((value: boolean) => void) | null>(null);

  const animateIn = useCallback(() => {
    overlayOpacity.value = 0;
    cardOpacity.value = 0;
    cardScale.value = 0.96;
    cardTranslateY.value = 10;

    overlayOpacity.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });
    const contentDelayMs = 60;
    cardOpacity.value = withDelay(
      contentDelayMs,
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) })
    );
    cardScale.value = withDelay(
      contentDelayMs,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    );
    cardTranslateY.value = withDelay(
      contentDelayMs,
      withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) })
    );
  }, [overlayOpacity, cardOpacity, cardScale, cardTranslateY]);

  const close = useCallback((result: boolean) => {
    setIsVisible(false);
    const resolve = pendingResolveRef.current;
    pendingResolveRef.current = null;
    // resolve на следующем тике — Modal успевает скрыться до launchImageLibraryAsync
    if (resolve) {
      requestAnimationFrame(() => resolve(result));
    }
  }, []);

  const showModalAndWait = useCallback(
    async (nextVariant: PermissionModalVariant) => {
      if (pendingResolveRef.current) return false;

      setVariant(nextVariant);
      setIsVisible(true);
      animateIn();

      return await new Promise<boolean>((resolve) => {
        pendingResolveRef.current = resolve;
      });
    },
    [animateIn]
  );

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

      // Если доступ запрещён и нельзя спросить снова — сразу предлагаем настройки
      if (!current.canAskAgain) {
        await showModalAndWait('denied');
        return false;
      }

      // Первый раз — показываем красивое фирменное окно-пояснение, затем системный запрос
      if (!hasShownPreprompt) {
        await AsyncStorage.setItem(HAS_SHOWN_PREPROMPT_KEY, 'true');
        const userConfirmed = await showModalAndWait('preprompt');
        if (!userConfirmed) return false;
        return await requestSystemPermission();
      }

      // Дальше — без фирменного окна, сразу системный запрос
      return await requestSystemPermission();
    } catch (error) {
      console.error('Error ensuring media library permission:', error);
      return false;
    }
  }, [requestSystemPermission, showModalAndWait]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }, { scale: cardScale.value }],
  }));

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

  return (
    <MediaLibraryPermissionContext.Provider value={ctxValue}>
      {children}
      {isVisible ? (
      <Modal visible animationType="none" transparent onRequestClose={() => close(false)}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Animated.View style={[styles.card, cardStyle]}>
            <View style={styles.iconCircle}>
              <Ionicons name={content.icon} size={30} color={colors.primary} />
            </View>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.text}>{content.text}</Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => close(false)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={content.secondary}
              >
                <Text style={styles.buttonSecondaryText}>{content.secondary}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={() => {
                  if (variant === 'denied') openSystemSettings();
                  close(true);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={content.primary}
              >
                <Text style={styles.buttonPrimaryText}>{content.primary}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
      ) : null}
    </MediaLibraryPermissionContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(139, 111, 95, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
    alignItems: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  text: {
    fontSize: 14.5,
    color: colors.textPrimary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 18,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.border,
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  buttonSecondaryText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
});











