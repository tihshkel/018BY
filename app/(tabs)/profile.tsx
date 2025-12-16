import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
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
  const opacity = useSharedValue(0);

  useEffect(() => {
    loadUserData();
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem('@user_name');
      const avatar = await AsyncStorage.getItem('@user_avatar');
      const activated = await AsyncStorage.getItem('@is_activated');
      
      if (name) setUserName(name);
      if (avatar) setAvatarUri(avatar);
      if (activated !== 'true') {
        setAccessStatus('Ограниченный доступ');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleAvatarPress = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Доступ к галерее запрещён');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
