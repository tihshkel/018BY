import { AvatarPickerSheet } from '@/components/avatar-picker-sheet';
import { HomeActionRow } from '@/components/home/home-action-row';
import { HomeSectionHeader } from '@/components/home/home-section-header';
import { ProfileNameEditSheet } from '@/components/profile-name-edit-sheet';
import { ProfileSubscriptionStatusBadge } from '@/components/profile-subscription-status-badge';
import { AppCard, AppHeader, AppScreen, AppText } from '@/components/ui';
import { getAndroidPlayStoreUrl, getIosAppStoreUrl } from '@/constants/app-store';
import { colors, spacing, surfaces } from '@/constants/design-tokens';
import { resolveAvatarImageSource } from '@/constants/default-avatars';
import { useExportSubscription } from '@/contexts/export-subscription-context';
import { signOutFromAccount } from '@/utils/auth-session';
import {
  ensureDefaultAvatar,
  saveGalleryUserAvatar,
  savePresetUserAvatar,
  saveUserName,
} from '@/utils/user-avatar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  action?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

const APP_MENU_ITEMS: MenuItem[] = [
  {
    id: 'projects',
    title: 'Мои проекты',
    subtitle: 'Все альбомы и черновики',
    icon: 'book-outline',
    route: '/(tabs)/projects',
  },
  {
    id: 'gifts',
    title: 'Каталог',
    subtitle: 'Бумажные альбомы на Wildberries',
    icon: 'gift-outline',
    route: '/gifts',
  },
  {
    id: 'export-history',
    title: 'История экспорта',
    subtitle: 'PDF для печати',
    icon: 'document-text-outline',
    route: '/export-history',
  },
  {
    id: 'reminders',
    title: 'Напоминания',
    subtitle: 'События и важные даты',
    icon: 'notifications-outline',
    route: '/reminders-list',
  },
];

const SUPPORT_MENU_ITEMS: MenuItem[] = [
  {
    id: 'help',
    title: 'Помощь',
    subtitle: 'FAQ и поддержка',
    icon: 'help-circle-outline',
    route: '/help',
  },
  {
    id: 'rate',
    title: 'Оценить приложение',
    subtitle: 'Оставить отзыв в магазине',
    icon: 'star-outline',
    action: undefined,
  },
];

