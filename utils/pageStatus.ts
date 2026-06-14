import type {
  AlbumPageSchema,
  PageStatus,
  PageValues,
} from '@/types/album-page-schema';

function hasText(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function countFilledPhotoSlots(values: PageValues, schema: AlbumPageSchema): number {
  let required = 0;
  let filled = 0;

  for (const block of schema.photoBlocks ?? []) {
    const blockValues = values.photoBlocks[block.blockId];
    if (!blockValues) continue;

    const variant =
      block.variants.find((v) => v.variantId === blockValues.variantId) ?? block.variants[0];
    if (!variant) continue;

    required += variant.slots;
    for (let i = 0; i < variant.slots; i += 1) {
      if (hasText(blockValues.slots[i] ?? null)) filled += 1;
    }
  }

  return required > 0 ? (filled === required ? required : filled) : 0;
}

function hasAnyUserContent(values: PageValues, schema: AlbumPageSchema): boolean {
  const fieldIds = schema.fields?.map((f) => f.fieldId) ?? [];
  const filledFields = fieldIds.filter((id) => hasText(values.fields[id])).length;
  const photoFilled = countFilledPhotoSlots(values, schema);
  const hasCaption = hasText(values.caption);
  const hasPhotoCaptions = (values.photoCaptions ?? []).some((c) => hasText(c));
  return filledFields > 0 || photoFilled > 0 || hasCaption || hasPhotoCaptions;
}

export function computePageStatus(schema: AlbumPageSchema, values?: PageValues | null): PageStatus {
  if (values?.excludedFromExport) {
    return 'excluded';
  }

  if (schema.pageType === 'non_editable' || !schema.editable) {
    return 'locked';
  }

  if (!values) return 'empty';

  const fieldIds = schema.fields?.map((f) => f.fieldId) ?? [];
  const filledFields = fieldIds.filter((id) => hasText(values.fields[id])).length;
  const totalFields = fieldIds.length;

  let photoRequired = 0;
  let photoFilled = 0;
  for (const block of schema.photoBlocks ?? []) {
    const blockValues = values.photoBlocks[block.blockId];
    const variant =
      block.variants.find((v) => v.variantId === blockValues?.variantId) ?? block.variants[0];
    if (!variant) continue;
    photoRequired += variant.slots;
    for (let i = 0; i < variant.slots; i += 1) {
      if (hasText(blockValues?.slots[i])) photoFilled += 1;
    }
  }

  const hasAnyContent = hasAnyUserContent(values, schema);

  if (!hasAnyContent) return 'empty';

  const fieldsComplete = totalFields === 0 || filledFields === totalFields;
  const photosComplete = photoRequired === 0 || photoFilled === photoRequired;

  if (fieldsComplete && photosComplete) {
    return 'filled';
  }

  if (values.draftSavedAt) {
    return 'draft';
  }

  return 'continue';
}

export function refreshPageValuesStatus(
  schema: AlbumPageSchema,
  values: PageValues
): PageValues {
  return {
    ...values,
    status: computePageStatus(schema, values),
    updatedAt: new Date().toISOString(),
  };
}

export function getPageStatusLabel(status: PageStatus): string {
  switch (status) {
    case 'empty':
      return 'Заполнить';
    case 'continue':
      return 'Продолжить';
    case 'draft':
      return 'Черновик';
    case 'filled':
      return 'Заполнена';
    case 'locked':
      return 'Только просмотр';
    case 'excluded':
      return 'Не использовать';
    default:
      return status;
  }
}

export function countFilledPhotoSlotsForSchema(
  schema: AlbumPageSchema,
  values?: PageValues | null
): number {
  if (!values) return 0;
  return countFilledPhotoSlots(values, schema);
}

export function isPageEditableStatus(status: PageStatus): boolean {
  return status !== 'locked' && status !== 'excluded';
}

export function shouldOpenFormDirectly(status: PageStatus): boolean {
  return status === 'continue' || status === 'draft' || status === 'filled';
}

export function getMissingPageItems(
  schema: AlbumPageSchema,
  values?: PageValues | null
): string[] {
  if (schema.pageType === 'non_editable' || !schema.editable) {
    return [];
  }

  const missing: string[] = [];

  for (const field of schema.fields ?? []) {
    if (!hasText(values?.fields[field.fieldId])) {
      missing.push(field.label || 'Текстовое поле');
    }
  }

  for (const block of schema.photoBlocks ?? []) {
    const blockValues = values?.photoBlocks[block.blockId];
    const variant =
      block.variants.find((v) => v.variantId === blockValues?.variantId) ??
      block.variants[0];
    if (!variant) continue;

    for (let i = 0; i < variant.slots; i += 1) {
      if (hasText(blockValues?.slots[i])) continue;
      const label =
        variant.slots > 1
          ? `${block.label || 'Фото'} ${i + 1}`
          : block.label || 'Фото';
      missing.push(label);
    }
  }

  if (schema.pageType === 'caption_photo_page') {
    const block = schema.photoBlocks?.[0];
    const blockValues = block ? values?.photoBlocks[block.blockId] : undefined;
    const variant =
      block?.variants.find((v) => v.variantId === blockValues?.variantId) ??
      block?.variants[0];
    if (variant) {
      for (let i = 0; i < variant.slots; i += 1) {
        if (!hasText(blockValues?.slots[i])) continue;
        if (hasText(values?.photoCaptions?.[i])) continue;
        missing.push(`Подпись к фото ${i + 1}`);
      }
    }
  }

  return missing;
}
