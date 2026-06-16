import type { AlbumPageSchema, PhotoBlockSchema } from '@/types/album-page-schema';
import { resolvePhotoPageLayoutsOrUndefined } from '@/utils/resolvePhotoPageLayouts';

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
) {
  return resolvePhotoPageLayoutsOrUndefined(lineGuideId, pageNumber);
}

export function buildPhotoBlocksFromPhotoSlots(
  lineGuideId: string,
  pageNumber: number,
): PhotoBlockSchema[] | undefined {
  const layouts = resolvePhotoPageLayouts(lineGuideId, pageNumber);
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
  if (schema.photoBlocks?.length) return schema;

  const photoBlocks = buildPhotoBlocksFromPhotoSlots(
    schema.lineGuideId,
    schema.sourcePageNumber,
  );
  if (!photoBlocks) return schema;

  return { ...schema, photoBlocks };
}

export function hasPhotoSlotLayouts(
  lineGuideId: string,
  pageNumber: number,
): boolean {
  return Boolean(resolvePhotoPageLayouts(lineGuideId, pageNumber)?.variants?.length);
}
