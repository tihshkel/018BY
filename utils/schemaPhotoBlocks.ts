import type { AlbumPageSchema, PhotoBlockSchema } from '@/types/album-page-schema';
import { resolvePhotoPageLayoutsOrUndefined } from '@/utils/resolvePhotoPageLayouts';
import {
  getPageFormatForLineGuide,
  isBlankTemplateLineGuide,
} from '@/utils/photoPageTemplateManifest';
import { buildPhotoBlocksFromTemplate } from '@/utils/resolveTemplatePageLayout';
import { normalizeDesignedAlbumVariantId } from '@/utils/variantPreview';

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

  return [buildPhotoBlockFromLayouts(lineGuideId, layouts)];
}

function buildPhotoBlockFromLayouts(
  lineGuideId: string,
  layouts: NonNullable<ReturnType<typeof resolvePhotoPageLayouts>>,
): PhotoBlockSchema {
  const variants = layouts.variants.map((variant) => ({
    variantId: variant.variantId,
    label: VARIANT_LABELS[variant.variantId] ?? variant.variantId,
    slots: variant.slots.length,
    slotIndices: variant.slots.map((_, index) => index),
  }));

  return {
    blockId: resolvePhotoBlockId(lineGuideId),
    label: 'Фото для страницы',
    variants,
  };
}

function constrainPhotoBlocksToFeasibleLayouts(schema: AlbumPageSchema): AlbumPageSchema {
  if (!schema.photoBlocks?.length) return schema;

  const layouts = resolvePhotoPageLayouts(
    schema.lineGuideId,
    schema.sourcePageNumber,
    schema.templateLibraryId,
  );
  if (!layouts?.variants?.length) return schema;

  const allowedIds = new Set(
    layouts.variants.flatMap((variant) => [variant.variantId, normalizeDesignedAlbumVariantId(variant.variantId)]),
  );

  const photoBlocks = schema.photoBlocks.map((block) => {
    const filtered = block.variants.filter((variant) => {
      const normalized = normalizeDesignedAlbumVariantId(variant.variantId);
      return allowedIds.has(variant.variantId) || allowedIds.has(normalized);
    });
    if (filtered.length === 0) {
      const fallback = buildPhotoBlockFromLayouts(schema.lineGuideId, layouts);
      return { ...block, variants: fallback.variants };
    }
    return { ...block, variants: filtered };
  });

  return { ...schema, photoBlocks };
}

export function enrichSchemaWithPhotoBlocks(schema: AlbumPageSchema): AlbumPageSchema {
  if (schema.photoBlocks !== undefined) {
    return constrainPhotoBlocksToFeasibleLayouts(schema);
  }

  if (!shouldEnrichWithPhotoBlocks(schema)) return schema;

  if (isBlankTemplateLineGuide(schema.lineGuideId) && schema.templateLibraryId) {
    const format = getPageFormatForLineGuide(schema.lineGuideId);
    const photoBlocks = buildPhotoBlocksFromTemplate(schema.templateLibraryId, format);
    return photoBlocks ? { ...schema, photoBlocks } : schema;
  }

  const photoBlocks = buildPhotoBlocksFromPhotoSlots(
    schema.lineGuideId,
    schema.sourcePageNumber,
    schema.templateLibraryId,
  );
  if (!photoBlocks) return schema;

  return constrainPhotoBlocksToFeasibleLayouts({ ...schema, photoBlocks });
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

  if (isBlankTemplateLineGuide(schema.lineGuideId) && schema.templateLibraryId) {
    return true;
  }

  const photoPageTypes = new Set([
    'photo',
    'free',
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
