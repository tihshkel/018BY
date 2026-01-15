/**
 * Утилита для проверки и использования ключей активации из activation-keys.json
 * Ключи одноразовые - после использования помечаются как used: true
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface ActivationKey {
    id: number;
    code: string;
    used: boolean;
    createdAt: string;
}

// Кэш для ключей активации
let activationKeysCache: ActivationKey[] | null = null;
const CACHE_KEY = '@activation_keys_cache';
const LAST_UPDATE_KEY = '@activation_keys_last_update';

/**
 * Загрузить ключи активации из JSON файла
 */
async function loadActivationKeys(): Promise<ActivationKey[]> {
    try {
        // Пытаемся загрузить из кэша AsyncStorage
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
            activationKeysCache = JSON.parse(cached);
            return activationKeysCache || [];
        }

        // Если кэша нет, загружаем из JSON файла
        // В React Native используем require для статических JSON файлов
        // Пробуем разные пути для импорта JSON файла
        let keys: ActivationKey[] = [];
        try {
            // Пробуем импортировать из корня проекта
            const keysModule = require('../activation-keys.json');
            keys = Array.isArray(keysModule) ? keysModule : keysModule.default || [];
        } catch (requireError) {
            try {
                // Альтернативный путь
                const keysModule = require('../../activation-keys.json');
                keys = Array.isArray(keysModule) ? keysModule : keysModule.default || [];
            } catch (altError) {
                console.error('[ActivationKeyValidator] Failed to load activation-keys.json:', requireError, altError);
                // Возвращаем пустой массив, если файл не найден
                return [];
            }
        }

        // Сохраняем в кэш
        activationKeysCache = keys;
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(keys));
        await AsyncStorage.setItem(LAST_UPDATE_KEY, new Date().toISOString());

        return keys;
    } catch (error) {
        console.error('[ActivationKeyValidator] Error loading activation keys:', error);
        return [];
    }
}

/**
 * Сохранить обновленные ключи в кэш
 */
async function saveActivationKeys(keys: ActivationKey[]): Promise<void> {
    try {
        activationKeysCache = keys;
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(keys));
        await AsyncStorage.setItem(LAST_UPDATE_KEY, new Date().toISOString());
    } catch (error) {
        console.error('[ActivationKeyValidator] Error saving activation keys:', error);
    }
}

/**
 * Проверить и использовать ключ активации
 * @param code - Код активации для проверки
 * @returns true если ключ валиден и был успешно использован, false если ключ невалиден или уже использован
 */
export async function validateAndUseActivationKey(code: string): Promise<{
    valid: boolean;
    message?: string;
}> {
    try {
        if (!code || code.length !== 6) {
            return {
                valid: false,
                message: 'Код должен состоять из 6 символов',
            };
        }

        // Загружаем ключи
        const keys = await loadActivationKeys();

        // Ищем ключ по коду (без учета регистра)
        const normalizedCode = code.toUpperCase();
        const keyIndex = keys.findIndex(
            (k) => k.code.toUpperCase() === normalizedCode
        );

        if (keyIndex === -1) {
            return {
                valid: false,
                message: 'Код активации не найден',
            };
        }

        const key = keys[keyIndex];

        // Проверяем, не использован ли ключ
        if (key.used) {
            return {
                valid: false,
                message: 'Этот код активации уже был использован',
            };
        }

        // Помечаем ключ как использованный
        keys[keyIndex] = {
            ...key,
            used: true,
        };

        // Сохраняем обновленные ключи
        await saveActivationKeys(keys);

        console.log(`[ActivationKeyValidator] Key ${code} successfully validated and marked as used`);

        return {
            valid: true,
        };
    } catch (error) {
        console.error('[ActivationKeyValidator] Error validating key:', error);
        return {
            valid: false,
            message: 'Ошибка при проверке кода активации',
        };
    }
}

/**
 * Проверить ключ без использования (только проверка)
 */
export async function checkActivationKey(code: string): Promise<{
    exists: boolean;
    used: boolean;
}> {
    try {
        if (!code || code.length !== 6) {
            return { exists: false, used: false };
        }

        const keys = await loadActivationKeys();
        const normalizedCode = code.toUpperCase();
        const key = keys.find((k) => k.code.toUpperCase() === normalizedCode);

        if (!key) {
            return { exists: false, used: false };
        }

        return {
            exists: true,
            used: key.used,
        };
    } catch (error) {
        console.error('[ActivationKeyValidator] Error checking key:', error);
        return { exists: false, used: false };
    }
}

/**
 * Очистить кэш ключей (для обновления из файла)
 */
export async function clearActivationKeysCache(): Promise<void> {
    try {
        activationKeysCache = null;
        await AsyncStorage.removeItem(CACHE_KEY);
        await AsyncStorage.removeItem(LAST_UPDATE_KEY);
        console.log('[ActivationKeyValidator] Cache cleared');
    } catch (error) {
        console.error('[ActivationKeyValidator] Error clearing cache:', error);
    }
}
