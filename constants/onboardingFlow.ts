import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Онбординг считается пройденным, если в AsyncStorage лежит `@onboarding_flow_version`
 * с тем же значением, что и ONBOARDING_FLOW_VERSION.
 *
 * Очистка папки проекта или `expo start -c` это НЕ сбрасывает — хранилище привязано к установке
 * приложения на устройстве/симуляторе. Чтобы снова увидеть 3 экрана:
 * • удалите приложение с устройства или сбросьте данные приложения;
 * • или увеличьте ONBOARDING_FLOW_VERSION ниже (один раз покажется новый онбординг у всех);
 * • в разработке: EXPO_PUBLIC_ALWAYS_SHOW_ONBOARDING=1 в .env (каждый запуск с онбординга).
 */
export const ONBOARDING_FLOW_VERSION = 2;

const VERSION_KEY = '@onboarding_flow_version';
const LEGACY_KEY = '@has_seen_onboarding';

export async function shouldShowOnboarding(): Promise<boolean> {
  if (__DEV__ && process.env.EXPO_PUBLIC_ALWAYS_SHOW_ONBOARDING === '1') {
    return true;
  }
  const v = await AsyncStorage.getItem(VERSION_KEY);
  if (v === String(ONBOARDING_FLOW_VERSION)) return false;
  return true;
}

export async function markOnboardingFlowCompleted(): Promise<void> {
  await AsyncStorage.multiSet([
    [VERSION_KEY, String(ONBOARDING_FLOW_VERSION)],
    [LEGACY_KEY, 'true'],
  ]);
}
