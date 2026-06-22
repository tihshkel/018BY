import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldShowOnboarding } from '@/constants/onboardingFlow';
import { ensureDefaultAvatar } from '@/utils/user-avatar';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        await ensureDefaultAvatar();

        const [showOnboarding, userName] = await Promise.all([
          shouldShowOnboarding(),
          AsyncStorage.getItem('@user_name'),
        ]);

        if (showOnboarding) {
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
