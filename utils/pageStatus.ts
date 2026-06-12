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

export function computePageStatus(schema: AlbumPageSchema, values?: PageValues | null): PageStatus {
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

  const hasCaption = hasText(values.caption);
  const hasAnyContent =
    filledFields > 0 || photoFilled > 0 || hasCaption;

  if (!hasAnyContent) return 'empty';

  const fieldsComplete = totalFields === 0 || filledFields === totalFields;
  const photosComplete = photoRequired === 0 || photoFilled === photoRequired;

  if (fieldsComplete && photosComplete) {
    return 'filled';
  }

  return 'draft';
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
      return 'Не заполнена';
    case 'draft':
      return 'Черновик';
    case 'filled':
      return 'Заполнена';
    case 'locked':
      return 'Не редактируется';
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
