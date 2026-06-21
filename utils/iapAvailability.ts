import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const isExpoGo = Constants.executionEnvironment === 'storeClient';

/**
 * IAP на корневом уровне: только iOS (StoreKit при старте).
 * Android подключает billing лениво через ExportSubscriptionAndroidGate.
 */
export function shouldMountNativeIapAtRoot(): boolean {
  return Platform.OS === 'ios';
}
