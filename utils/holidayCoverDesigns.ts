/**
 * Дизайны обложки для раздела «Праздники и события» (albums/holiday).
 * Используется только первая страница из PDF. Внутренние страницы полностью пустые (белые).
 */
export const HOLIDAY_COVER_DESIGNS = [
  // В EAS Build папка `albums/` исключена, поэтому не подгружаем локальные картинки из неё.
  // Для сборки используем гарантированную заглушку.
  { id: 'holiday_dfa34', image: require('@/assets/images/albums/blank_white.png'), sku: 'DFA34', title: 'Альбом дней рождения от 0 до 18' },
  { id: 'holiday_dfa35', image: require('@/assets/images/albums/blank_white.png'), sku: 'DFA35', title: 'Альбом дней рождения от 0 до 18' },
  { id: 'holiday_dfa61', image: require('@/assets/images/albums/blank_white.png'), sku: 'DFA61', title: 'Наш Новый год' },
  { id: 'holiday_dfa62', image: require('@/assets/images/albums/blank_white.png'), sku: 'DFA62', title: 'Наш Новый год' },
  { id: 'holiday_gost1', image: require('@/assets/images/albums/blank_white.png'), sku: 'GOST1', title: 'Книга пожеланий' },
  { id: 'holiday_gost2', image: require('@/assets/images/albums/blank_white.png'), sku: 'GOST2', title: 'Книга пожеланий' },
] as const;
