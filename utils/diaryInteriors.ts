import { Asset } from 'expo-asset';
import { Image, type ImageSourcePropType } from 'react-native';

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
 * URI внутренних страниц. Всегда полный массив 60/40 — без отбрасывания null,
 * иначе список страниц на Android обрывается. Прогрев первых страниц — в фоне.
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
      const moduleId = image as number;
      // Sync resolve — надёжнее Asset.uri до downloadAsync (на Android часть uri бывает пустой).
      const resolved = Image.resolveAssetSource(moduleId);
      if (resolved?.uri) return resolved.uri;
      const asset = Asset.fromModule(moduleId);
      return asset.localUri || asset.uri || null;
    });
    warmDiaryInteriorAssets(interior.images).catch(() => {});
    const filtered = uris.filter((uri): uri is string => !!uri);
    if (filtered.length !== interior.images.length) {
      console.warn(
        `[Diary Loader] ${interiorId}: got ${filtered.length}/${interior.images.length} page URIs`,
      );
    }
    // Не отдаём урезанный список — иначе buildInitialPageInstances создаст неполный альбом.
    if (filtered.length === interior.images.length) {
      return filtered;
    }
    if (filtered.length === 0) return null;
    // Добираем недостающие через Asset (редко), не блокируя UI на всех 60 сразу в happy-path.
    const repaired: string[] = [];
    for (let i = 0; i < interior.images.length; i += 1) {
      if (uris[i]) {
        repaired.push(uris[i] as string);
        continue;
      }
      try {
        const asset = Asset.fromModule(interior.images[i] as number);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        if (uri) repaired.push(uri);
      } catch {
        // skip
      }
    }
    return repaired.length > 0 ? repaired : null;
  } catch (error) {
    console.error(
      `[Diary Loader] Ошибка при загрузке изображений внутренней части ${interiorId}:`,
      error,
    );
    return null;
  }
}
