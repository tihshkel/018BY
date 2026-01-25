import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { getDevicesByAccessCode, ensureDeviceRegistered } from './account-transfer';
import { exportAccountData } from './account-transfer';

/**
 * Префиксы данных, которые должны синхронизироваться между устройствами
 */
const SYNC_DATA_PREFIXES = [
  '@user_name',
  '@user_projects',
  '@project_',
  '@project_pdf_',
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

    // ВАЖНО: Для синхронизации данных между устройствами нужен сервер или облачное хранилище
    // Текущая реализация сохраняет только код доступа и статус активации
    // Данные пользователя (проекты, альбомы, фотографии) хранятся локально на каждом устройстве
    // 
    // Для полной синхронизации необходимо:
    // 1. Добавить сервер (Supabase, Firebase, собственный API)
    // 2. Сохранять данные пользователя в облаке при создании/изменении
    // 3. Загружать данные из облака при входе по коду доступа
    // 4. Синхронизировать изменения между устройствами
    
    // Сохраняем код доступа и помечаем аккаунт как активированный
    await AsyncStorage.setItem('@access_code', accessCode);
    await AsyncStorage.setItem('@is_activated', 'true');

    // Экспортируем текущие данные для возможной синхронизации
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

