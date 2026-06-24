import type { ImageSourcePropType } from 'react-native';

export type WeddingCoverDesign = {
  id: string;
  sku: string;
  title: string;
  link: string;
  image: ImageSourcePropType;
  firstPage: ImageSourcePropType;
  lastPage: ImageSourcePropType;
  hardCoverPdfPath: string;
  format: '18x24' | '21x21';
};

export const WEDDING_COVER_DESIGNS: WeddingCoverDesign[] = [
  {
    id: 'wedding_sa1',
    sku: 'SA1',
    title: 'Фотоальбом свадебный 21×21 см',
    link: 'https://www.wildberries.ru/catalog/212037885/detail.aspx',
    image: require('@/albums/love/SA/SA1/first_page.png'),
    firstPage: require('@/albums/love/SA/SA1/first_page.png'),
    lastPage: require('@/albums/love/SA/SA1/last_page.png'),
    hardCoverPdfPath: 'albums/love/SA/SA1_твердый переплет.pdf',
    format: '21x21',
  },
  {
    id: 'wedding_sa2',
    sku: 'SA2',
    title: 'Фотоальбом свадебный 21×21 см',
    link: 'https://www.wildberries.ru/catalog/212042532/detail.aspx',
    image: require('@/albums/love/SA/SA2/first_page.png'),
    firstPage: require('@/albums/love/SA/SA2/first_page.png'),
    lastPage: require('@/albums/love/SA/SA2/last_page.png'),
    hardCoverPdfPath: 'albums/love/SA/SA2_твердый переплет.pdf',
    format: '21x21',
  },
  {
    id: 'wedding_sa3',
    sku: 'SA3',
    title: 'Фотоальбом свадебный 21×21 см',
    link: 'https://www.wildberries.ru/catalog/212043356/detail.aspx',
    image: require('@/albums/love/SA/SA3/first_page.png'),
    firstPage: require('@/albums/love/SA/SA3/first_page.png'),
    lastPage: require('@/albums/love/SA/SA3/last_page.png'),
    hardCoverPdfPath: 'albums/love/SA/SA3_твердый переплет.pdf',
    format: '21x21',
  },
  {
    id: 'wedding_sa4',
    sku: 'SA4',
    title: 'Фотоальбом свадебный 21×21 см',
    link: 'https://www.wildberries.ru/catalog/212044677/detail.aspx',
    image: require('@/albums/love/SA/SA4/first_page.png'),
    firstPage: require('@/albums/love/SA/SA4/first_page.png'),
    lastPage: require('@/albums/love/SA/SA4/last_page.png'),
    hardCoverPdfPath: 'albums/love/SA/SA4_твердый переплет.pdf',
    format: '21x21',
  },
  {
    id: 'wedding_sa5',
    sku: 'SA5',
    title: 'Фотоальбом свадебный 21×21 см',
    link: 'https://www.wildberries.ru/catalog/212104557/detail.aspx',
    image: require('@/albums/love/SA/SA5/first_page.png'),
    firstPage: require('@/albums/love/SA/SA5/first_page.png'),
    lastPage: require('@/albums/love/SA/SA5/last_page.png'),
    hardCoverPdfPath: 'albums/love/SA/SA5_твердый переплет.pdf',
    format: '21x21',
  },
  {
    id: 'wedding_sva2w',
    sku: 'SVA2W',
    title: 'Фотоальбом свадебный 18×24 см',
    link: 'https://www.wildberries.ru/catalog/176756901/detail.aspx',
    image: require('@/albums/love/SVA/SVA2/first_page.png'),
    firstPage: require('@/albums/love/SVA/SVA2/first_page.png'),
    lastPage: require('@/albums/love/SVA/SVA2/last_page.png'),
    hardCoverPdfPath: 'albums/love/SVA/SVA2_твердый переплет.pdf',
    format: '18x24',
  },
  {
    id: 'wedding_sva3w',
    sku: 'SVA3W',
    title: 'Фотоальбом свадебный 18×24 см',
    link: 'https://www.wildberries.ru/catalog/176757216/detail.aspx',
    image: require('@/albums/love/SVA/SVA3/first_page.png'),
    firstPage: require('@/albums/love/SVA/SVA3/first_page.png'),
    lastPage: require('@/albums/love/SVA/SVA3/last_page.png'),
    hardCoverPdfPath: 'albums/love/SVA/SVA3_твердый переплет.pdf',
    format: '18x24',
  },
  {
    id: 'wedding_sva5w',
    sku: 'SVA5W',
    title: 'Фотоальбом свадебный 18×24 см',
    link: 'https://www.wildberries.ru/catalog/176933757/detail.aspx',
    image: require('@/albums/love/SVA/SVA5/first_page.png'),
    firstPage: require('@/albums/love/SVA/SVA5/first_page.png'),
    lastPage: require('@/albums/love/SVA/SVA5/last_page.png'),
    hardCoverPdfPath: 'albums/love/SVA/SVA5_твердый переплет.pdf',
    format: '18x24',
  },
  {
    id: 'wedding_sva7w',
    sku: 'SVA7W',
    title: 'Фотоальбом свадебный 18×24 см',
    link: 'https://www.wildberries.ru/catalog/176757494/detail.aspx',
    image: require('@/albums/love/SVA/SVA7/first_page.png'),
    firstPage: require('@/albums/love/SVA/SVA7/first_page.png'),
    lastPage: require('@/albums/love/SVA/SVA7/last_page.png'),
    hardCoverPdfPath: 'albums/love/SVA/SVA7_твердый переплет.pdf',
    format: '18x24',
  },
  {
    id: 'wedding_sva9w',
    sku: 'SVA9W',
    title: 'Фотоальбом свадебный 18×24 см',
    link: 'https://www.wildberries.ru/catalog/176933371/detail.aspx',
    image: require('@/albums/love/SVA/SVA9/first_page.png'),
    firstPage: require('@/albums/love/SVA/SVA9/first_page.png'),
    lastPage: require('@/albums/love/SVA/SVA9/last_page.png'),
    hardCoverPdfPath: 'albums/love/SVA/SVA9_твердый переплет.pdf',
    format: '18x24',
  },
];

export function getWeddingCoverFormatLabel(format: WeddingCoverDesign['format']): string {
  return format === '21x21' ? '21×21 см' : '18×24 см';
}

/** Короткое имя для списка обложек: без размера, с кодом дизайна. */
export function getWeddingCoverPickerTitle(design: WeddingCoverDesign): string {
  const code = design.sku.replace(/W$/i, '');
  return `Свадебный альбом ${code}`;
}

export function getWeddingCoverById(id?: string | null): WeddingCoverDesign | null {
  if (!id) return null;
  return WEDDING_COVER_DESIGNS.find((design) => design.id === id) ?? null;
}

export function getWeddingCoverBySku(sku?: string | null): WeddingCoverDesign | null {
  if (!sku) return null;
  return WEDDING_COVER_DESIGNS.find((design) => design.sku === sku) ?? null;
}
