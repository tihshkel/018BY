import { Asset } from 'expo-asset';
import type { ImageSourcePropType } from 'react-native';

const PLACEHOLDER_IMAGE = require('@/assets/images/albums/blank_white.png');

/**
 * Интерфейс для обложки дневника
 */
export interface DiaryCover {
  id: string;
  sku: string; // SKU для поиска в каталоге (DD1, DD2, ..., DD21)
  image: ImageSourcePropType;
  imageSpring: ImageSourcePropType | null; // Вариант с пружиной
  name: string;
}

/**
 * Интерфейс для внутренней части дневника
 */
export interface DiaryInterior {
  id: string;
  name: string;
  description: string;
  pages: number;
  images: ImageSourcePropType[];
}

/**
 * Извлекает SKU из названия файла обложки
 * @param filename - Название файла (например, 'DD_1.png', 'DD_21_пружина.png')
 * @returns SKU (например, 'DD1', 'DD21')
 */
export function extractSkuFromFilename(filename: string): string | null {
  // Ищем паттерн DD_число или DD_число_пружина
  const match = filename.match(/DD_(\d+)/i);
  if (match) {
    const number = match[1];
    return `DD${number}`;
  }
  return null;
}

/**
 * Статический маппинг обложек дневников
 * Ключ: SKU (DD1, DD2, ..., DD21)
 */
const DIARY_COVERS_MAPPING: Record<string, DiaryCover> = {
  DD1: {
    id: 'diary_dd1',
    sku: 'DD1',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD2: {
    id: 'diary_dd2',
    sku: 'DD2',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD3: {
    id: 'diary_dd3',
    sku: 'DD3',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD4: {
    id: 'diary_dd4',
    sku: 'DD4',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD5: {
    id: 'diary_dd5',
    sku: 'DD5',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD6: {
    id: 'diary_dd6',
    sku: 'DD6',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD7: {
    id: 'diary_dd7',
    sku: 'DD7',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD8: {
    id: 'diary_dd8',
    sku: 'DD8',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD9: {
    id: 'diary_dd9',
    sku: 'DD9',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD10: {
    id: 'diary_dd10',
    sku: 'DD10',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD11: {
    id: 'diary_dd11',
    sku: 'DD11',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD12: {
    id: 'diary_dd12',
    sku: 'DD12',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD13: {
    id: 'diary_dd13',
    sku: 'DD13',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD14: {
    id: 'diary_dd14',
    sku: 'DD14',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD15: {
    id: 'diary_dd15',
    sku: 'DD15',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD16: {
    id: 'diary_dd16',
    sku: 'DD16',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD17: {
    id: 'diary_dd17',
    sku: 'DD17',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD18: {
    id: 'diary_dd18',
    sku: 'DD18',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD20: {
    id: 'diary_dd20',
    sku: 'DD20',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
  DD21: {
    id: 'diary_dd21',
    sku: 'DD21',
    image: PLACEHOLDER_IMAGE,
    imageSpring: PLACEHOLDER_IMAGE,
    name: 'Личный дневник',
  },
};

/**
 * Получает все обложки дневников
 */
export function getAllDiaryCovers(): DiaryCover[] {
  return Object.values(DIARY_COVERS_MAPPING);
}

/**
 * Получает обложку дневника по SKU
 */
export function getDiaryCoverBySku(sku: string): DiaryCover | null {
  return DIARY_COVERS_MAPPING[sku] || null;
}

/**
 * Получает обложку дневника по ID
 */
export function getDiaryCoverById(id: string): DiaryCover | null {
  return Object.values(DIARY_COVERS_MAPPING).find(cover => cover.id === id) || null;
}

// В EAS Build не тащим тяжёлые папки `albums/**`. Для сборки используем заглушки.
const brownBlockImages = Array.from({ length: 60 }, () => PLACEHOLDER_IMAGE);

const purpleBlockImages = Array.from({ length: 40 }, () => PLACEHOLDER_IMAGE);

/**
 * Статический маппинг внутренних частей дневников
 * Коричневый блок (60 страниц) и фиолетовый блок (40 страниц)
 */
const DIARY_INTERIOR_MAPPING: Record<string, DiaryInterior> = {
  brown: {
    id: 'diary_interior_brown',
    name: 'Коричневый',
    description: '60 страниц для записи',
    pages: brownBlockImages.length,
    images: brownBlockImages,
  },
  purple: {
    id: 'diary_interior_purple',
    name: 'Фиолетовый',
    description: '40 страниц для записи',
    pages: purpleBlockImages.length,
    images: purpleBlockImages,
  },
};

/**
 * Получает все внутренние части дневников
 */
export function getAllDiaryInteriors(): DiaryInterior[] {
  return Object.values(DIARY_INTERIOR_MAPPING);
}

/**
 * Получает внутреннюю часть дневника по ID
 */
export function getDiaryInteriorById(id: string): DiaryInterior | null {
  return Object.values(DIARY_INTERIOR_MAPPING).find(interior => interior.id === id) || null;
}

/**
 * Загружает URI изображений внутренней части дневника
 * Оптимизировано для максимально быстрой параллельной загрузки
 */
export async function getDiaryInteriorImageUris(interiorId: string): Promise<string[] | null> {
  const interior = getDiaryInteriorById(interiorId);
  if (!interior || interior.images.length === 0) {
    return null;
  }

  try {
    // Все слоты могут ссылаться на один и тот же require (заглушка в production).
    // Параллельный downloadAsync по одному модулю даёт гонки; достаточно одной загрузки.
    const firstModule = interior.images[0];
    const asset = Asset.fromModule(firstModule as any);
    await asset.downloadAsync();
    const uri = asset.localUri || asset.uri;
    if (!uri) {
      return null;
    }
    const pageCount = interior.pages > 0 ? interior.pages : interior.images.length;
    // Каждая страница — отдельный элемент массива (порядок = номер страницы), URI может совпадать.
    return Array.from({ length: pageCount }, () => uri);
  } catch (error) {
    console.error(`[Diary Loader] Ошибка при загрузке изображений внутренней части ${interiorId}:`, error);
    return null;
  }
}