export default function ProfileScreen() {
  const [userName, setUserName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isAvatarPickerVisible, setIsAvatarPickerVisible] = useState(false);
  const [isNameEditVisible, setIsNameEditVisible] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const opacity = useSharedValue(0);
  const isInitialMount = useRef(true);
  const {
    isSubscribed,
    isLoading: isSubscriptionLoading,
    isIapEnabled,
    refresh,
  } = useExportSubscription();

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    loadUserData();
    isInitialMount.current = false;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isInitialMount.current) {
        loadUserData();
      }
      if (isIapEnabled) {
        refresh();
      }
    }, [isIapEnabled, refresh])
  );

  const loadUserData = async () => {
    try {
      const avatar = await ensureDefaultAvatar();
      const results = await AsyncStorage.multiGet(['@user_name', '@user_avatar']);
      const dataMap = new Map(results);
      const name = dataMap.get('@user_name');
      const storedAvatar = dataMap.get('@user_avatar') ?? avatar;
      setUserName(name?.trim() || '');
      if (storedAvatar) setAvatarUri(storedAvatar);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleAvatarPress = () => {
    setIsAvatarPickerVisible(true);
  };

  const handleSaveName = async (nextName: string) => {
    setIsSavingName(true);
    try {
      await saveUserName(nextName);
      setUserName(nextName);
      setIsNameEditVisible(false);
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error saving user name:', error);
      Alert.alert(
        'Ошибка',
        error instanceof Error ? error.message : 'Не удалось сохранить имя'
      );
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSelectPresetAvatar = async (presetId: string) => {
    if (isSavingAvatar) return;

    setIsSavingAvatar(true);
    try {
      const stored = await savePresetUserAvatar(presetId);
      setAvatarUri(stored);
      setIsAvatarPickerVisible(false);
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      }
    } catch (error) {
      console.error('Error saving preset avatar:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить аватар');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handlePickAvatarFromGallery = async () => {
    if (isSavingAvatar) return;

    const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Доступ к галерее',
        'Для загрузки фото профиля необходимо разрешить доступ к галерее. Пожалуйста, разрешите доступ в настройках приложения.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Настройки',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    setIsSavingAvatar(true);
    try {
      const stored = await saveGalleryUserAvatar(result.assets[0].uri);
      setAvatarUri(stored);
      setIsAvatarPickerVisible(false);
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error saving avatar:', error);
      Alert.alert(
        'Ошибка',
        error instanceof Error ? error.message : 'Не удалось сохранить фото профиля'
      );
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleRateApp = async () => {
    const iosHttps = getIosAppStoreUrl(false);
    const iosItms = getIosAppStoreUrl(true);

    try {
      if (Platform.OS === 'ios') {
        const canOpenItms = await Linking.canOpenURL(iosItms);
        await Linking.openURL(canOpenItms ? iosItms : iosHttps);
        return;
      }
      if (Platform.OS === 'android') {
        await Linking.openURL(getAndroidPlayStoreUrl());
      }
    } catch {
      if (Platform.OS === 'ios') {
        Linking.openURL(iosHttps).catch(() => {});
      }
    }
  };

  const handleMenuPress = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route as never);
    } else if (item.action) {
      item.action();
    }
  };

  const handleOpenExportSubscription = () => {
    router.push('/export-subscription');
  };

  const navigateAfterSignOut = (target: 'login' | 'register') => {
    router.replace(target === 'register' ? '/register' : '/login');
  };

  const completeSignOut = async (target: 'login' | 'register') => {
    const result = await signOutFromAccount();
    if (!result.success) {
      Alert.alert('Ошибка', result.error ?? 'Не удалось выйти из аккаунта');
      return;
    }
    setUserName('');
    setAvatarUri(null);
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    navigateAfterSignOut(target);
  };

  const handleLogout = () => {
    Alert.alert(
      'Выйти из аккаунта',
      'Вы выйдете из текущего аккаунта. Локальные проекты на этом устройстве будут удалены. Куда перейти дальше?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Войти',
          onPress: () => {
            void completeSignOut('login');
          },
        },
        {
          text: 'Регистрация',
          onPress: () => {
            void completeSignOut('register');
          },
        },
      ]
    );
  };

  const supportItems: MenuItem[] = SUPPORT_MENU_ITEMS.map((item) =>
    item.id === 'rate' ? { ...item, action: handleRateApp } : item
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const avatarSource = resolveAvatarImageSource(avatarUri);
  const subscriptionHint = isSubscribed
    ? 'PDF для печати доступен навсегда'
    : 'Разблокируйте экспорт для печати';

  const renderMenuCard = (items: MenuItem[]) => (
    <AppCard style={styles.menuCard}>
      {items.map((item, index) => (
        <HomeActionRow
          key={item.id}
          testID={`profile-menu-${item.id}`}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          onPress={() => handleMenuPress(item)}
          destructive={item.destructive}
          showChevron={item.showChevron ?? true}
          showDivider={index < items.length - 1}
        />
      ))}
    </AppCard>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <AppHeader title="Профиль" showBack={false} />

        <AppScreen
          scroll
          tabletShell
          contentMaxWidth={640}
          edges={[]}
          style={styles.screen}
          contentContainerStyle={styles.scrollContent}
        >
          <AppCard style={styles.profileCard}>
            <Pressable
              testID="profile-avatar-button"
              onPress={handleAvatarPress}
              style={({ pressed }) => [styles.avatarButton, pressed && styles.avatarPressed]}
              accessibilityRole="button"
              accessibilityLabel="Изменить фото профиля"
            >
              {avatarSource ? (
                <ExpoImage
                  source={avatarSource}
                  style={styles.avatar}
                  priority="high"
                  cachePolicy="disk"
                  transition={0}
                  fadeDuration={0}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person-outline" size={36} color={colors.primary} />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={14} color={colors.white} />
              </View>
            </Pressable>

            <AppText variant="display" style={styles.userName} testID="profile-user-name">
              {userName || 'Пользователь'}
            </AppText>

            <Pressable
              testID="profile-edit-name"
              onPress={() => setIsNameEditVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Изменить имя"
              style={({ pressed }) => [styles.editNameButton, pressed && styles.editNamePressed]}
            >
              <Ionicons name="pencil-outline" size={14} color={colors.primary} />
              <AppText variant="bodySm" style={styles.editNameText}>
                Изменить имя
              </AppText>
            </Pressable>

            <View testID="profile-subscription-badge">
              <ProfileSubscriptionStatusBadge
                isPremium={isSubscribed}
                isLoading={isIapEnabled && isSubscriptionLoading}
                onPress={handleOpenExportSubscription}
              />
            </View>

            <AppText variant="bodySm" style={styles.subscriptionHint}>
              {subscriptionHint}
            </AppText>
          </AppCard>

          <View style={styles.section}>
            <HomeSectionHeader title="Приложение" />
            {renderMenuCard(APP_MENU_ITEMS)}
          </View>

          <View style={styles.section}>
            <HomeSectionHeader title="Поддержка" />
            {renderMenuCard(supportItems)}
          </View>

          <View style={styles.section}>
            <HomeSectionHeader title="Аккаунт" />
            <AppCard style={styles.menuCard}>
              <HomeActionRow
                testID="profile-logout"
                icon="log-out-outline"
                title="Выйти из аккаунта"
                onPress={handleLogout}
                destructive
                showChevron={false}
                showDivider={false}
              />
            </AppCard>
          </View>
        </AppScreen>
      </Animated.View>

      <ProfileNameEditSheet
        visible={isNameEditVisible}
        initialName={userName || ''}
        onClose={() => setIsNameEditVisible(false)}
        onSave={handleSaveName}
        isSaving={isSavingName}
      />

      <AvatarPickerSheet
        visible={isAvatarPickerVisible}
        currentAvatar={avatarUri}
        onClose={() => setIsAvatarPickerVisible(false)}
        onSelectPreset={handleSelectPresetAvatar}
        onPickFromGallery={handlePickAvatarFromGallery}
        isSaving={isSavingAvatar}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.muted,
  },
  content: {
    flex: 1,
  },
  screen: {
    backgroundColor: surfaces.muted,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 112,
    gap: spacing.lg,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  avatarButton: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  avatarPressed: {
    opacity: 0.9,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  userName: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  editNameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editNamePressed: {
    opacity: 0.7,
  },
  editNameText: {
    color: colors.primary,
    fontWeight: '600',
  },
  subscriptionHint: {
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  menuCard: {
    backgroundColor: colors.white,
  },
});
