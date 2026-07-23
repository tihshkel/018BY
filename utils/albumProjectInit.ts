import type { AlbumPageSchema, PageInstance } from '@/types/album-page-schema';
import { getDefaultTemplateId } from '@/constants/page-template-library';
import { getAlbumPageSchemas } from '@/constants/generated/album-page-schemas';
import { createId } from '@/utils/id';
import { createEmptyPageValues } from '@/utils/pageStorage';
import {
  isBlankTemplateLineGuide,
  resolvePhotoPageTemplateId,
} from '@/utils/photoPageTemplateManifest';
import { buildSchemaFromTemplate } from '@/utils/resolveTemplatePageLayout';
import { enrichSchemaWithPhotoBlocks } from '@/utils/schemaPhotoBlocks';

export function buildInitialPageInstances(
  lineGuideId: string,
  imageCount: number
): PageInstance[] {
  const schemas = getAlbumPageSchemas(lineGuideId);
  const schemaCount = schemas.length;
  const effectiveCount =
    schemaCount > 0 ? Math.min(imageCount, schemaCount) : imageCount;
  const instances: PageInstance[] = [];

  for (let imageIndex = 0; imageIndex < effectiveCount; imageIndex += 1) {
    const sourcePageNumber = imageIndex + 1;
    const schema =
      schemas.find((s) => s.sourcePageNumber === sourcePageNumber) ??
      schemas[imageIndex] ??
      buildFallbackSchema(lineGuideId, sourcePageNumber);

    instances.push({
      instanceId: createId('page'),
      schemaPageId: schema.pageId,
      sourcePageNumber: schema.sourcePageNumber,
      order: imageIndex + 1,
      addedByUser: false,
      imageIndex,
      templateLibraryId: schema.templateLibraryId,
    });
  }

  return instances;
}

/**
 * Достраивает недостающие страницы, если images/бандл длиннее сохранённых instances
 * (типичный Android-баг дневников: урезанный список URI → «альбом обрывается»).
 * Существующие instanceId и данные пользователя сохраняются.
 */
export function healMissingPageInstances(
  lineGuideId: string,
  instances: PageInstance[],
  imageCount: number,
): PageInstance[] {
  if (imageCount <= 0) return instances;
  const schemas = getAlbumPageSchemas(lineGuideId);
  const targetCount =
    schemas.length > 0 ? Math.min(imageCount, schemas.length) : imageCount;
  if (instances.length >= targetCount) return instances;

  const byPage = new Map<number, PageInstance>();
  for (const instance of instances) {
    if (!byPage.has(instance.sourcePageNumber)) {
      byPage.set(instance.sourcePageNumber, instance);
    }
  }

  const healed: PageInstance[] = [];
  for (let imageIndex = 0; imageIndex < targetCount; imageIndex += 1) {
    const sourcePageNumber = imageIndex + 1;
    const existing = byPage.get(sourcePageNumber);
    if (existing) {
      healed.push({
        ...existing,
        order: imageIndex + 1,
        imageIndex,
      });
      continue;
    }
    const schema =
      schemas.find((s) => s.sourcePageNumber === sourcePageNumber) ??
      schemas[imageIndex] ??
      buildFallbackSchema(lineGuideId, sourcePageNumber);
    healed.push({
      instanceId: createId('page'),
      schemaPageId: schema.pageId,
      sourcePageNumber: schema.sourcePageNumber,
      order: imageIndex + 1,
      addedByUser: false,
      imageIndex,
      templateLibraryId: schema.templateLibraryId,
    });
  }

  return healed;
}

function buildFallbackSchema(lineGuideId: string, pageNumber: number): AlbumPageSchema {
  return {
    pageId: `${lineGuideId}_p${pageNumber}`,
    title: `Страница ${pageNumber}`,
    pageType: 'free',
    order: pageNumber,
    editable: true,
    lineGuideId,
    sourcePageNumber: pageNumber,
    canDuplicate: true,
    canAddAfter: true,
    templateLibraryId: getDefaultTemplateId(),
  };
}

export function buildInitialPageValuesMap(instances: PageInstance[]): Record<string, ReturnType<typeof createEmptyPageValues>> {
  const map: Record<string, ReturnType<typeof createEmptyPageValues>> = {};
  for (const instance of instances) {
    map[instance.instanceId] = createEmptyPageValues();
  }
  return map;
}

function getTemplateIdForInstance(
  instance: PageInstance,
  schema?: AlbumPageSchema,
): string | undefined {
  if (instance.templateLibraryId) {
    return resolvePhotoPageTemplateId(instance.templateLibraryId);
  }

  const libMatch = instance.schemaPageId.match(/_lib_(.+)_\d+$/);
  if (libMatch?.[1]) {
    return resolvePhotoPageTemplateId(libMatch[1]);
  }

  if (schema?.templateLibraryId) {
    return resolvePhotoPageTemplateId(schema.templateLibraryId);
  }

  return undefined;
}

function buildTemplateSchemaForInstance(
  instance: PageInstance,
  lineGuideId: string,
  schema?: AlbumPageSchema,
): AlbumPageSchema | undefined {
  if (!isBlankTemplateLineGuide(lineGuideId)) return undefined;

  const templateId = getTemplateIdForInstance(instance, schema);
  if (!templateId) return undefined;

  return enrichSchemaWithPhotoBlocks(
    buildSchemaFromTemplate({
      templateId,
      lineGuideId,
      schemaPageId: instance.schemaPageId,
      titleOverride: instance.titleOverride,
      order: instance.order,
      sourcePageNumber: instance.sourcePageNumber,
    }),
  );
}

export function getSchemaForInstance(
  instance: PageInstance,
  lineGuideId: string
): AlbumPageSchema | undefined {
  const schemas = getAlbumPageSchemas(lineGuideId);
  const schema =
    schemas.find((s) => s.pageId === instance.schemaPageId) ??
    schemas.find((s) => s.sourcePageNumber === instance.sourcePageNumber);

  const templateSchema = buildTemplateSchemaForInstance(instance, lineGuideId, schema);
  if (templateSchema) return templateSchema;

  return schema ? enrichSchemaWithPhotoBlocks(schema) : undefined;
}

export function getInstanceTitle(
  instance: PageInstance,
  lineGuideId: string
): string {
  if (instance.titleOverride) return instance.titleOverride;
  const schema = getSchemaForInstance(instance, lineGuideId);
  return schema?.title ?? `Страница ${instance.order}`;
}
