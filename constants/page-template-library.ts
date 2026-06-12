import type { PageTemplateLibraryItem } from '@/types/album-page-schema';

export const PAGE_TEMPLATE_LIBRARY: PageTemplateLibraryItem[] = [
  {
    id: '1_photo_caption',
    title: '1 фото + подпись',
    description: 'Одно большое фото с короткой подписью',
    pageType: 'photo',
    photoSlots: 1,
    hasCaption: true,
    hasTextBlock: false,
  },
  {
    id: '2_photos',
    title: '2 фото',
    description: 'Два фото с подписями',
    pageType: 'photo',
    photoSlots: 2,
    hasCaption: true,
    hasTextBlock: false,
  },
  {
    id: '4_photos',
    title: '4 фото',
    description: 'Коллаж из четырёх фото',
    pageType: 'photo',
    photoSlots: 4,
    hasCaption: false,
    hasTextBlock: false,
  },
  {
    id: 'photo_note',
    title: 'Фото + заметка',
    description: 'Фото и текстовая заметка',
    pageType: 'free',
    photoSlots: 1,
    hasCaption: false,
    hasTextBlock: true,
  },
  {
    id: 'note_only',
    title: 'Заметка без фото',
    description: 'Только текстовая заметка',
    pageType: 'free',
    photoSlots: 0,
    hasCaption: false,
    hasTextBlock: true,
  },
  {
    id: 'memory',
    title: 'Страница воспоминаний',
    description: 'Фото и воспоминание',
    pageType: 'free',
    photoSlots: 1,
    hasCaption: true,
    hasTextBlock: true,
  },
  {
    id: 'event',
    title: 'Страница события',
    description: 'Событие с фото и описанием',
    pageType: 'free',
    photoSlots: 2,
    hasCaption: true,
    hasTextBlock: true,
  },
  {
    id: 'month',
    title: 'Страница месяца',
    description: 'Фото за месяц',
    pageType: 'photo',
    photoSlots: 4,
    hasCaption: true,
    hasTextBlock: false,
  },
  {
    id: 'holiday',
    title: 'Страница праздника',
    description: 'Праздничные фото и заметка',
    pageType: 'free',
    photoSlots: 2,
    hasCaption: true,
    hasTextBlock: true,
  },
];

export function getPageTemplateById(id: string): PageTemplateLibraryItem | undefined {
  return PAGE_TEMPLATE_LIBRARY.find((item) => item.id === id);
}
