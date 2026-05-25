import { isPregnancyAlbum } from '@/utils/coverMapping';
import { getDiaryCoverById } from '@/utils/diaryAlbumsLoader';
import { FAMILY_COVER_DESIGNS } from '@/utils/familyCoverDesigns';
import { HOLIDAY_COVER_DESIGNS } from '@/utils/holidayCoverDesigns';
import { KIDS_FIRST_PAGE_BY_ID } from '@/utils/kidsCoverPickerAssets.generated';
import { KIDS_COVER_DESIGNS } from '@/utils/kidsCoverDesigns';
import { PREGNANCY_COVER_DESIGNS } from '@/utils/pregnancyCoverDesigns';
import type { ImageSourcePropType } from 'react-native';

/** Те же require, что на экране выбора обложки (page_001 / first_page / page_1). */
export function getCoverPickerImage(
  albumId: string | null | undefined,
  category?: string | null
): ImageSourcePropType | null {
  if (!albumId) return null;

  if (category === 'pregnancy' || isPregnancyAlbum(albumId)) {
    const design = PREGNANCY_COVER_DESIGNS.find((d) => d.id === albumId);
    if (design?.image) return design.image as ImageSourcePropType;
  }

  if (category === 'holidays' || albumId.startsWith('holiday_')) {
    const design = HOLIDAY_COVER_DESIGNS.find((d) => d.id === albumId);
    if (design?.image) return design.image as ImageSourcePropType;
  }

  if (category === 'family' || albumId.startsWith('family_sdfa')) {
    const design = FAMILY_COVER_DESIGNS.find((d) => d.id === albumId);
    if (design?.image) return design.image as ImageSourcePropType;
  }

  if (category === 'diary' || albumId.startsWith('diary_')) {
    const cover = getDiaryCoverById(albumId);
    if (cover?.image) return cover.image;
  }

  if (category === 'kids' || albumId.startsWith('dfa_')) {
    const fromCatalog = KIDS_COVER_DESIGNS.find((d) => d.id === albumId);
    if (fromCatalog?.image) return fromCatalog.image as ImageSourcePropType;
    if (KIDS_FIRST_PAGE_BY_ID[albumId]) return KIDS_FIRST_PAGE_BY_ID[albumId];
  }

  return null;
}
