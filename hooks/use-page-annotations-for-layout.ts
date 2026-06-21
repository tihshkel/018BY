import { useMemo } from 'react';

import type { AlbumPageSchema, PageInstance, PageValues } from '@/types/album-page-schema';
import type { Annotation } from '@/components/pdf-annotations';
import { enrichSchemaWithPhotoBlocks } from '@/utils/schemaPhotoBlocks';
import { pageValuesToAnnotations } from '@/utils/pageValuesAdapter';

type UsePageAnnotationsForLayoutParams = {
  instance?: PageInstance;
  schema?: AlbumPageSchema;
  values?: PageValues;
  lineGuideId: string;
  viewportWidth: number;
  viewportHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
};

export function usePageAnnotationsForLayout({
  instance,
  schema,
  values,
  lineGuideId,
  viewportWidth,
  viewportHeight,
  sourceWidth,
  sourceHeight,
}: UsePageAnnotationsForLayoutParams): Annotation[] {
  return useMemo(() => {
    if (!instance || !schema || !values || viewportWidth <= 0 || viewportHeight <= 0) {
      return [];
    }

    const resolvedSchema = enrichSchemaWithPhotoBlocks(schema);

    return pageValuesToAnnotations({
      lineGuideId,
      pageNumber: schema.sourcePageNumber,
      schema: resolvedSchema,
      values,
      viewportWidth,
      viewportHeight,
      sourceWidth,
      sourceHeight,
    });
  }, [
    instance,
    lineGuideId,
    schema,
    sourceHeight,
    sourceWidth,
    values,
    viewportHeight,
    viewportWidth,
  ]);
}
