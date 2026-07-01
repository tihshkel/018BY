export type FamilyCoverDesign = {
  id: string;
  image: number;
  lastPage: number;
  sku: string;
  title: string;
  pickerDescription: string;
};

export const FAMILY_COVER_DESIGNS: FamilyCoverDesign[] = [
  {
    id: 'family_sdfa1',
    image: require('@/albums/family/first_pages/SDFA1/page_1.png'),
    lastPage: require('@/albums/family/first_pages/SDFA1/page_2.png'),
    sku: 'SDFA1',
    title: 'Семейный альбом',
    pickerDescription: 'Дерево с кроной-сердцем и надпись «Моменты счастья»',
  },
  {
    id: 'family_sdfa2',
    image: require('@/albums/family/first_pages/SDFA2/page_1.png'),
    lastPage: require('@/albums/family/first_pages/SDFA2/page_2.png'),
    sku: 'SDFA2',
    title: 'Семейный альбом',
    pickerDescription: 'Нежные руки и крошечные пинетки на тёмно-синем фоне',
  },
  {
    id: 'family_sdfa3',
    image: require('@/albums/family/first_pages/SDFA3/page_1.png'),
    lastPage: require('@/albums/family/first_pages/SDFA3/page_2.png'),
    sku: 'SDFA3',
    title: 'Семейный альбом',
    pickerDescription: 'Минималистичное love с красным сердечком',
  },
  {
    id: 'family_sdfa4',
    image: require('@/albums/family/first_pages/SDFA4/page_1.png'),
    lastPage: require('@/albums/family/first_pages/SDFA4/page_2.png'),
    sku: 'SDFA4',
    title: 'Семейный альбом',
    pickerDescription: 'Изящный цветочный узор на глубоком синем',
  },
  {
    id: 'family_sdfa5',
    image: require('@/albums/family/first_pages/SDFA5/page_1.png'),
    lastPage: require('@/albums/family/first_pages/SDFA5/page_2.png'),
    sku: 'SDFA5',
    title: 'Семейный альбом',
    pickerDescription: 'Тёплое «Мы» — для вашей общей истории',
  },
  {
    id: 'family_sdfa6',
    image: require('@/albums/family/first_pages/SDFA6/page_1.png'),
    lastPage: require('@/albums/family/first_pages/SDFA6/page_2.png'),
    sku: 'SDFA6',
    title: 'Семейный альбом',
    pickerDescription: 'Каллиграфия «Семья» на текстуре светлого дерева',
  },
  {
    id: 'family_sdfa7',
    image: require('@/albums/family/first_pages/SDFA7/page_1.png'),
    lastPage: require('@/albums/family/first_pages/SDFA7/page_2.png'),
    sku: 'SDFA7',
    title: 'Семейный альбом',
    pickerDescription: '«Мечты сбываются там, где в них верят»',
  },
];

export function getFamilyCoverPickerDescription(design: FamilyCoverDesign): string {
  return design.pickerDescription;
}
