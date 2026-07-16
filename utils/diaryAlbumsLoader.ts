import { Asset } from 'expo-asset';
import type { ImageSourcePropType } from 'react-native';
import { DIARY_BROWN_PAGES, DIARY_PURPLE_PAGES } from '@/utils/diaryInteriorAssets.generated';
import { resolveAllDiaryInteriorPageUris } from '@/utils/diaryPageImages';

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
    image: require('@/albums/diary/DD1/first_page.png'),
    imageSpring: require('@/albums/diary/DD1/first_page.png'),
    name: 'Личный дневник',
  },
  DD2: {
    id: 'diary_dd2',
    sku: 'DD2',
    image: require('@/albums/diary/DD2/first_page.png'),
    imageSpring: require('@/albums/diary/DD2/first_page.png'),
    name: 'Личный дневник',
  },
  DD3: {
    id: 'diary_dd3',
    sku: 'DD3',
    image: require('@/albums/diary/DD3/first_page.png'),
    imageSpring: require('@/albums/diary/DD3/first_page.png'),
    name: 'Личный дневник',
  },
  DD4: {
    id: 'diary_dd4',
    sku: 'DD4',
    image: require('@/albums/diary/DD4/first_page.png'),
    imageSpring: require('@/albums/diary/DD4/first_page.png'),
    name: 'Личный дневник',
  },
  DD5: {
    id: 'diary_dd5',
    sku: 'DD5',
    image: require('@/albums/diary/DD5/first_page.png'),
    imageSpring: require('@/albums/diary/DD5/first_page.png'),
    name: 'Личный дневник',
  },
  DD6: {
    id: 'diary_dd6',
    sku: 'DD6',
    image: require('@/albums/diary/DD6/first_page.png'),
    imageSpring: require('@/albums/diary/DD6/first_page.png'),
    name: 'Личный дневник',
  },
  DD7: {
    id: 'diary_dd7',
    sku: 'DD7',
    image: require('@/albums/diary/DD7/first_page.png'),
    imageSpring: require('@/albums/diary/DD7/first_page.png'),
    name: 'Личный дневник',
  },
  DD8: {
    id: 'diary_dd8',
    sku: 'DD8',
    image: require('@/albums/diary/DD8/first_page.png'),
    imageSpring: require('@/albums/diary/DD8/first_page.png'),
    name: 'Личный дневник',
  },
  DD9: {
    id: 'diary_dd9',
    sku: 'DD9',
    image: require('@/albums/diary/DD9/first_page.png'),
    imageSpring: require('@/albums/diary/DD9/first_page.png'),
    name: 'Личный дневник',
  },
  DD10: {
    id: 'diary_dd10',
    sku: 'DD10',
    image: require('@/albums/diary/DD10/first_page.png'),
    imageSpring: require('@/albums/diary/DD10/first_page.png'),
    name: 'Личный дневник',
  },
  DD11: {
    id: 'diary_dd11',
    sku: 'DD11',
    image: require('@/albums/diary/DD11/first_page.png'),
    imageSpring: require('@/albums/diary/DD11/first_page.png'),
    name: 'Личный дневник',
  },
  DD12: {
    id: 'diary_dd12',
    sku: 'DD12',
    image: require('@/albums/diary/DD12/first_page.png'),
    imageSpring: require('@/albums/diary/DD12/first_page.png'),
    name: 'Личный дневник',
  },
  DD13: {
    id: 'diary_dd13',
    sku: 'DD13',
    image: require('@/albums/diary/DD13/first_page.png'),
    imageSpring: require('@/albums/diary/DD13/first_page.png'),
    name: 'Личный дневник',
  },
  DD14: {
    id: 'diary_dd14',
    sku: 'DD14',
    image: require('@/albums/diary/DD14/first_page.png'),
    imageSpring: require('@/albums/diary/DD14/first_page.png'),
    name: 'Личный дневник',
  },
  DD15: {
    id: 'diary_dd15',
    sku: 'DD15',
    image: require('@/albums/diary/DD15/first_page.png'),
    imageSpring: require('@/albums/diary/DD15/first_page.png'),
    name: 'Личный дневник',
  },
  DD16: {
    id: 'diary_dd16',
    sku: 'DD16',
    image: require('@/albums/diary/DD16/first_page.png'),
    imageSpring: require('@/albums/diary/DD16/first_page.png'),
    name: 'Личный дневник',
  },
  DD17: {
    id: 'diary_dd17',
    sku: 'DD17',
    image: require('@/albums/diary/DD17/first_page.png'),
    imageSpring: require('@/albums/diary/DD17/first_page.png'),
    name: 'Личный дневник',
  },
  DD18: {
    id: 'diary_dd18',
    sku: 'DD18',
    image: require('@/albums/diary/DD18/first_page.png'),
    imageSpring: require('@/albums/diary/DD18/first_page.png'),
    name: 'Личный дневник',
  },
  DD20: {
    id: 'diary_dd20',
    sku: 'DD20',
    image: require('@/albums/diary/DD20/first_page.png'),
    imageSpring: require('@/albums/diary/DD20/first_page.png'),
    name: 'Личный дневник',
  },
  DD21: {
    id: 'diary_dd21',
    sku: 'DD21',
    image: require('@/albums/diary/DD21/first_page.png'),
    imageSpring: require('@/albums/diary/DD21/first_page.png'),
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

/** Страницы блоков: albums/diary/cover/in album/Блок коричневый|фиолетовый _180х240_print */
const brownBlockImages = DIARY_BROWN_PAGES;
const purpleBlockImages = DIARY_PURPLE_PAGES;

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

async function warmDiaryInteriorAssets(images: unknown[]): Promise<void> {
  const maxParallel = 4;
  let index = 0;

  const worker = async () => {
    while (index < images.length) {
      const current = index;
      index += 1;
      try {
        await Asset.fromModule(images[current] as number).downloadAsync();
      } catch {
        // The returned bundled URI is still usable; warming is best-effort.
      }
    }
  };

  await Promise.all(Array.from({ length: maxParallel }, () => worker()));
}

/**
 * Загружает URI изображений внутренней части дневника.
 * Использует Image.resolveAssetSource + Asset.downloadAsync (см. diaryPageImages).
 * Длина массива всегда = числу страниц макета (без filter, без сдвига индексов).
 */
export async function getDiaryInteriorImageUris(interiorId: string): Promise<string[] | null> {
  const interior = getDiaryInteriorById(interiorId);
  if (!interior || interior.images.length === 0) {
    return null;
  }

  try {
    const uris = await resolveAllDiaryInteriorPageUris(interiorId);
    warmDiaryInteriorAssets(interior.images).catch(() => {});

    const missing = uris.filter((uri) => !uri).length;
    if (missing > 0) {
      console.warn(
        `[Diary Loader] ${interiorId}: нет URI у ${missing}/${uris.length} страниц`,
      );
    }
    if (uris.every((uri) => !uri)) {
      return null;
    }
    return uris;
  } catch (error) {
    console.error(`[Diary Loader] Ошибка при загрузке изображений внутренней части ${interiorId}:`, error);
    return null;
  }
}
