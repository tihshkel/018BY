import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@has_seen_onboarding';
const ACTIVATION_KEY = '@is_activated';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Сброс прогресса пользователя - очистка всех данных
        await AsyncStorage.multiRemove([
          ONBOARDING_KEY,
          ACTIVATION_KEY,
          '@user_name',
          '@user_projects',
          '@activation_code',
          '@user_avatar',
          '@user_access_code',
          '@has_seen_access_code',
        ]);
        console.log('Прогресс пользователя сброшен');
        
        const hasSeenOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
        const isActivated = await AsyncStorage.getItem(ACTIVATION_KEY);
        
        if (!hasSeenOnboarding) {
          router.replace('/onboarding');
        } else if (!isActivated) {
          router.replace('/activation');
        } else {
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.error('Error checking status:', error);
        router.replace('/onboarding');
      }
    };

    checkStatus();
  }, [router]);

  return null;
}

