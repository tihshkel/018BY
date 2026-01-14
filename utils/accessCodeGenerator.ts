/**
 * Генерирует персональный код доступа из 8 символов
 * Код состоит из цифр и заглавных букв латинского алфавита
 */
export const generateAccessCode = (): string => {
  const digits = '0123456789';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const characters = digits + letters;
  
  let code = '';
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  
  return code;
};

