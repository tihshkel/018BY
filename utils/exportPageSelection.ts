import type { AlbumPageSchema, PageInstance, PageValues } from '@/types/album-page-schema';
import type { Annotation } from '@/components/pdf-annotations';
import { computePageStatus } from '@/utils/pageStatus';
import { resolveInstancePageImageUri } from '@/utils/resolveInstancePageImage';

export type ExportPageRow = {
  instanceId: string;
  title: string;
  status: ReturnType<typeof computePageStatus>;
  included: boolean;
  reason: 'filled' | 'partial' | 'required_static' | 'empty' | 'excluded';
};

export type ExportSelectionSummary = {
  totalIncluded: number;
  filledCount: number;
  partialCount: number;
  requiredCount: number;
  excludedCount: number;
  emptyCount: number;
  rows: ExportPageRow[];
  includedInstanceIds: string[];
};

function hasUserContent(schema: AlbumPageSchema, values?: PageValues | null): boolean {
  if (!values) return false;
  const status = computePageStatus(schema, values);
  return status === 'filled' || status === 'continue' || status === 'draft';
}

/** Декоративные / статичные страницы шаблона — всегда входят в экспорт. */
export function isStaticExportPage(schema: AlbumPageSchema): boolean {
  return (
    schema.requiredInExport === true ||
    schema.pageType === 'non_editable' ||
    schema.editable === false
  );
}

/** Добавляет статичные страницы к сохранённому выбору (актуально для старых selection в storage). */
export function mergeStaticPagesIntoExportSelection(params: {
  instances: PageInstance[];
  includedInstanceIds: string[];
  getSchema: (instance: PageInstance) => AlbumPageSchema | undefined;
}): string[] {
  const included = new Set(params.includedInstanceIds);

  for (const instance of params.instances) {
    const schema = params.getSchema(instance);
    if (schema && isStaticExportPage(schema)) {
      included.add(instance.instanceId);
    }
  }

  return params.instances
    .filter((instance) => included.has(instance.instanceId))
    .map((instance) => instance.instanceId);
}

export function buildExportSelection(params: {
  instances: PageInstance[];
  pageValuesMap: Record<string, PageValues>;
  getSchema: (instance: PageInstance) => AlbumPageSchema | undefined;
  getTitle: (instance: PageInstance) => string;
}): ExportSelectionSummary {
  const { instances, pageValuesMap, getSchema, getTitle } = params;
  const rows: ExportPageRow[] = [];
  const includedInstanceIds: string[] = [];

  let filledCount = 0;
  let partialCount = 0;
  let requiredCount = 0;
  let excludedCount = 0;
  let emptyCount = 0;

  for (const instance of instances) {
    const schema = getSchema(instance);
    if (!schema) continue;

    const values = pageValuesMap[instance.instanceId];
    const status = computePageStatus(schema, values);
    const title = getTitle(instance);

    if (isStaticExportPage(schema)) {
      requiredCount += 1;
      includedInstanceIds.push(instance.instanceId);
      rows.push({
        instanceId: instance.instanceId,
        title,
        status,
        included: true,
        reason: 'required_static',
      });
      continue;
    }

    if (status === 'excluded') {
      excludedCount += 1;
      rows.push({
        instanceId: instance.instanceId,
        title,
        status,
        included: false,
        reason: 'excluded',
      });
      continue;
    }

    if (status === 'filled') {
      filledCount += 1;
      includedInstanceIds.push(instance.instanceId);
      rows.push({
        instanceId: instance.instanceId,
        title,
        status,
        included: true,
        reason: 'filled',
      });
      continue;
    }

    if (hasUserContent(schema, values)) {
      partialCount += 1;
      includedInstanceIds.push(instance.instanceId);
      rows.push({
        instanceId: instance.instanceId,
        title,
        status,
        included: true,
        reason: 'partial',
      });
      continue;
    }

    emptyCount += 1;
    rows.push({
      instanceId: instance.instanceId,
      title,
      status,
      included: false,
      reason: 'empty',
    });
  }

  return {
    totalIncluded: includedInstanceIds.length,
    filledCount,
    partialCount,
    requiredCount,
    excludedCount,
    emptyCount,
    rows,
    includedInstanceIds,
  };
}

export function getExportSelectionStorageKey(projectId: string): string {
  return `@export_page_selection_${projectId}`;
}

export function buildElectronicExportFileName(childName?: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const safeName = (childName?.trim() || 'МойАльбом')
    .replace(/[^\p{L}\p{N}_-]+/gu, '')
    .slice(0, 40);
  return `Фотоальбом_${safeName}_${datePart}_${timePart}.pdf`;
}

export function filterProjectDataForExport(params: {
  instances: PageInstance[];
  images: string[];
  annotations: Annotation[];
  includedInstanceIds: string[];
  blankPageUri?: string | null;
}): {
  images: string[];
  annotations: Annotation[];
} {
  const { instances, images, annotations, includedInstanceIds, blankPageUri } = params;
  const idSet = new Set(includedInstanceIds);
  const filteredInstances = instances.filter((i) => idSet.has(i.instanceId));

  const filteredImages: string[] = [];
  const filteredAnnotations: Annotation[] = [];

  for (const instance of filteredInstances) {
    const imageUri = resolveInstancePageImageUri(images, instance) ?? blankPageUri ?? null;
    if (!imageUri) continue;

    filteredImages.push(imageUri);
    const sourcePageNumber = instance.sourcePageNumber;
    const targetPageNumber = filteredImages.length;
    const pageAnnotations = annotations.filter(
      (a) => Number(a.page) === sourcePageNumber
    );
    filteredAnnotations.push(
      ...pageAnnotations.map((a) => ({
        ...a,
        page: targetPageNumber,
      }))
    );
  }

  return { images: filteredImages, annotations: filteredAnnotations };
}

export function readChildNameFromProject(
  instances: PageInstance[],
  pageValuesMap: Record<string, PageValues>,
  _lineGuideId: string
): string | undefined {
  const page1 = instances.find((i) => i.sourcePageNumber === 1 && i.schemaPageId.includes('_p1'));
  if (!page1) return undefined;
  const values = pageValuesMap[page1.instanceId];
  if (!values) return undefined;

  const keys = Object.keys(values.fields);
  const nameKey =
    keys.find((k) => k.includes('child_name')) ??
    keys.find((k) => k.includes('_p1_') && values.fields[k]?.trim());
  return nameKey ? values.fields[nameKey]?.trim() : undefined;
}
