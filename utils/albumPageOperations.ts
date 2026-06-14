import type { PageInstance, PageValues } from '@/types/album-page-schema';
import { getAlbumPageSchemaByPageId } from '@/constants/generated/album-page-schemas';
import { createId } from '@/utils/id';
import { getSchemaForInstance } from '@/utils/albumProjectInit';
import { createEmptyPageValues } from '@/utils/pageStorage';
import { syncPageValuesToAnnotationsStorage } from '@/utils/pageValuesAdapter';

export function reindexPageInstances(
  instances: PageInstance[],
  images: string[]
): PageInstance[] {
  return instances
    .slice(0, images.length)
    .map((instance, index) => ({
      ...instance,
      order: index + 1,
      imageIndex: index,
    }));
}

export function insertPageAtIndex(params: {
  instances: PageInstance[];
  pageValuesMap: Record<string, PageValues>;
  images: string[];
  insertAfterIndex: number;
  newImageUri: string;
  schemaPageId: string;
  sourcePageNumber: number;
  titleOverride?: string;
  lineGuideId: string;
}): {
  instances: PageInstance[];
  pageValuesMap: Record<string, PageValues>;
  images: string[];
} {
  const {
    instances,
    pageValuesMap,
    images,
    insertAfterIndex,
    newImageUri,
    schemaPageId,
    sourcePageNumber,
    titleOverride,
  } = params;

  const newInstance: PageInstance = {
    instanceId: createId('page'),
    schemaPageId,
    sourcePageNumber,
    order: insertAfterIndex + 2,
    addedByUser: true,
    imageIndex: insertAfterIndex + 1,
    titleOverride,
  };

  const newImages = [...images];
  newImages.splice(insertAfterIndex + 1, 0, newImageUri);

  const newInstances = [...instances];
  newInstances.splice(insertAfterIndex + 1, 0, newInstance);

  const reindexed = reindexPageInstances(newInstances, newImages);
  const newValuesMap = { ...pageValuesMap, [newInstance.instanceId]: createEmptyPageValues() };

  return {
    instances: reindexed,
    pageValuesMap: newValuesMap,
    images: newImages,
  };
}

export function duplicatePageAtIndex(params: {
  instances: PageInstance[];
  pageValuesMap: Record<string, PageValues>;
  images: string[];
  pageIndex: number;
  lineGuideId: string;
}): {
  instances: PageInstance[];
  pageValuesMap: Record<string, PageValues>;
  images: string[];
} | null {
  const { instances, pageValuesMap, images, pageIndex, lineGuideId } = params;
  const source = instances[pageIndex];
  const sourceUri = images[pageIndex];
  if (!source || !sourceUri) return null;

  const schema = getSchemaForInstance(source, lineGuideId);
  if (!schema?.canDuplicate) return null;

  const copiedValues = pageValuesMap[source.instanceId];
  const result = insertPageAtIndex({
    instances,
    pageValuesMap,
    images,
    insertAfterIndex: pageIndex,
    newImageUri: sourceUri,
    schemaPageId: source.schemaPageId,
    sourcePageNumber: source.sourcePageNumber,
    titleOverride: source.titleOverride,
    lineGuideId,
  });

  if (copiedValues) {
    result.pageValuesMap[result.instances[pageIndex + 1].instanceId] = {
      ...JSON.parse(JSON.stringify(copiedValues)),
      updatedAt: new Date().toISOString(),
    };
  }

  return result;
}

export function movePageAtIndex(params: {
  instances: PageInstance[];
  pageValuesMap: Record<string, PageValues>;
  images: string[];
  fromIndex: number;
  toIndex: number;
}): {
  instances: PageInstance[];
  pageValuesMap: Record<string, PageValues>;
  images: string[];
} | null {
  const { instances, pageValuesMap, images, fromIndex, toIndex } = params;
  if (fromIndex < 0 || fromIndex >= instances.length) return null;
  if (toIndex < 0 || toIndex >= instances.length) return null;
  if (fromIndex === toIndex) return null;

  const newInstances = [...instances];
  const newImages = [...images];
  const [movedInstance] = newInstances.splice(fromIndex, 1);
  const [movedImage] = newImages.splice(fromIndex, 1);
  newInstances.splice(toIndex, 0, movedInstance);
  newImages.splice(toIndex, 0, movedImage);

  return {
    instances: reindexPageInstances(newInstances, newImages),
    pageValuesMap,
    images: newImages,
  };
}

export function renamePageInstance(params: {
  instances: PageInstance[];
  instanceId: string;
  titleOverride: string;
}): PageInstance[] | null {
  const { instances, instanceId, titleOverride } = params;
  const index = instances.findIndex((i) => i.instanceId === instanceId);
  if (index < 0) return null;

  const next = [...instances];
  next[index] = { ...next[index], titleOverride: titleOverride.trim() || undefined };
  return next;
}

export function removePageAtIndex(params: {
  instances: PageInstance[];
  pageValuesMap: Record<string, PageValues>;
  images: string[];
  pageIndex: number;
}): {
  instances: PageInstance[];
  pageValuesMap: Record<string, PageValues>;
  images: string[];
} | null {
  const { instances, pageValuesMap, images, pageIndex } = params;
  if (pageIndex < 0 || pageIndex >= instances.length) return null;
  if (instances.length <= 1) return null;

  const removed = instances[pageIndex];
  const newImages = images.filter((_, index) => index !== pageIndex);
  const newInstances = instances.filter((_, index) => index !== pageIndex);
  const reindexed = reindexPageInstances(newInstances, newImages);

  const newValuesMap = { ...pageValuesMap };
  delete newValuesMap[removed.instanceId];

  return {
    instances: reindexed,
    pageValuesMap: newValuesMap,
    images: newImages,
  };
}

export function buildAnnotationsForProject(params: {
  instances: PageInstance[];
  pageValuesMap: Record<string, PageValues>;
  lineGuideId: string;
  viewportWidth?: number;
  viewportHeight?: number;
}) {
  return syncPageValuesToAnnotationsStorage(
    params.instances,
    params.pageValuesMap,
    params.lineGuideId,
    params.viewportWidth,
    params.viewportHeight
  );
}

export function createPageFromTemplateLibrary(params: {
  templateLibraryId: string;
  lineGuideId: string;
  blankPageUri: string;
}): { schemaPageId: string; sourcePageNumber: number; titleOverride: string } {
  const { templateLibraryId, lineGuideId, blankPageUri: _blank } = params;
  const pageId = `${lineGuideId}_lib_${templateLibraryId}_${Date.now()}`;
  return {
    schemaPageId: pageId,
    sourcePageNumber: 1,
    titleOverride: templateLibraryId.replace(/_/g, ' '),
  };
}

export function resolveSchemaForLibraryPage(
  schemaPageId: string,
  lineGuideId: string,
  templateLibraryId: string
) {
  const existing = getAlbumPageSchemaByPageId(schemaPageId);
  if (existing) return existing;

  return {
    pageId: schemaPageId,
    title: templateLibraryId,
    pageType: templateLibraryId.includes('note') ? 'free' : 'photo',
    order: 0,
    editable: true,
    lineGuideId,
    sourcePageNumber: 1,
    canDuplicate: true,
    canAddAfter: true,
    templateLibraryId,
    photoBlocks: [
      {
        blockId: 'main_photo',
        label: 'Фото для страницы',
        variants: [
          {
            variantId: 'default',
            label: 'Фото',
            slots: templateLibraryId.startsWith('4_') ? 4 : templateLibraryId.startsWith('2_') ? 2 : 1,
            slotIndices: [0],
          },
        ],
      },
    ],
  } as const;
}
