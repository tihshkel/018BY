import type { ImageSourcePropType } from 'react-native';

import { AlbumImages } from '@/constants/images';

/**
 * Обложки дневников для списков UI.
 * Только каталожные превью (DD_*.png ~0.4–0.8 MB), без first_page (~6 MB)
 * и без 100 внутренних страниц — иначе категория «Мои истории» лагает на Android.
 */
export interface DiaryCover {
  id: string;
  sku: string;
  /** Превью для списков / карточек */
  image: ImageSourcePropType;
  imageSpring: ImageSourcePropType | null;
  name: string;
}

type DiarySku = keyof typeof AlbumImages;

function makeCover(sku: DiarySku, idSuffix: string): DiaryCover {
  const image = AlbumImages[sku] as ImageSourcePropType;
  return {
    id: `diary_${idSuffix}`,
    sku,
    image,
    imageSpring: image,
    name: 'Личный дневник',
  };
}

const DIARY_COVERS_MAPPING: Record<string, DiaryCover> = {
  DD1: makeCover('DD1', 'dd1'),
  DD2: makeCover('DD2', 'dd2'),
  DD3: makeCover('DD3', 'dd3'),
  DD4: makeCover('DD4', 'dd4'),
  DD5: makeCover('DD5', 'dd5'),
  DD6: makeCover('DD6', 'dd6'),
  DD7: makeCover('DD7', 'dd7'),
  DD8: makeCover('DD8', 'dd8'),
  DD9: makeCover('DD9', 'dd9'),
  DD10: makeCover('DD10', 'dd10'),
  DD11: makeCover('DD11', 'dd11'),
  DD12: makeCover('DD12', 'dd12'),
  DD13: makeCover('DD13', 'dd13'),
  DD14: makeCover('DD14', 'dd14'),
  DD15: makeCover('DD15', 'dd15'),
  DD16: makeCover('DD16', 'dd16'),
  DD17: makeCover('DD17', 'dd17'),
  DD18: makeCover('DD18', 'dd18'),
  DD20: makeCover('DD20', 'dd20'),
  DD21: makeCover('DD21', 'dd21'),
};

export function extractSkuFromFilename(filename: string): string | null {
  const match = filename.match(/DD_(\d+)/i);
  if (match) {
    return `DD${match[1]}`;
  }
  return null;
}

export function getAllDiaryCovers(): DiaryCover[] {
  return Object.values(DIARY_COVERS_MAPPING);
}

export function getDiaryCoverBySku(sku: string): DiaryCover | null {
  return DIARY_COVERS_MAPPING[sku] || null;
}

export function getDiaryCoverById(id: string): DiaryCover | null {
  return Object.values(DIARY_COVERS_MAPPING).find((c) => c.id === id) || null;
}
