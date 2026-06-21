import type { PageInstance, PageValues } from '@/types/album-page-schema';
import type { AlbumPageSchema } from '@/types/album-page-schema';
import { getAlbumSections } from '@/constants/album-sections';
import { computePageStatus } from '@/utils/pageStatus';

export type AlbumProgress = {
  filledCount: number;
  totalCount: number;
  percent: number;
};

export type SectionProgress = AlbumProgress & {
  sectionId: string;
  title: string;
};

export function computeAlbumProgress(
  instances: PageInstance[],
  pageValuesMap: Record<string, PageValues>,
  getSchema: (instance: PageInstance) => AlbumPageSchema | undefined
): AlbumProgress {
  let filledCount = 0;
  const totalCount = instances.length;

  for (const instance of instances) {
    const schema = getSchema(instance);
    if (!schema) continue;
    const status = computePageStatus(schema, pageValuesMap[instance.instanceId]);
    if (status === 'filled') filledCount += 1;
  }

  const percent = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;
  return { filledCount, totalCount, percent };
}

export function computeSectionProgressList(
  lineGuideId: string,
  instances: PageInstance[],
  pageValuesMap: Record<string, PageValues>,
  getSchema: (instance: PageInstance) => AlbumPageSchema | undefined
): SectionProgress[] {
  const sections = getAlbumSections(lineGuideId);

  return sections.map((section) => {
    const sectionInstances = instances.filter(
      (i) =>
        i.sourcePageNumber >= section.pageRange[0] &&
        i.sourcePageNumber <= section.pageRange[1]
    );

    let filledCount = 0;
    for (const instance of sectionInstances) {
      const schema = getSchema(instance);
      if (!schema) continue;
      const status = computePageStatus(schema, pageValuesMap[instance.instanceId]);
      if (status === 'filled') filledCount += 1;
    }

    const totalCount = sectionInstances.length;
    const percent = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

    return {
      sectionId: section.sectionId,
      title: section.title,
      filledCount,
      totalCount,
      percent,
    };
  });
}

export function findNextPageToContinue(
  instances: PageInstance[],
  pageValuesMap: Record<string, PageValues>,
  getSchema: (instance: PageInstance) => AlbumPageSchema | undefined
): PageInstance | undefined {
  const priority = ['continue', 'draft', 'empty'] as const;

  for (const target of priority) {
    const found = instances.find((instance) => {
      const schema = getSchema(instance);
      if (!schema || schema.pageType === 'non_editable') return false;
      const status = computePageStatus(schema, pageValuesMap[instance.instanceId]);
      return status === target;
    });
    if (found) return found;
  }

  return undefined;
}
