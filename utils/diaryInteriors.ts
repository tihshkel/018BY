import { Asset } from 'expo-asset';
import type { ImageSourcePropType } from 'react-native';

import { DIARY_BROWN_PAGES, DIARY_PURPLE_PAGES } from '@/utils/diaryInteriorAssets.generated';

export interface DiaryInterior {
  id: string;
  name: string;
  description: string;
  pages: number;
  images: ImageSourcePropType[];
}

/** ASCII paths — иначе Android схлопывает ассеты. */
const DIARY_INTERIOR_MAPPING: Record<string, DiaryInterior> = {
  brown: {
    id: 'diary_interior_brown',
    name: 'Коричневый',
    description: '60 страниц для записи',
    pages: DIARY_BROWN_PAGES.length,
    images: DIARY_BROWN_PAGES,
  },
  purple: {
    id: 'diary_interior_purple',
    name: 'Фиолетовый',
    description: '40 страниц для записи',
    pages: DIARY_PURPLE_PAGES.length,
    images: DIARY_PURPLE_PAGES,
  },
};

export function getAllDiaryInteriors(): DiaryInterior[] {
  return Object.values(DIARY_INTERIOR_MAPPING);
}

export function getDiaryInteriorById(id: string): DiaryInterior | null {
  return Object.values(DIARY_INTERIOR_MAPPING).find((i) => i.id === id) || null;
}

async function warmDiaryInteriorAssets(images: unknown[]): Promise<void> {
  const toWarm = images.slice(0, 6);
  const maxParallel = 2;
  let index = 0;

  const worker = async () => {
    while (index < toWarm.length) {
      const current = index;
      index += 1;
      try {
        await Asset.fromModule(toWarm[current] as number).downloadAsync();
      } catch {
        // bundled URI still usable
      }
    }
  };

  await Promise.all(Array.from({ length: maxParallel }, () => worker()));
}

/**
 * URI внутренних страниц. Прогрев первых страниц — в фоне (не 60/40 сразу).
 */
export async function getDiaryInteriorImageUris(
  interiorId: string,
): Promise<string[] | null> {
  const interior = getDiaryInteriorById(interiorId);
  if (!interior || interior.images.length === 0) {
    return null;
  }

  try {
    const uris = interior.images.map((image) => {
      const asset = Asset.fromModule(image as number);
      return asset.localUri || asset.uri || null;
    });
    warmDiaryInteriorAssets(interior.images).catch(() => {});
    const filtered = uris.filter((uri): uri is string => !!uri);
    return filtered.length > 0 ? filtered : null;
  } catch (error) {
    console.error(
      `[Diary Loader] Ошибка при загрузке изображений внутренней части ${interiorId}:`,
      error,
    );
    return null;
  }
}
