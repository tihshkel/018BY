import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@has_seen_onboarding';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [hasSeenOnboarding, userName] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_KEY),
          AsyncStorage.getItem('@user_name'),
        ]);

        if (hasSeenOnboarding !== 'true') {
          router.replace('/onboarding');
          return;
        }
        if (!userName || !userName.trim()) {
          router.replace('/login');
          return;
        }
        router.replace('/(tabs)');
      } catch (error) {
        console.error('Error checking status:', error);
        router.replace('/onboarding');
      }
    };

    checkStatus();
  }, [router]);

  return null;
}
