/**
 * Скрипт для сброса всех кодов активации
 * Запускается через: npx ts-node scripts/reset-activation-keys.ts
 * 
 * ВАЖНО: Этот скрипт работает только в Node.js окружении.
 * Для сброса кэша в приложении используйте функцию resetAllActivationKeys() из utils/activationKeyValidator.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ACTIVATION_KEYS_FILE = path.join(__dirname, '../activation-keys.json');

async function resetActivationKeys() {
    try {
        console.log('Загрузка файла activation-keys.json...');
        
        // Проверяем существование файла
        if (!fs.existsSync(ACTIVATION_KEYS_FILE)) {
            console.error('Файл activation-keys.json не найден!');
            process.exit(1);
        }

        // Читаем файл
        const fileContent = fs.readFileSync(ACTIVATION_KEYS_FILE, 'utf-8');
        const keys = JSON.parse(fileContent);

        if (!Array.isArray(keys)) {
            console.error('Файл activation-keys.json должен содержать массив ключей!');
            process.exit(1);
        }

        console.log(`Найдено ${keys.length} кодов активации`);

        // Сбрасываем все коды на used: false
        let resetCount = 0;
        const resetKeys = keys.map((key: any) => {
            if (key.used === true) {
                resetCount++;
            }
            return {
                ...key,
                used: false,
            };
        });

        // Сохраняем обновленный файл
        fs.writeFileSync(ACTIVATION_KEYS_FILE, JSON.stringify(resetKeys, null, 2), 'utf-8');

        console.log(`✅ Сброшено ${resetCount} использованных кодов`);
        console.log(`✅ Все ${resetKeys.length} кодов теперь действительны`);
        console.log('\n⚠️  ВАЖНО: Также нужно очистить кэш в приложении!');
        console.log('   Используйте функцию resetAllActivationKeys() из utils/activationKeyValidator.ts');
        console.log('   или очистите AsyncStorage в приложении.');
    } catch (error) {
        console.error('Ошибка при сбросе кодов активации:', error);
        process.exit(1);
    }
}

resetActivationKeys();

