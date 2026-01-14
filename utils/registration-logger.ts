import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const REGISTRATION_LOG_FILE = `${FileSystem.documentDirectory}user_registrations.txt`;

/**
 * Записывает данные регистрации пользователя (имя и код доступа) в текстовый файл
 * для использования технической поддержкой
 */
export async function logUserRegistration(params: { userName: string; accessCode: string }) {
  try {
    const { userName, accessCode } = params;
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] Имя: ${userName}, Код доступа: ${accessCode}\n`;

    // Проверяем, существует ли файл
    const fileInfo = await FileSystem.getInfoAsync(REGISTRATION_LOG_FILE);
    
    if (fileInfo.exists) {
      // Читаем существующий файл и добавляем новую запись в конец
      const existingContent = await FileSystem.readAsStringAsync(REGISTRATION_LOG_FILE, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const newContent = existingContent + logEntry;
      await FileSystem.writeAsStringAsync(REGISTRATION_LOG_FILE, newContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } else {
      // Создаем новый файл с заголовком
      const header = '=== ЛОГ РЕГИСТРАЦИЙ ПОЛЬЗОВАТЕЛЕЙ ===\n';
      const content = header + logEntry;
      await FileSystem.writeAsStringAsync(REGISTRATION_LOG_FILE, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }

    console.log('Registration logged successfully');
  } catch (error) {
    console.error('Error logging user registration:', error);
    // Не прерываем процесс регистрации, если не удалось записать в файл
  }
}

/**
 * Получает путь к файлу с логами регистраций
 */
export function getRegistrationLogPath(): string {
  return REGISTRATION_LOG_FILE;
}

