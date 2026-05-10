import AsyncStorage from '@react-native-async-storage/async-storage';
import { createId } from '@/utils/id';

/** Ключ AsyncStorage: UUID пользователя Supabase Auth (совпадает с `profiles.id`). */
export const ACCOUNT_SYNC_ID_KEY = '@account_sync_id';

/** Старый ключ; читается только для локальных данных прошлых сборок (облако с ним не синхронизируется). */
const LEGACY_ACCESS_CODE_KEY = '@access_code';

/**
 * Идентификатор для облака: сохранённый UUID сессии или legacy-строка из старого ключа.
 */
export async function getAccountSyncId(): Promise<string | null> {
  const primary = await AsyncStorage.getItem(ACCOUNT_SYNC_ID_KEY);
  if (primary) return primary;
  return AsyncStorage.getItem(LEGACY_ACCESS_CODE_KEY);
}

export async function setAccountSyncId(id: string): Promise<void> {
  await AsyncStorage.setItem(ACCOUNT_SYNC_ID_KEY, id);
}

/** Создаёт id при первом запуске после ввода имени. */
export async function createAndStoreAccountSyncId(): Promise<string> {
  const id = createId('acc');
  await setAccountSyncId(id);
  return id;
}
