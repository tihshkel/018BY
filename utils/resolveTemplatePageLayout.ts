import type { PhotoPageLayouts } from '@/constants/photo-slots';
import type {
  AlbumPageField,
  AlbumPageSchema,
  PageFormat,
  PhotoBlockSchema,
} from '@/types/album-page-schema';
import {
  getPageFormatForLineGuide,
  getTemplateLayout,
  getTemplateMeta,
  isBlankTemplateLineGuide,
  resolvePhotoPageTemplateId,
  type PhotoPageTemplateId,
  type TemplateLayoutDef,
  type TemplatePhotoSlotDef,
  type TemplateTextBlockDef,
} from '@/utils/photoPageTemplateManifest';

const TEXT_LABELS: Record<string, string> = {
  caption1: 'Подпись',
  caption2: 'Подпись к фото 2',
  caption3: 'Подпись к фото 3',
  caption4: 'Подпись к фото 4',
  title: 'Заголовок',
  story: 'История',
  body: 'Текст',
  signature: 'Подпись',
  event1_date: 'Дата события 1',
  event1_description: 'Описание события 1',
  event2_date: 'Дата события 2',
  event2_description: 'Описание события 2',
  event3_date: 'Дата события 3',
  event3_description: 'Описание события 3',
};

function resolveTextBlockLabel(blockId: string): string {
  if (TEXT_LABELS[blockId]) return TEXT_LABELS[blockId];
  if (blockId.endsWith('_date')) return 'Дата';
  if (blockId.endsWith('_description')) return 'Описание';
  if (blockId.startsWith('caption')) return 'Подпись';
  if (blockId === 'title') return 'Заголовок';
  if (blockId === 'story' || blockId === 'body') return 'Текст';
  return 'Текст';
}

function slotToNormalized(slot: TemplatePhotoSlotDef) {
  const topY = slot.y;
  const centerY = topY + slot.h / 2;
  return {
    x: slot.x,
    y: centerY,
    width: slot.w,
    height: slot.h,
  };
}

export function buildPhotoPageLayoutsFromTemplate(
  templateId: string,
  format: PageFormat,
): PhotoPageLayouts | undefined {
  const layout = getTemplateLayout(templateId, format);
  const photoSlots = layout?.photoSlots ?? layout?.events?.map((event) => event.photo) ?? [];
  if (!photoSlots.length) return undefined;

  return {
    variants: [
      {
        variantId: 'template',
        slots: photoSlots.map(slotToNormalized),
      },
    ],
  };
}

export function buildPhotoBlocksFromTemplate(
  templateId: string,
  format: PageFormat,
): PhotoBlockSchema[] | undefined {
  const layout = getTemplateLayout(templateId, format);
  const photoSlots = layout?.photoSlots ?? layout?.events?.map((e) => e.photo) ?? [];
  if (photoSlots.length === 0 && layout?.pageType !== 'free_page') return undefined;

  if (layout?.pageType === 'free_page') {
    return [
      {
        blockId: 'free_photos',
        label: 'Фото',
        variants: [
          {
            variantId: 'free',
            label: 'Свободная страница',
            slots: layout.limits?.maxPhotos ?? 4,
            slotIndices: Array.from({ length: layout.limits?.maxPhotos ?? 4 }, (_, i) => i),
          },
        ],
      },
    ];
  }

  return [
    {
      blockId: 'main_photo',
      label: 'Фото для страницы',
      variants: [
        {
          variantId: 'template',
          label: getTemplateMeta(templateId)?.title ?? 'Шаблон',
          slots: photoSlots.length,
          slotIndices: photoSlots.map((_, index) => index),
        },
      ],
    },
  ];
}

function textBlockLineCount(block: TemplateTextBlockDef): number {
  if (block.type === 'longText') {
    return Math.max(3, Math.min(12, Math.round(block.h / 0.035)));
  }
  return 1;
}

function textBlockToField(
  block: TemplateTextBlockDef,
  schemaPageId: string,
  index: number,
): AlbumPageField {
  const lineCount = textBlockLineCount(block);
  return {
    fieldId: `${schemaPageId}_${block.id}`,
    label: resolveTextBlockLabel(block.id),
    type: block.type === 'date' ? 'date' : 'text',
    required: block.required ?? false,
    placeholder: resolveTextBlockLabel(block.id),
    maxLength: block.maxLength,
    templateLineStart: index,
    templateLineCount: lineCount,
  };
}

