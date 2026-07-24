import { DIARY_BROWN_PAGES, DIARY_PURPLE_PAGES } from '@/utils/diaryInteriorAssets.generated';

export interface DiaryInterior {
  id: string;
  name: string;
  description: string;
  pages: number;
  images: (typeof DIARY_BROWN_PAGES)[number][];
}

/** ASCII paths — иначе Android схлопывает ассеты. */
const DIARY_INTERIOR_MAPPING: Record<string, DiaryInterior> = {
  brown: {
    id: 'diary_interior_brown',
    name: 'Коричневый',
    description: '60 страниц для записи',
    pages: DIARY_BROWN_PAGES.length,
    images: [...DIARY_BROWN_PAGES],
  },
  purple: {
    id: 'diary_interior_purple',
    name: 'Фиолетовый',
    description: '40 страниц для записи',
    pages: DIARY_PURPLE_PAGES.length,
    images: [...DIARY_PURPLE_PAGES],
  },
};

export function getAllDiaryInteriors(): DiaryInterior[] {
  return Object.values(DIARY_INTERIOR_MAPPING);
}

export function getDiaryInteriorById(id: string): DiaryInterior | null {
  return Object.values(DIARY_INTERIOR_MAPPING).find((i) => i.id === id) || null;
}

/**
 * URI внутренних страниц. Sync resolve сразу (быстрый open), прогрев — в фоне.
 */
export async function getDiaryInteriorImageUris(
  interiorId: string,
): Promise<string[] | null> {
  const interior = getDiaryInteriorById(interiorId);
  if (!interior || interior.images.length === 0) {
    return null;
  }

  try {
    const {
      resolveAllDiaryInteriorPageUrisSync,
      resolveAllDiaryInteriorPageUris,
    } = await import('@/utils/diaryPageImages');
    const sync = resolveAllDiaryInteriorPageUrisSync(interiorId);
    if (sync.length === interior.images.length) {
      resolveAllDiaryInteriorPageUris(interiorId).catch(() => {});
      return sync;
    }
    const asyncUris = await resolveAllDiaryInteriorPageUris(interiorId);
    return asyncUris.length > 0 ? asyncUris : null;
  } catch (error) {
    console.error(
      `[Diary Loader] Ошибка при загрузке изображений внутренней части ${interiorId}:`,
      error,
    );
    return null;
  }
}
