/**
 * Централизованный экспорт всех изображений приложения
 * Используется для предзагрузки и единообразного доступа к изображениям
 */

// Логотипы
export const LogoImages = {
  activation: require('@/assets/images/logo-for-activaty-page.png'),
  purchase: require('@/assets/images/logo-for-activaty-page.png'),
} as const;

// Онбординг
export const OnboardingImages = {
  slide1: require('@/assets/images/onboarding1.jpg'),
  slide2: require('@/assets/images/onboarding2.jpg'),
  slide3: require('@/assets/images/onboarding3.jpg'),
} as const;

// Основные альбомы по категориям (для главного экрана и выбора категорий)
export const CategoryAlbumImages = {
  pregnancy: require('@/assets/images/albums/DB1_0.png'),
  kids: require('@/assets/images/albums/DB2_0.png'),
  family: require('@/assets/images/albums/DB3_0.png'),
  wedding: require('@/assets/images/albums/DB4_0.png'),
  travel: require('@/assets/images/albums/DB5_0.png'),
} as const;

// Альбомы с альтернативными версиями
export const AlbumImages = {
  // Основные DB серии
  DB1_0: require('@/assets/images/albums/DB1_0.png'),
  DB1_п: require('@/assets/images/albums/DB1_п.png'),
  DB2_0: require('@/assets/images/albums/DB2_0.png'),
  DB2_п: require('@/assets/images/albums/DB2_п.png'),
  DB3_0: require('@/assets/images/albums/DB3_0.png'),
  DB3_п: require('@/assets/images/albums/DB3_п.png'),
  DB4_0: require('@/assets/images/albums/DB4_0.png'),
  DB4_п: require('@/assets/images/albums/DB4_п.png'),
  DB5_0: require('@/assets/images/albums/DB5_0.png'),
  DB5_п: require('@/assets/images/albums/DB5_п.png'),
  
  // DFA серии
  DFA5: require('@/assets/images/albums/DFA5.png'),
  DFA7: require('@/assets/images/albums/DFA7.png'),
  DFA8: require('@/assets/images/albums/DFA8.png'),
  DFA9: require('@/assets/images/albums/DFA9.png'),
  DFA14: require('@/assets/images/albums/DFA14.png'),
  DFA15: require('@/assets/images/albums/DFA15.png'),
  DFA16: require('@/assets/images/albums/DFA16.png'),
  DFA19: require('@/assets/images/albums/DFA19.png'),
  DFA21: require('@/assets/images/albums/DFA21.png'),
  DFA23: require('@/assets/images/albums/DFA23.png'),
  DFA24: require('@/assets/images/albums/DFA24.png'),
  DFA25: require('@/assets/images/albums/DFA25.png'),
  DFA26: require('@/assets/images/albums/DFA26.png'),
  DFA27: require('@/assets/images/albums/DFA27.png'),
  DFA28: require('@/assets/images/albums/DFA28.png'),
  DFA29: require('@/assets/images/albums/DFA29.png'),
  DFA31: require('@/assets/images/albums/DFA31.png'),
  DFA46: require('@/assets/images/albums/DFA46.png'),
  DFA47: require('@/assets/images/albums/DFA47.png'),
  DFA50: require('@/assets/images/albums/DFA50.png'),
  DFA52: require('@/assets/images/albums/DFA52.png'),
  DFA53: require('@/assets/images/albums/DFA53.png'),
  DFA57: require('@/assets/images/albums/DFA57.png'),
  DFA59: require('@/assets/images/albums/DFA59.png'),
  DFA60: require('@/assets/images/albums/DFA60.png'),
  DFA71: require('@/assets/images/albums/DFA71.png'),
  DFA72: require('@/assets/images/albums/DFA72.png'),
  DFA74: require('@/assets/images/albums/DFA74.png'),
  DFA207: require('@/assets/images/albums/DFA207.png'),
  DFA208: require('@/assets/images/albums/DFA208.png'),
  DFA300: require('@/assets/images/albums/DFA300.png'),
  DFA301: require('@/assets/images/albums/DFA301.png'),
  DFA302: require('@/assets/images/albums/DFA302.png'),
  DFA304: require('@/assets/images/albums/DFA304.png'),
  DFA305: require('@/assets/images/albums/DFA305.png'),
  DFA306: require('@/assets/images/albums/DFA306.png'),
  DFA307: require('@/assets/images/albums/DFA307.png'),
  DFA308: require('@/assets/images/albums/DFA308.png'),
  'DFA309 (2)': require('@/assets/images/albums/DFA309 (2).png'),
  
  // DD серии (Личные дневники для девочки большой)
  DD1: require('@/assets/images/albums/DD_1.png'),
  DD2: require('@/assets/images/albums/DD_2.png'),
  DD3: require('@/assets/images/albums/DD_3.png'),
  DD4: require('@/assets/images/albums/DD_4.png'),
  DD5: require('@/assets/images/albums/DD_5.png'),
  DD6: require('@/assets/images/albums/DD_6.png'),
  DD7: require('@/assets/images/albums/DD_7.png'),
  DD8: require('@/assets/images/albums/DD_8.png'),
  DD9: require('@/assets/images/albums/DD_9.png'),
  DD10: require('@/assets/images/albums/DD_10.png'),
  DD11: require('@/assets/images/albums/DD_11.png'),
  DD12: require('@/assets/images/albums/DD_12.png'),
  DD13: require('@/assets/images/albums/DD_13.png'),
  DD14: require('@/assets/images/albums/DD_14.png'),
  DD15: require('@/assets/images/albums/DD_15.png'),
  DD16: require('@/assets/images/albums/DD_16.png'),
  DD17: require('@/assets/images/albums/DD_17.png'),
  DD18: require('@/assets/images/albums/DD_18.png'),
  DD20: require('@/assets/images/albums/DD_20.png'),
  DD21: require('@/assets/images/albums/DD_21.png'),
  
  // SVA серии (Фотоальбомы свадебные)
  SVA2W: require('@/assets/images/albums/SVA_2.png'),
  SVA3W: require('@/assets/images/albums/SVA_3.png'),
  SVA5W: require('@/assets/images/albums/SVA_5.png'),
  SVA7W: require('@/assets/images/albums/SVA_7.png'),
  SVA9W: require('@/assets/images/albums/SVA_9.png'),
  
  // Прочие
  розовый: require('@/assets/images/albums/розовый.png'),
  пилот: require('@/assets/images/albums/пилот.png'),
  '2': require('@/assets/images/albums/2.png'),
  '2.3': require('@/assets/images/albums/2.3.png'),
} as const;

/**
 * Массив всех изображений для предзагрузки
 * Используется в утилите предзагрузки
 */
export const allImagesForPreload = [
  // Логотипы
  ...Object.values(LogoImages),
  // Онбординг
  ...Object.values(OnboardingImages),
  // Основные категории (приоритетная загрузка)
  ...Object.values(CategoryAlbumImages),
  // Остальные альбомы (загружаются в фоне)
  ...Object.values(AlbumImages),
] as const;

/**
 * Приоритетные изображения для предзагрузки (критически важные)
 * Загружаются первыми при старте приложения
 */
export const priorityImagesForPreload = [
  ...Object.values(LogoImages),
  ...Object.values(OnboardingImages),
  ...Object.values(CategoryAlbumImages),
] as const;

