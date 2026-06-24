import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { ensureDefaultAvatar } from '@/utils/user-avatar';

const ONBOARDING_KEY = '@has_seen_onboarding';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        await ensureDefaultAvatar();

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
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    };

    void checkStatus();
  }, [router]);

  return null;
}
