import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import { getAndroidPlayStoreUrl, getIosAppStoreUrl } from '@/constants/app-store';
import { ProfileSubscriptionStatusBadge } from '@/components/profile-subscription-status-badge';
import { useExportSubscription } from '@/contexts/export-subscription-context';
import { getAccountSyncId } from '@/utils/account-identity';
import { pushAccountDataToCloud, scheduleSyncToCloud } from '@/utils/account-sync';
import { signOutFromAccount } from '@/utils/auth-session';
import { saveAccountToSupabase } from '@/utils/supabase-account';
import { uploadImageToStorage } from '@/utils/supabase-storage';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
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
  icon: string;
  route?: string;
  action?: () => void;
}


export default function ProfileScreen() {
  const [userName, setUserName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const opacity = useSharedValue(0);
  const isInitialMount = useRef(true);
  const {
    isSubscribed,
    isLoading: isSubscriptionLoading,
    isIapEnabled,
    refresh,
  } = useExportSubscription();

  useEffect(() => {
    // Запускаем анимацию сразу, не дожидаясь загрузки данных
    opacity.value = withTiming(1, { duration: 400 });
    loadUserData();
    isInitialMount.current = false;
  }, []);

  // Обновляем данные при возврате на вкладку профиля
  useFocusEffect(
    useCallback(() => {
      // Загружаем данные только если это не первое монтирование
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
      // Используем multiGet для оптимизации - один запрос вместо четырех
      const results = await AsyncStorage.multiGet(['@user_name', '@user_avatar']);
      const dataMap = new Map(results);
      const name = dataMap.get('@user_name');
      const avatar = dataMap.get('@user_avatar');
      if (name) setUserName(name);
      if (avatar) setAvatarUri(avatar);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleAvatarPress = async () => {
    // Проверяем текущий статус разрешения
    const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    
    let finalStatus = existingStatus;
    
    // Если разрешение не предоставлено, запрашиваем его
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

    if (!result.canceled) {
      const sourceUri = result.assets[0].uri;
      setAvatarUri(sourceUri);
      try {
        const code = await getAccountSyncId();
        const name = userName || (await AsyncStorage.getItem('@user_name')) || '';

        let fileUri: string;
        try {
          const ext = sourceUri.toLowerCase().includes('.png') ? 'png' : 'jpg';
          const persistentPath = `${FileSystem.documentDirectory}user_avatar.${ext}`;
          await FileSystem.copyAsync({ from: sourceUri, to: persistentPath });
          fileUri = persistentPath.startsWith('file://') ? persistentPath : `file://${persistentPath}`;
        } catch {
          fileUri = sourceUri.startsWith('file://') || sourceUri.startsWith('/') ? sourceUri : `file://${sourceUri}`;
        }

        if (code) {
          let avatarUrl = await uploadImageToStorage(code, 'avatar', fileUri, 0);
          if (!avatarUrl && fileUri !== sourceUri) {
            avatarUrl = await uploadImageToStorage(code, 'avatar', sourceUri, 0);
          }
          if (avatarUrl) {
            await AsyncStorage.setItem('@user_avatar', avatarUrl);
            setAvatarUri(avatarUrl);
            const res = await saveAccountToSupabase(code, name, avatarUrl);
            if (!res.success) {
              Alert.alert('Ошибка', res.error ?? 'Не удалось сохранить аватар в облаке');
            } else {
              scheduleSyncToCloud();
            }
          } else {
            await AsyncStorage.setItem('@user_avatar', fileUri);
            await pushAccountDataToCloud();
            scheduleSyncToCloud();
          }
        } else {
          await AsyncStorage.setItem('@user_avatar', fileUri);
          await pushAccountDataToCloud();
          scheduleSyncToCloud();
        }
      } catch (error) {
        console.error('Error saving avatar:', error);
        await AsyncStorage.setItem('@user_avatar', sourceUri);
      await pushAccountDataToCloud();
      }
    }
  };

  const handleMenuPress = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route as any);
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

  const menuItems: MenuItem[] = [
    {
      id: 'projects',
      title: 'Мои проекты',
      icon: 'book-outline',
      route: '/(tabs)/projects',
    },
    {
      id: 'gifts',
      title: 'Каталог',
      icon: 'gift-outline',
      route: '/gifts',
    },
    {
      id: 'export-history',
      title: 'История экспорта',
      icon: 'document-text-outline',
      route: '/export-history',
    },
    {
      id: 'reminders',
      title: 'Напоминания',
      icon: 'notifications-outline',
      route: '/reminders-list',
    },
    {
      id: 'help',
      title: 'Помощь',
      icon: 'help-circle-outline',
      route: '/help',
    },
    {
      id: 'rate',
      title: 'Оценить приложение',
      icon: 'star-outline',
      action: handleRateApp,
    },
    {
      id: 'logout',
      title: 'Выйти из аккаунта',
      icon: 'log-out-outline',
      action: handleLogout,
    },
  ];

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Профиль */}
          <View style={styles.profileSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleAvatarPress}
              activeOpacity={0.8}
            >
              {avatarUri ? (
                <ExpoImage 
                  source={{ uri: avatarUri }} 
                  style={styles.avatar}
                  priority="high"
                  cachePolicy="disk"
                  transition={0}
                  fadeDuration={0}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person-outline" size={40} color={colors.primary} />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.userName}>{userName || 'Пользователь'}</Text>

            <ProfileSubscriptionStatusBadge
              isPremium={isSubscribed}
              isLoading={isIapEnabled && isSubscriptionLoading}
              onPress={handleOpenExportSubscription}
            />
          </View>

          {/* Меню */}
          <View style={styles.menuSection}>
            {menuItems.map((item) => {
              const isLogout = item.id === 'logout';
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.menuItem, isLogout && styles.menuItemLogout]}
                  onPress={() => handleMenuPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, isLogout && styles.menuIconLogout]}>
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color={isLogout ? colors.error : colors.primary}
                    />
                  </View>
                  <Text style={[styles.menuText, isLogout && styles.menuTextLogout]}>
                    {item.title}
                  </Text>
                  {!isLogout && (
                    <Ionicons name="chevron-forward" size={20} color={colors.tabInactive} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 112,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 24,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.border,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  userName: {
    fontSize: 26,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  menuSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
  },
  menuItemLogout: {
    marginBottom: 0,
    borderColor: '#F5E0E0',
    backgroundColor: '#FFFBFB',
  },
  menuIconLogout: {
    backgroundColor: '#FFF5F5',
  },
  menuTextLogout: {
    color: colors.error,
  },
});
