import { CategoryAlbumImages } from '@/constants/images';
import { getCoverForExport } from '@/utils/coverMapping';
import { getCoverPickerImage } from '@/utils/coverPickerImage';
import type { ImageSourcePropType } from 'react-native';

const INTERIOR_ONLY_IDS = new Set([
  'family_blank',
  'kids_48',
  'holidays_blank',
  'diary_interior_brown',
  'diary_interior_purple',
]);

export function isInteriorOnlyAlbumId(albumId: string | null | undefined): boolean {
  if (!albumId) return false;
  return INTERIOR_ONLY_IDS.has(albumId) || albumId.startsWith('diary_interior_');
}

function resolveCoverById(
  albumId: string,
  category?: string | null
): ImageSourcePropType | null {
  if (isInteriorOnlyAlbumId(albumId)) return null;

  const picker = getCoverPickerImage(albumId, category);
  if (picker) return picker;

  return getCoverForExport(albumId, category ?? undefined);
}

function getCategoryFallbackImage(category?: string | null): ImageSourcePropType | null {
  switch (category) {
    case 'pregnancy':
      return CategoryAlbumImages.pregnancy;
    case 'kids':
      return CategoryAlbumImages.kids;
    case 'family':
      return CategoryAlbumImages.family;
    case 'wedding':
      return CategoryAlbumImages.wedding;
    case 'travel':
    case 'holidays':
      return CategoryAlbumImages.travel;
    case 'diary':
      return require('@/assets/images/albums/DD_1.png');
    default:
      return null;
  }
}

export type ProjectCoverMeta = {
  coverType?: string | null;
  albumId?: string | null;
  category?: string | null;
  thumbnailPath?: unknown;
};

/**
 * Обложка для карточки проекта на главной и в списках.
 * coverType — выбранная обложка; albumId с interior_* не подставляем как обложку.
 */
export function getProjectCoverImageSource(project: ProjectCoverMeta): ImageSourcePropType | null {
  const coverType =
    typeof project.coverType === 'string' && project.coverType.length > 0
      ? project.coverType
      : null;
  const albumId =
    typeof project.albumId === 'string' && project.albumId.length > 0 ? project.albumId : null;

  if (coverType) {
    const cover = resolveCoverById(coverType, project.category);
    if (cover) return cover;
  }

  if (albumId) {
    const cover = resolveCoverById(albumId, project.category);
    if (cover) return cover;
  }

  if (typeof project.thumbnailPath === 'number') {
    return project.thumbnailPath as ImageSourcePropType;
  }

  return getCategoryFallbackImage(project.category);
}

/** Сохраняем в проект при создании — require-модуль, не URI внутренней страницы */
export function getCoverThumbnailForProject(
  coverType: string | null | undefined,
  category: string | null | undefined
): ImageSourcePropType | null {
  if (!coverType) return null;
  return getCoverPickerImage(coverType, category);
}