export function buildFieldsFromTemplate(
  templateId: string,
  format: PageFormat,
  schemaPageId: string,
): AlbumPageField[] {
  const layout = getTemplateLayout(templateId, format);
  if (!layout) return [];

  const fields: AlbumPageField[] = [];
  let index = 0;

  const captionBlocks = layout.textBlocks?.filter((block) => block.type === 'caption') ?? [];
  const useSingleCaptionValue =
    captionBlocks.length === 1 && !layout.perPhotoCaptions;

  for (const block of layout.textBlocks ?? []) {
    if (block.type === 'caption') {
      if (layout.perPhotoCaptions) continue;
      if (useSingleCaptionValue) continue;
    }
    const field = textBlockToField(block, schemaPageId, index);
    fields.push(field);
    index += field.templateLineCount ?? 1;
  }

  for (const event of layout.events ?? []) {
    const dateField = textBlockToField(event.date, schemaPageId, index);
    fields.push(dateField);
    index += dateField.templateLineCount ?? 1;
    const descField = textBlockToField(event.description, schemaPageId, index);
    fields.push(descField);
    index += descField.templateLineCount ?? 1;
  }

  return fields;
}

export function buildSchemaFromTemplate(params: {
  templateId: string;
  lineGuideId: string;
  schemaPageId: string;
  titleOverride?: string;
  order: number;
  sourcePageNumber: number;
}): AlbumPageSchema {
  const resolvedId = resolvePhotoPageTemplateId(params.templateId);
  const format = getPageFormatForLineGuide(params.lineGuideId);
  const layout = getTemplateLayout(resolvedId, format);
  const meta = getTemplateMeta(resolvedId);

  const pageType = layout?.pageType ?? 'photo';
  const fields = buildFieldsFromTemplate(resolvedId, format, params.schemaPageId);
  const photoBlocks = buildPhotoBlocksFromTemplate(resolvedId, format);

  return {
    pageId: params.schemaPageId,
    title: params.titleOverride ?? meta?.title ?? resolvedId,
    pageType,
    order: params.order,
    editable: true,
    lineGuideId: params.lineGuideId,
    sourcePageNumber: params.sourcePageNumber,
    canDuplicate: true,
    canAddAfter: true,
    templateLibraryId: resolvedId,
    captionEnabled: Boolean(
      layout?.perPhotoCaptions ||
        (layout?.textBlocks?.filter((b) => b.type === 'caption').length === 1 &&
          !layout?.perPhotoCaptions),
    ),
    fields: fields.length ? fields : undefined,
    photoBlocks,
  };
}

export function getTemplatePhotoLayouts(
  templateLibraryId: string | undefined,
  lineGuideId: string,
  page?: number,
): PhotoPageLayouts | undefined {
  const usesTemplateLayouts =
    isBlankTemplateLineGuide(lineGuideId) || lineGuideId === 'holidays_birthday_60';
  if (!templateLibraryId || !usesTemplateLayouts) return undefined;

  const format = getPageFormatForLineGuide(lineGuideId);
  const layouts = buildPhotoPageLayoutsFromTemplate(templateLibraryId, format);
  if (!layouts?.variants?.length) return undefined;

  if (lineGuideId === 'holidays_birthday_60' && page !== undefined) {
    const { expandCollageVariantsWithSparse } =
      require('@/utils/sparseTextPhotoSafeZone') as typeof import('@/utils/sparseTextPhotoSafeZone');
    return expandCollageVariantsWithSparse(layouts, lineGuideId, page);
  }

  return layouts;
}

export function getTextBlockRect(
  templateId: PhotoPageTemplateId | string,
  format: PageFormat,
  fieldIdSuffix: string,
): TemplateTextBlockDef | undefined {
  const layout = getTemplateLayout(templateId, format);
  if (!layout) return undefined;

  const direct = layout.textBlocks?.find((b) => fieldIdSuffix.endsWith(b.id));
  if (direct) return direct;

  for (const event of layout.events ?? []) {
    if (fieldIdSuffix.endsWith(event.date.id)) return event.date;
    if (fieldIdSuffix.endsWith(event.description.id)) return event.description;
  }

  return undefined;
}

export function getPhotoSlotRect(
  templateId: string,
  format: PageFormat,
  slotIndex: number,
): TemplatePhotoSlotDef | undefined {
  const layout = getTemplateLayout(templateId, format) as TemplateLayoutDef | undefined;
  if (!layout) return undefined;

  if (layout.photoSlots?.[slotIndex]) return layout.photoSlots[slotIndex];

  const eventPhoto = layout.events?.[slotIndex]?.photo;
  return eventPhoto;
}
