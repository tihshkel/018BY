/**
 * Дизайны обложки для раздела «Праздники и события» (albums/holiday).
 * Используется только первая страница из PDF. Внутренние страницы полностью пустые (белые).
 */
export type HolidayCoverDesign = {
  id: string;
  image: number;
  lastPage: number;
  sku: string;
  title: string;
  pickerDescription: string;
};

export const HOLIDAY_COVER_DESIGNS: HolidayCoverDesign[] = [
  {
    id: 'holiday_dfa34',
    image: require('@/albums/holiday/first_pages/DFA34.png'),
    lastPage: require('@/albums/holiday/DFA34/last_page.png'),
    sku: 'DFA34',
    title: 'Альбом дней рождения от 0 до 18',
    pickerDescription: 'Нежные гирлянды и звёздочки для каждого дня рождения',
  },
  {
    id: 'holiday_dfa35',
    image: require('@/albums/holiday/first_pages/DFA35.png'),
    lastPage: require('@/albums/holiday/DFA35/last_page.png'),
    sku: 'DFA35',
    title: 'Альбом дней рождения от 0 до 18',
    pickerDescription: 'Яркие конфетти, шарики и праздничное настроение',
  },
  {
    id: 'holiday_dfa61',
    image: require('@/albums/holiday/first_pages/DFA61.png'),
    lastPage: require('@/albums/holiday/DFA61/last_page.png'),
    sku: 'DFA61',
    title: 'Наш Новый год',
    pickerDescription: 'Ёлка с лесными зверятами и подарками',
  },
  {
    id: 'holiday_dfa62',
    image: require('@/albums/holiday/first_pages/DFA62.png'),
    lastPage: require('@/albums/holiday/DFA62/last_page.png'),
    sku: 'DFA62',
    title: 'Наш Новый год',
    pickerDescription: 'Уютный домик в зимнем сиянии и снегу',
  },
  {
    id: 'holiday_gost1',
    image: require('@/albums/holiday/first_pages/GOST1.png'),
    lastPage: require('@/albums/holiday/GOST1/last_page.png'),
    sku: 'GOST1',
    title: 'Книга пожеланий',
    pickerDescription: 'Облачка и звёзды для тёплых слов гостей',
  },
  {
    id: 'holiday_gost2',
    image: require('@/albums/holiday/first_pages/GOST2.png'),
    lastPage: require('@/albums/holiday/GOST2/last_page.png'),
    sku: 'GOST2',
    title: 'Книга пожеланий',
    pickerDescription: 'Золотые листья и акварель для пожеланий',
  },
];

export function getHolidayCoverPickerDescription(design: HolidayCoverDesign): string {
  return design.pickerDescription;
}
