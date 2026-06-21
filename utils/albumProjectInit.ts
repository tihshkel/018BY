import type { AlbumPageSchema, PageInstance } from '@/types/album-page-schema';
import { getDefaultTemplateId } from '@/constants/page-template-library';
import { getAlbumPageSchemas } from '@/constants/generated/album-page-schemas';
import { getPageTemplateById } from '@/constants/page-template-library';
import { createId } from '@/utils/id';
import { createEmptyPageValues } from '@/utils/pageStorage';
import { resolvePhotoPageTemplateId } from '@/utils/photoPageTemplateManifest';
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
    });
  }

  return instances;
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

export function getSchemaForInstance(
  instance: PageInstance,
  lineGuideId: string
): AlbumPageSchema | undefined {
  if (instance.schemaPageId.includes('_lib_')) {
    const libMatch = instance.schemaPageId.match(/_lib_(.+)_\d+$/);
    const rawTemplateId = libMatch?.[1];
    const templateId = rawTemplateId ? resolvePhotoPageTemplateId(rawTemplateId) : getDefaultTemplateId();
    const template = getPageTemplateById(templateId);

    if (template) {
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
  }

  const schemas = getAlbumPageSchemas(lineGuideId);
  const schema =
    schemas.find((s) => s.pageId === instance.schemaPageId) ??
    schemas.find((s) => s.sourcePageNumber === instance.sourcePageNumber);

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
