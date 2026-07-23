import type { AlbumPageSchema, FieldType, PageInstance, PageValues } from '@/types/album-page-schema';
import type { Href } from 'expo-router';
import { router } from 'expo-router';

import { computePageStatus, shouldOpenFormDirectly } from '@/utils/pageStatus';
import { enrichSchemaWithPhotoBlocks } from '@/utils/schemaPhotoBlocks';

export function hasPhotoBlocks(schema: AlbumPageSchema | undefined): boolean {
  if (!schema) return false;
  return (enrichSchemaWithPhotoBlocks(schema).photoBlocks?.length ?? 0) > 0;
}

export function usesUnifiedPhotoEditor(schema: AlbumPageSchema | undefined): boolean {
  if (!schema) return false;
  if (
    schema.pageType === 'timeline_page' ||
    schema.pageType === 'text_page' ||
    schema.pageType === 'free_page' ||
    schema.pageType === 'birthday_free_page'
  ) {
    return true;
  }
  return hasPhotoBlocks(schema);
}

const TYPOGRAPHY_FIELD_TYPES: ReadonlySet<FieldType> = new Set([
  'text',
  'date',
  'time',
  'number',
]);

/** Страницы с текстовым вводом помимо «голых» photoBlocks (customFieldDefs, free canvas и т.д.). */
export function hasFormTextInput(schema: AlbumPageSchema | undefined): boolean {
  if (!schema) return false;
  if ((schema.fields?.length ?? 0) > 0) return true;
  if (schema.captionEnabled) return true;
  if (
    schema.pageType === 'birthday_free_page' &&
    (schema.customFieldDefs?.length ?? 0) > 0
  ) {
    return true;
  }
  if (
    schema.pageType === 'free_page' ||
    schema.pageType === 'timeline_page' ||
    schema.pageType === 'text_page'
  ) {
    return true;
  }
  return false;
}

/** Текст, который пользователь вводит и который рисуется выбранным шрифтом (не чекбоксы/радио). */
export function hasTypographyEditableContent(
  schema: AlbumPageSchema | undefined,
): boolean {
  if (!schema) return false;
  if (schema.fields?.some((field) => TYPOGRAPHY_FIELD_TYPES.has(field.type))) {
    return true;
  }
  if (schema.captionEnabled) return true;
  if (
    schema.pageType === 'birthday_free_page' &&
    (schema.customFieldDefs?.length ?? 0) > 0
  ) {
    return true;
  }
  if (
    schema.pageType === 'free_page' ||
    schema.pageType === 'timeline_page' ||
    schema.pageType === 'text_page'
  ) {
    return true;
  }
  return false;
}

export function isPhotoOnlySchema(schema: AlbumPageSchema | undefined): boolean {
  if (!schema) return false;
  if (hasFormTextInput(schema)) return false;
  if (
    schema.pageType === 'photo' ||
    schema.pageType === 'event_photo' ||
    schema.pageType === 'free_photo_caption' ||
    schema.pageType === 'caption_photo_page'
  ) {
    return (schema.fields?.length ?? 0) === 0;
  }
  return (
    (schema.photoBlocks?.length ?? 0) > 0 && (schema.fields?.length ?? 0) === 0
  );
}

export function resolveFormPathname(schema: AlbumPageSchema | undefined): string {
  if (!schema) return '/album-page-form';
  const specialTypes = new Set([
    'family_tree',
    'teeth',
    'growth_weight',
    'month_page',
    'baptism_page',
    'godparents_page',
  ]);
  if (specialTypes.has(schema.pageType)) {
    return '/album-page-form';
  }
  if (isPhotoOnlySchema(schema)) {
    return '/album-page-photos';
  }
  return '/album-page-form';
}

export function openAlbumPage(params: {
  instanceId: string;
  projectId: string;
  schema: AlbumPageSchema | undefined;
  values: PageValues | undefined;
  celebration?: string;
  coverType?: string;
  interiorType?: string;
}): void {
  const { instanceId, projectId, schema, values, celebration, coverType, interiorType } = params;
  const status = schema ? computePageStatus(schema, values) : 'empty';

  const baseParams = {
    id: projectId,
    instanceId,
    celebration,
    coverType,
    interiorType,
  };

  if (status === 'locked' || status === 'excluded') {
    router.push({
      pathname: '/album-page-preview',
      params: baseParams,
    } as unknown as Href);
    return;
  }

  if (shouldOpenFormDirectly(status)) {
    router.push({
      pathname: resolveFormPathname(schema),
      params: baseParams,
    } as unknown as Href);
    return;
  }

  router.push({
    pathname: '/album-page-preview',
    params: baseParams,
  } as unknown as Href);
}

export function canShowPageActions(
  schema: AlbumPageSchema | undefined,
  instance: PageInstance
): boolean {
  if (!schema) return instance.addedByUser;
  return schema.canDuplicate || instance.addedByUser;
}
