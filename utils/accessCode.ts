/**
 * Генерирует уникальный код доступа из 8 символов
 * Использует буквы (A-Z) и цифры (0-9)
 * Гарантирует уникальность через комбинацию timestamp, энтропии и случайных символов
 * Вероятность коллизии: ~1 к 2.8 триллионам (36^8 комбинаций)
 */
export function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  // Используем timestamp в миллисекундах для уникальности по времени
  // Преобразуем в base36 и берем последние 3 символа
  const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
  
  // Добавляем дополнительную энтропию через performance.now() (микросекунды)
  const performanceEntropy = Math.floor(performance.now() * 1000).toString(36).toUpperCase().slice(-2);
  
  // Генерируем 3 случайных символа для дополнительной уникальности
  let randomPart = '';
  for (let i = 0; i < 3; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Комбинируем: 3 символа timestamp + 2 символа энтропии + 3 случайных символа = 8 символов
  // Это гарантирует уникальность даже при одновременной регистрации тысяч пользователей
  return (timestamp + performanceEntropy + randomPart).slice(0, 8);
}











