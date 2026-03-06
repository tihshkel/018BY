import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

const PUSH_TOKEN_KEY = '@push_token';

export async function getAndStorePushToken(): Promise<string | null> {
  if (isExpoGo) {
    console.log('[PushToken] Skipping in Expo Go');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushToken] Permission not granted');
      return null;
    }

    const token = await Notifications.getDevicePushTokenAsync();
    const tokenString = typeof token === 'string' ? token : token.data;

    if (tokenString) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, tokenString);
      console.log('[PushToken] Stored:', tokenString.substring(0, 20) + '...');
      return tokenString;
    }

    return null;
  } catch (error) {
    console.log('[PushToken] Error:', error);
    return null;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearPushToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch {}
}
