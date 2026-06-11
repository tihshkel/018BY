/**
 * Дизайны обложки для раздела «Праздники и события» (albums/holiday).
 * Используется только первая страница из PDF. Внутренние страницы полностью пустые (белые).
 */
export const HOLIDAY_COVER_DESIGNS = [
  // Превью = картинки из `albums/holiday/first_pages/*.png`
  {
    id: 'holiday_dfa34',
    image: require('@/albums/holiday/first_pages/DFA34.png'),
    lastPage: require('@/albums/holiday/DFA34/last_page.png'),
    sku: 'DFA34',
    title: 'Альбом дней рождения от 0 до 18',
  },
  {
    id: 'holiday_dfa35',
    image: require('@/albums/holiday/first_pages/DFA35.png'),
    lastPage: require('@/albums/holiday/DFA35/last_page.png'),
    sku: 'DFA35',
    title: 'Альбом дней рождения от 0 до 18',
  },
  {
    id: 'holiday_dfa61',
    image: require('@/albums/holiday/first_pages/DFA61.png'),
    lastPage: require('@/albums/holiday/DFA61/last_page.png'),
    sku: 'DFA61',
    title: 'Наш Новый год',
  },
  {
    id: 'holiday_dfa62',
    image: require('@/albums/holiday/first_pages/DFA62.png'),
    lastPage: require('@/albums/holiday/DFA62/last_page.png'),
    sku: 'DFA62',
    title: 'Наш Новый год',
  },
  {
    id: 'holiday_gost1',
    image: require('@/albums/holiday/first_pages/GOST1.png'),
    lastPage: require('@/albums/holiday/GOST1/last_page.png'),
    sku: 'GOST1',
    title: 'Книга пожеланий',
  },
  {
    id: 'holiday_gost2',
    image: require('@/albums/holiday/first_pages/GOST2.png'),
    lastPage: require('@/albums/holiday/GOST2/last_page.png'),
    sku: 'GOST2',
    title: 'Книга пожеланий',
  },
] as const;
