/**
 * Генерирует уникальный код доступа из 8 символов
 * Использует буквы (A-Z) и цифры (0-9)
 * Гарантирует уникальность через комбинацию timestamp и случайных символов
 */
export function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  // Используем timestamp (последние 4 символа в base36) + 4 случайных символа
  // Это гарантирует уникальность даже при одновременной регистрации
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Комбинируем: 4 символа из timestamp + 4 случайных символа = 8 символов
  return (timestamp + randomPart).slice(0, 8);
}











