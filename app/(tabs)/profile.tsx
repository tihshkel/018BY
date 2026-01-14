import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
  Clipboard,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useFocusEffect } from 'expo-router';

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
  const [accessStatus, setAccessStatus] = useState('Полный доступ активирован');
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const opacity = useSharedValue(0);

  useEffect(() => {
    loadUserData();
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  // Обновляем данные при возврате на вкладку профиля
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem('@user_name');
      const avatar = await AsyncStorage.getItem('@user_avatar');
      const activated = await AsyncStorage.getItem('@is_activated');
      const storedAccessCode = await AsyncStorage.getItem('@access_code');
      
      if (name) setUserName(name);
      if (avatar) setAvatarUri(avatar);
      if (activated !== 'true') {
        setAccessStatus('Ограниченный доступ');
      }
      setAccessCode(storedAccessCode || null);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleCopyAccessCode = () => {
    if (!accessCode) return;
    try {
      Clipboard.setString(accessCode);
      Alert.alert('Скопировано', 'Код доступа скопирован в буфер обмена');
    } catch (error) {
      console.error('Error copying access code:', error);
      Alert.alert('Ошибка', 'Не удалось скопировать код доступа');
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
      mediaTypes: ImagePicker.MediaType?.Images ? [ImagePicker.MediaType.Images] : undefined,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
      try {
        await AsyncStorage.setItem('@user_avatar', result.assets[0].uri);
      } catch (error) {
        console.error('Error saving avatar:', error);
      }
    }
  };

  const handleMenuPress = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route);
    } else if (item.action) {
      item.action();
    }
  };

  const handleRateApp = () => {
    const url = Platform.select({
      ios: 'https://apps.apple.com/app/id123456789',
      android: 'https://play.google.com/store/apps/details?id=com.yourapp',
    });
    if (url) {
      Linking.openURL(url);
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
                <Image 
                  source={{ uri: avatarUri }} 
                  style={styles.avatar}
                  priority="high"
                  cachePolicy="disk"
                  transition={0}
                  fadeDuration={0}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person-outline" size={40} color="#C9A89A" />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.userName}>{userName || 'Пользователь'}</Text>
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#C9A89A" />
              <Text style={styles.statusText}>{accessStatus}</Text>
            </View>

            {!!accessCode && (
              <View style={styles.accessCodeSection}>
                <Text style={styles.accessCodeLabel}>Код доступа</Text>
                <TouchableOpacity
                  style={styles.accessCodeField}
                  onPress={handleCopyAccessCode}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Скопировать код доступа"
                >
                  <Text style={styles.accessCodeText}>{accessCode}</Text>
                  <Ionicons name="copy-outline" size={18} color="#8B6F5F" />
                </TouchableOpacity>
                <Text style={styles.accessCodeHint}>Нажмите, чтобы скопировать</Text>
              </View>
            )}
          </View>

          {/* Меню */}
          <View style={styles.menuSection}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleMenuPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon as any} size={24} color="#C9A89A" />
                </View>
                <Text style={styles.menuText}>{item.title}</Text>
                <Ionicons name="chevron-forward" size={20} color="#D4C4B5" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 24,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F0EB',
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
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F0E8E0',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C9A89A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FAF8F5',
  },
  userName: {
    fontSize: 26,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAF8F5',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  statusText: {
    fontSize: 14,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
  },
  accessCodeSection: {
    width: '100%',
    marginTop: 18,
    alignItems: 'center',
  },
  accessCodeLabel: {
    fontSize: 13,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
    marginBottom: 8,
  },
  accessCodeField: {
    width: '100%',
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  accessCodeText: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  accessCodeHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
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
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
  },
});
