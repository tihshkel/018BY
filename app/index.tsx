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
        const [
          hasSeenOnboarding,
          isActivated,
          accessCode,
          userName,
          activationCode,
        ] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_KEY),
          AsyncStorage.getItem(ACTIVATION_KEY),
          AsyncStorage.getItem('@access_code'),
          AsyncStorage.getItem('@user_name'),
          AsyncStorage.getItem('@activation_code'),
        ]);

        if (isActivated === 'true' && accessCode) {
          await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
          router.replace('/(tabs)');
        } else if (isActivated === 'true' && activationCode && !userName) {
          await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
          router.replace('/name-input');
        } else if (hasSeenOnboarding !== 'true') {
          router.replace('/onboarding');
        } else if (isActivated !== 'true') {
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

