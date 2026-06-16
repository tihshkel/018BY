import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import {
  getRandomPresetAvatar,
  toPresetAvatarStorageValue,
} from '@/constants/default-avatars';
import { getAccountSyncId } from '@/utils/account-identity';
import { pushAccountDataToCloud, scheduleSyncToCloud } from '@/utils/account-sync';
import { saveAccountToSupabase } from '@/utils/supabase-account';
import { uploadImageToStorage } from '@/utils/supabase-storage';

const USER_AVATAR_KEY = '@user_avatar';
const USER_NAME_KEY = '@user_name';

export async function getStoredUserAvatar(): Promise<string | null> {
  return AsyncStorage.getItem(USER_AVATAR_KEY);
}

/** Назначает случайный встроенный аватар, если пользователь ещё не выбирал свой. */
export async function ensureDefaultAvatar(): Promise<string> {
  const existing = await AsyncStorage.getItem(USER_AVATAR_KEY);
  if (existing?.trim()) {
    return existing;
  }

  const preset = getRandomPresetAvatar();
  const value = toPresetAvatarStorageValue(preset.id);
  await AsyncStorage.setItem(USER_AVATAR_KEY, value);
  scheduleSyncToCloud();
  return value;
}

export async function savePresetUserAvatar(presetId: string): Promise<string> {
  const value = toPresetAvatarStorageValue(presetId);
  await AsyncStorage.setItem(USER_AVATAR_KEY, value);
  await syncAvatarToCloud(value);
  return value;
}

export async function saveUserName(trimmedName: string): Promise<void> {
  const name = trimmedName.trim();
  if (!name) {
    throw new Error('Имя не может быть пустым');
  }

  await AsyncStorage.setItem(USER_NAME_KEY, name);
  scheduleSyncToCloud();

  const code = await getAccountSyncId();
  if (!code) {
    return;
  }

  const avatar = await getStoredUserAvatar();
  const res = await saveAccountToSupabase(code, name, avatar);
  if (!res.success) {
    throw new Error(res.error ?? 'Не удалось сохранить имя в облаке');
  }
}

export async function saveGalleryUserAvatar(sourceUri: string): Promise<string> {
  const code = await getAccountSyncId();
  const name = (await AsyncStorage.getItem(USER_NAME_KEY))?.trim() || 'Пользователь';

  let fileUri: string;
  try {
    const ext = sourceUri.toLowerCase().includes('.png') ? 'png' : 'jpg';
    const persistentPath = `${FileSystem.documentDirectory}user_avatar.${ext}`;
    await FileSystem.copyAsync({ from: sourceUri, to: persistentPath });
    fileUri = persistentPath.startsWith('file://') ? persistentPath : `file://${persistentPath}`;
  } catch {
    fileUri =
      sourceUri.startsWith('file://') || sourceUri.startsWith('/')
        ? sourceUri
        : `file://${sourceUri}`;
  }

  let storedValue = fileUri;

  if (code) {
    let avatarUrl = await uploadImageToStorage(code, 'avatar', fileUri, 0);
    if (!avatarUrl && fileUri !== sourceUri) {
      avatarUrl = await uploadImageToStorage(code, 'avatar', sourceUri, 0);
    }

    if (avatarUrl) {
      storedValue = avatarUrl;
      const res = await saveAccountToSupabase(code, name, avatarUrl);
      if (!res.success) {
        throw new Error(res.error ?? 'Не удалось сохранить аватар в облаке');
      }
    } else {
      await pushAccountDataToCloud();
    }
  } else {
    await pushAccountDataToCloud();
  }

  await AsyncStorage.setItem(USER_AVATAR_KEY, storedValue);
  scheduleSyncToCloud();
  return storedValue;
}

async function syncAvatarToCloud(value: string): Promise<void> {
  const code = await getAccountSyncId();
  const name = (await AsyncStorage.getItem(USER_NAME_KEY))?.trim() || 'Пользователь';

  if (code && value.startsWith('https://')) {
    await saveAccountToSupabase(code, name, value);
  } else {
    await pushAccountDataToCloud();
  }

  scheduleSyncToCloud();
}
