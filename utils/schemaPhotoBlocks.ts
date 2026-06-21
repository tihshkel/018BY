import type { AlbumPageSchema, PhotoBlockSchema } from '@/types/album-page-schema';
import { resolvePhotoPageLayoutsOrUndefined } from '@/utils/resolvePhotoPageLayouts';
import {
  getPageFormatForLineGuide,
  getTemplateLayout,
  isBlankTemplateLineGuide,
} from '@/utils/photoPageTemplateManifest';

const VARIANT_LABELS: Record<string, string> = {
  one_large: 'Одно большое фото',
  one_horizontal: '1 горизонтальное фото',
  one_horizontal_common: 'Одно общее фото',
  two_photos: 'Два фото',
  two_horizontal: '2 горизонтальных фото',
  two_vertical: '2 вертикальных фото',
  two_vertical_separate: 'Два отдельных фото',
  three_hero: '3 фото (коллаж)',
  four_grid: 'Четыре фото (коллаж)',
  four_vertical: '4 фото (коллаж)',
  two_photos: 'Два фото',
};

function resolvePhotoBlockId(lineGuideId: string): string {
  if (lineGuideId === 'kids_48') return 'event_photos';
  if (lineGuideId.includes('godparent')) return 'godparents_photo';
  return 'main_photo';
}

function resolvePhotoPageLayouts(
  lineGuideId: string,
  pageNumber: number,
  templateLibraryId?: string,
) {
  return resolvePhotoPageLayoutsOrUndefined(lineGuideId, pageNumber, templateLibraryId);
}

export function buildPhotoBlocksFromPhotoSlots(
  lineGuideId: string,
  pageNumber: number,
  templateLibraryId?: string,
): PhotoBlockSchema[] | undefined {
  const layouts = resolvePhotoPageLayouts(lineGuideId, pageNumber, templateLibraryId);
  if (!layouts?.variants?.length) return undefined;

  const variants = layouts.variants.map((variant) => ({
    variantId: variant.variantId,
    label: VARIANT_LABELS[variant.variantId] ?? variant.variantId,
    slots: variant.slots.length,
    slotIndices: variant.slots.map((_, index) => index),
  }));

  return [
    {
      blockId: resolvePhotoBlockId(lineGuideId),
      label: 'Фото для страницы',
      variants,
    },
  ];
}

export function enrichSchemaWithPhotoBlocks(schema: AlbumPageSchema): AlbumPageSchema {
  if (schema.photoBlocks !== undefined) return schema;

  if (!shouldEnrichWithPhotoBlocks(schema)) return schema;

  const photoBlocks = buildPhotoBlocksFromPhotoSlots(
    schema.lineGuideId,
    schema.sourcePageNumber,
    schema.templateLibraryId,
  );
  if (!photoBlocks) return schema;

  return { ...schema, photoBlocks };
}

function isPregnancyWeeklyPhotoPage(lineGuideId: string, pageNumber: number): boolean {
  if (lineGuideId === 'pregnancy_60') {
    return (
      (pageNumber >= 9 && pageNumber <= 17) ||
      (pageNumber >= 19 && pageNumber <= 32) ||
      (pageNumber >= 34 && pageNumber <= 47)
    );
  }
  if (lineGuideId === 'pregnancy_a5') {
    return (
      (pageNumber >= 5 && pageNumber <= 13) ||
      (pageNumber >= 15 && pageNumber <= 28) ||
      (pageNumber >= 30 && pageNumber <= 43)
    );
  }
  return false;
}

function shouldEnrichWithPhotoBlocks(schema: AlbumPageSchema): boolean {
  if (schema.pageType === 'non_editable' || schema.editable === false) {
    return false;
  }

  const photoPageTypes = new Set([
    'photo',
    'caption_photo_page',
    'event_photo',
    'free_photo_caption',
    'timeline_page',
    'free_page',
    'birthday_free_page',
  ]);
  if (photoPageTypes.has(schema.pageType)) return true;

  if (schema.pageType === 'structured' || schema.pageType === 'text_page') {
    if (isPregnancyWeeklyPhotoPage(schema.lineGuideId, schema.sourcePageNumber)) {
      return true;
    }
    return hasPhotoSlotLayouts(schema.lineGuideId, schema.sourcePageNumber);
  }

  return false;
}

export function hasPhotoSlotLayouts(
  lineGuideId: string,
  pageNumber: number,
): boolean {
  return Boolean(resolvePhotoPageLayouts(lineGuideId, pageNumber)?.variants?.length);
}
