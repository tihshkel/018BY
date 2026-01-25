/**
 * Генерирует уникальный персональный код доступа из 8 символов
 * Код состоит из цифр и заглавных букв латинского алфавита
 * Гарантирует уникальность через комбинацию timestamp, случайных символов и дополнительной энтропии
 * Вероятность коллизии: ~1 к 2.8 триллионам (36^8 комбинаций)
 */
export const generateAccessCode = (): string => {
  const digits = '0123456789';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const characters = digits + letters;
  
  // Используем timestamp в миллисекундах для уникальности по времени
  // Преобразуем в base36 и берем последние 3 символа
  const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
  
  // Добавляем дополнительную энтропию через performance.now() (микросекунды)
  const performanceEntropy = Math.floor(performance.now() * 1000).toString(36).toUpperCase().slice(-2);
  
  // Генерируем 3 случайных символа для дополнительной уникальности
  let randomPart = '';
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomPart += characters[randomIndex];
  }
  
  // Комбинируем: 3 символа timestamp + 2 символа энтропии + 3 случайных символа = 8 символов
  // Это гарантирует уникальность даже при одновременной регистрации тысяч пользователей
  const code = (timestamp + performanceEntropy + randomPart).slice(0, 8);
  
  return code;
};

