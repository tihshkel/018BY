import type { AlbumPageSchema, PageInstance } from '@/types/album-page-schema';
import { FULL_PHOTO_BLOCK } from '@/constants/photo-block-presets';
import { getAlbumPageSchemas } from '@/constants/generated/album-page-schemas';
import { getPageTemplateById } from '@/constants/page-template-library';
import { createId } from '@/utils/id';
import { createEmptyPageValues } from '@/utils/pageStorage';

export function buildInitialPageInstances(
  lineGuideId: string,
  imageCount: number
): PageInstance[] {
  const schemas = getAlbumPageSchemas(lineGuideId);
  const instances: PageInstance[] = [];

  for (let imageIndex = 0; imageIndex < imageCount; imageIndex += 1) {
    const sourcePageNumber = Math.min(imageIndex + 1, schemas.length || imageCount);
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
    templateLibraryId: '1_photo_caption',
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
    const templateId = libMatch?.[1];
    const template = templateId ? getPageTemplateById(templateId) : undefined;
    if (template) {
      const photoBlocks =
        template.photoSlots > 0 && (template.pageType === 'photo' || template.pageType === 'free')
          ? template.pageType === 'photo'
            ? [FULL_PHOTO_BLOCK]
            : [
                {
                  blockId: 'main_photo',
                  label: 'Фото для страницы',
                  variants: [
                    {
                      variantId: 'default',
                      label: 'Фото',
                      slots: template.photoSlots,
                      slotIndices: Array.from({ length: template.photoSlots }, (_, i) => i),
                    },
                  ],
                },
              ]
          : undefined;

      return {
        pageId: instance.schemaPageId,
        title: instance.titleOverride ?? template.title,
        pageType: template.pageType,
        order: instance.order,
        editable: true,
        lineGuideId,
        sourcePageNumber: instance.sourcePageNumber,
        canDuplicate: true,
        canAddAfter: true,
        templateLibraryId: template.id,
        photoBlocks,
        fields: template.hasTextBlock
          ? [
              {
                fieldId: `${instance.schemaPageId}_note`,
                label: 'Заметка',
                type: 'text',
                required: false,
                templateLineStart: 0,
                templateLineCount: 1,
              },
            ]
          : undefined,
      };
    }
  }

  const schemas = getAlbumPageSchemas(lineGuideId);
  return (
    schemas.find((s) => s.pageId === instance.schemaPageId) ??
    schemas.find((s) => s.sourcePageNumber === instance.sourcePageNumber)
  );
}

export function getInstanceTitle(
  instance: PageInstance,
  lineGuideId: string
): string {
  if (instance.titleOverride) return instance.titleOverride;
  const schema = getSchemaForInstance(instance, lineGuideId);
  return schema?.title ?? `Страница ${instance.order}`;
}
