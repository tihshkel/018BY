import type {
  AlbumPageSchema,
  PageStatus,
  PageValues,
} from '@/types/album-page-schema';
import {
  getPageFormatForLineGuide,
  getTemplateLayout,
  isBlankTemplateLineGuide,
} from '@/utils/photoPageTemplateManifest';

function hasText(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function countAnyFilledPhotoSlots(values: PageValues, schema: AlbumPageSchema): number {
  if (schema.pageType === 'free_page') {
    return (values.freeElements ?? []).filter(
      (el) => el.type === 'image' && hasText(el.content),
    ).length;
  }

  let filled = 0;
  for (const block of schema.photoBlocks ?? []) {
    const blockValues = values.photoBlocks[block.blockId];
    if (!blockValues) continue;
    const variant =
      block.variants.find((v) => v.variantId === blockValues.variantId) ?? block.variants[0];
    if (!variant) continue;
    for (let i = 0; i < variant.slots; i += 1) {
      if (hasText(blockValues.slots[i] ?? null)) filled += 1;
    }
  }
  return filled;
}

function countFilledTimelineEvents(values: PageValues, schema: AlbumPageSchema): number {
  if (!schema.templateLibraryId) return 0;
  const format = getPageFormatForLineGuide(schema.lineGuideId);
  const layout = getTemplateLayout(schema.templateLibraryId, format);
  if (!layout?.events?.length) return 0;

  let count = 0;
  for (let i = 0; i < layout.events.length; i += 1) {
    const blockValues = values.photoBlocks.main_photo;
    const hasPhoto = hasText(blockValues?.slots[i] ?? null);
    const event = layout.events[i];
    const dateField = schema.fields?.find((f) => f.fieldId.endsWith(`_${event.date.id}`));
    const descField = schema.fields?.find((f) => f.fieldId.endsWith(`_${event.description.id}`));
    const hasDate = dateField ? hasText(values.fields[dateField.fieldId]) : false;
    const hasDesc = descField ? hasText(values.fields[descField.fieldId]) : false;
    if (hasPhoto || hasDate || hasDesc) count += 1;
  }
  return count;
}

function meetsTemplateFilledRule(values: PageValues, schema: AlbumPageSchema): boolean {
  if (!schema.templateLibraryId || !isBlankTemplateLineGuide(schema.lineGuideId)) {
    return false;
  }

  const format = getPageFormatForLineGuide(schema.lineGuideId);
  const layout = getTemplateLayout(schema.templateLibraryId, format);
  const rule = layout?.minFilledRule;
  if (!rule) return false;

  const photoCount = countAnyFilledPhotoSlots(values, schema);
  const textCount = (schema.fields ?? []).filter((f) => hasText(values.fields[f.fieldId])).length;
  const freeCount = (values.freeElements ?? []).filter((el) => hasText(el.content)).length;

  if (rule.minPhotos != null && photoCount >= rule.minPhotos) return true;
  if (rule.minTextFields != null && textCount >= rule.minTextFields) return true;
  if (rule.minTimelineEvents != null && countFilledTimelineEvents(values, schema) >= rule.minTimelineEvents) {
    return true;
  }
  if (rule.minAnyContent && (photoCount > 0 || textCount > 0 || freeCount > 0)) return true;

  return false;
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
  const photoFilled = countAnyFilledPhotoSlots(values, schema);
  const hasCaption = hasText(values.caption);
  const hasPhotoCaptions = (values.photoCaptions ?? []).some((c) => hasText(c));
  const hasFreeElements = (values.freeElements ?? []).some((el) => hasText(el.content));
  const hasCustomFields = (values.customFields ?? []).some(
    (field) => hasText(field.label) || hasText(field.value),
  );
  return filledFields > 0 || photoFilled > 0 || hasCaption || hasPhotoCaptions || hasFreeElements || hasCustomFields;
}

function meetsBirthdayFilledRule(values: PageValues, schema: AlbumPageSchema): boolean {
  if (schema.lineGuideId !== 'holidays_birthday_60') {
    return false;
  }

  if (schema.pageType === 'birthday_free_page' || schema.pageType === 'caption_photo_page') {
    return hasAnyUserContent(values, schema);
  }

  if (schema.pageType === 'text_page') {
    return (schema.fields ?? []).some((field) => hasText(values.fields[field.fieldId]));
  }

  const fieldIds = schema.fields?.map((f) => f.fieldId) ?? [];
  const filledFields = fieldIds.filter((id) => hasText(values.fields[id])).length;
  const totalFields = fieldIds.length;
  const fieldsComplete = totalFields === 0 || filledFields === totalFields;

  let photoFilled = 0;
  for (const block of schema.photoBlocks ?? []) {
    const blockValues = values.photoBlocks[block.blockId];
    const variant =
      block.variants.find((v) => v.variantId === blockValues?.variantId) ?? block.variants[0];
    if (!variant) continue;
    for (let i = 0; i < variant.slots; i += 1) {
      if (hasText(blockValues?.slots[i])) photoFilled += 1;
    }
  }

  if (fieldsComplete && (photoFilled > 0 || !(schema.photoBlocks?.length ?? 0))) {
    return true;
  }

  if (schema.sourcePageNumber === 1 && filledFields > 0) {
    return true;
  }

  return false;
}

function meetsFamilyTreeFilledRule(values: PageValues, schema: AlbumPageSchema): boolean {
  if (schema.pageType !== 'family_tree') return false;

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

  // Подписи на семейном дереве необязательны — достаточно всех фото в кругах.
  return photoRequired > 0 && photoFilled === photoRequired;
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

  if (meetsTemplateFilledRule(values, schema)) {
    return 'filled';
  }

  if (meetsBirthdayFilledRule(values, schema)) {
    return 'filled';
  }

  if (meetsFamilyTreeFilledRule(values, schema)) {
    return 'filled';
  }

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
    if (field.required && !hasText(values?.fields[field.fieldId])) {
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

/** True when blank template edit preview can render filled PageRenderer (all template photos present). */
export function isBlankEditPreviewReady(
  values: PageValues,
  schema: AlbumPageSchema,
): boolean {
  if (!schema.templateLibraryId || !isBlankTemplateLineGuide(schema.lineGuideId)) {
    return false;
  }

  if (schema.pageType === 'free_page') {
    return (values.freeElements ?? []).some(
      (el) => el.type === 'image' && hasText(el.content),
    );
  }

  let photoRequired = 0;
  let photoFilled = 0;
  for (const block of schema.photoBlocks ?? []) {
    const blockValues = values.photoBlocks[block.blockId];
    const variant =
      block.variants.find((v) => v.variantId === blockValues?.variantId) ?? block.variants[0];
    if (!variant) continue;
    photoRequired += variant.slots;
    for (let i = 0; i < variant.slots; i += 1) {
      if (hasText(blockValues?.slots[i] ?? null)) photoFilled += 1;
    }
  }

  if (photoRequired > 0) {
    return photoFilled === photoRequired;
  }

  if (schema.pageType === 'text_page') {
    return (schema.fields ?? []).some((field) => hasText(values.fields[field.fieldId]));
  }

  return hasAnyUserContent(values, schema);
}
