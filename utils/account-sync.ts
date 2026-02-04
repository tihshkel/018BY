import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { ensureDeviceRegistered, exportAccountData, getDevicesByAccessCode } from './account-transfer';
import {
    getAccountDataFromSupabase,
    getAccountFromSupabase,
    isAccountInSupabase,
    pushAccountDataToSupabase,
} from './supabase-account';
import { uploadProjectImagesBeforeSync } from './supabase-storage';

/**
 * Префиксы данных, которые синхронизируются между устройствами через Supabase
 */
export const SYNC_DATA_PREFIXES = [
  '@user_name',
  '@user_projects',
  '@project_',
  '@reminders',
  '@pregnancy_info',
  '@export_history_',
  '@user_avatar',
  '@access_code',
  '@has_seen_access_code',
  '@has_seen_onboarding',
];

/**
 * Проверяет, существует ли код доступа (валидация)
 * Код считается валидным, если для него зарегистрировано хотя бы одно устройство
 * или если код был зарегистрирован в логах регистраций
 */
export async function validateAccessCode(accessCode: string): Promise<boolean> {
  if (!accessCode || accessCode.length !== 8) {
    return false;
  }

  try {
    // Проверяем, есть ли устройства для этого кода доступа
    const devices = await getDevicesByAccessCode(accessCode);
    
    // Код валиден, если есть хотя бы одно устройство
    // Это означает, что код был использован при регистрации
    if (devices.length > 0) {
      return true;
    }

    // Дополнительная проверка: ищем код в логах регистраций
    // Это нужно для случая, когда пользователь регистрируется на первом устройстве,
    // но еще не входил на других устройствах
    // Примечание: лог файлы хранятся локально на каждом устройстве,
    // поэтому эта проверка работает только на том устройстве, где была регистрация
    try {
      const { getRegistrationLogPath } = await import('./registration-logger');
      const logPath = getRegistrationLogPath();
      
      const fileInfo = await FileSystem.getInfoAsync(logPath);
      if (fileInfo.exists) {
        const logContent = await FileSystem.readAsStringAsync(logPath, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        // Проверяем, есть ли код в логах
        if (logContent.includes(`Код доступа: ${accessCode}`)) {
          return true;
        }
      }
    } catch (logError) {
      // Игнорируем ошибки чтения логов
      console.warn('Could not check registration logs:', logError);
    }

    // Проверка в Supabase: код может быть зарегистрирован на другом устройстве
    const inSupabase = await isAccountInSupabase(accessCode);
    if (inSupabase) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error validating access code:', error);
    return false;
  }
}

/**
 * Синхронизирует данные аккаунта при входе по коду доступа
 * Загружает все данные пользователя с первого устройства, где был создан аккаунт
 */
export async function syncAccountDataOnLogin(accessCode: string): Promise<{
  success: boolean;
  error?: string;
  syncedData?: Record<string, string>;
}> {
  try {
    // Проверяем валидность кода доступа
    const isValid = await validateAccessCode(accessCode);
    if (!isValid) {
      return {
        success: false,
        error: 'INVALID_CODE',
      };
    }

    // Регистрируем устройство (с проверкой лимита в 4 устройства)
    const deviceResult = await ensureDeviceRegistered({
      accessCode,
      maxDevices: 4,
      validityMonths: 100 * 12, // 100 лет для бесконечной сессии
    });

    if (!deviceResult.ok) {
      if (deviceResult.error === 'DEVICE_LIMIT') {
        return {
          success: false,
          error: 'DEVICE_LIMIT',
        };
      }
      return {
        success: false,
        error: 'DEVICE_REGISTRATION_FAILED',
      };
    }

    // Сохраняем код доступа и помечаем аккаунт как активированный
    await AsyncStorage.setItem('@access_code', accessCode);
    await AsyncStorage.setItem('@is_activated', 'true');

    // Загружаем данные из Supabase (имя, проекты, напоминания и т.д.)
    const account = await getAccountFromSupabase(accessCode);
    if (account?.userName) {
      await AsyncStorage.setItem('@user_name', account.userName);
    }

    const cloudData = await getAccountDataFromSupabase(accessCode);
    if (cloudData && Object.keys(cloudData).length > 0) {
      await importAccountData(cloudData);
    }

    const currentData = await exportAccountData({
      allowPrefixes: SYNC_DATA_PREFIXES,
    });

    return {
      success: true,
      syncedData: currentData,
    };
  } catch (error) {
    console.error('Error syncing account data:', error);
    return {
      success: false,
      error: 'SYNC_FAILED',
    };
  }
}

/**
 * Сохраняет данные аккаунта при синхронизации
 */
export async function importAccountData(data: Record<string, string>): Promise<void> {
  try {
    // Сохраняем все данные из синхронизированного объекта
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
      if (key && typeof value === 'string') {
        await AsyncStorage.setItem(key, value);
      }
    }
  } catch (error) {
    console.error('Error importing account data:', error);
    throw error;
  }
}

/**
 * Получает все данные аккаунта для синхронизации
 */
export async function getAccountDataForSync(): Promise<Record<string, string>> {
  return await exportAccountData({
    allowPrefixes: SYNC_DATA_PREFIXES,
  });
}

const SYNC_AFTER_MS = 2500; // через 2.5 сек после последнего изменения — синхронизация в фоне
let syncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Сразу запускает синхронизацию в фоне (не блокирует UI).
 * Вызывать после сохранения уведомлений, проектов и т.д.
 */
export function syncToCloudNow(): void {
  pushAccountDataToCloud()
    .then((res) => {
      if (!res.ok) console.warn('[AccountSync] syncToCloudNow failed:', res.error);
    })
    .catch((e) => console.warn('[AccountSync] syncToCloudNow error:', e));
}

/**
 * Запланировать синхронизацию через несколько секунд после последнего изменения.
 * Дополнительно к syncToCloudNow() и синхронизации при уходе в фон (_layout).
 */
export function scheduleSyncToCloud(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    pushAccountDataToCloud().catch((e) =>
      console.warn('[AccountSync] scheduled sync failed:', e)
    );
  }, SYNC_AFTER_MS);
}

/** Уступка главному потоку — даёт UI обработать касания и анимации */
function yieldToUI(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

export type PushToCloudResult = { ok: boolean; error?: string };

/**
 * Отправляет данные аккаунта в облако Supabase.
 * Возвращает результат, чтобы можно было показать пользователю ошибку.
 */
export async function pushAccountDataToCloud(): Promise<PushToCloudResult> {
  try {
    const accessCode = await AsyncStorage.getItem('@access_code');
    if (!accessCode) return { ok: true };

    const data = await exportAccountData({
      allowPrefixes: SYNC_DATA_PREFIXES,
    });
    await yieldToUI();

    const userName = data['@user_name'] ?? '';
    if (userName) {
      const { saveAccountToSupabase, isSupabaseConfigured } = await import('./supabase-account');
      if (!isSupabaseConfigured()) {
        return { ok: false, error: 'Supabase не настроен. Добавьте EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY в .env и перезапустите приложение.' };
      }
      await saveAccountToSupabase(accessCode, userName);
      await yieldToUI();
    }

    const dataWithPhotos =
      Object.keys(data).length > 0
        ? await uploadProjectImagesBeforeSync(accessCode, data)
        : { ...data };
    await yieldToUI();
    await new Promise((r) => setTimeout(r, 50));
    const result = await pushAccountDataToSupabase(accessCode, dataWithPhotos);
    if (!result.success) {
      return { ok: false, error: result.error ?? 'Ошибка записи в БД' };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

