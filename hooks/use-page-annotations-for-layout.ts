import { useMemo } from 'react';

import type { AlbumPageSchema, PageInstance, PageValues } from '@/types/album-page-schema';
import type { Annotation } from '@/components/pdf-annotations';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
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
  /** Debounce values before heavy annotation build (ms). 0 = immediate. */
  debounceMs?: number;
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
  debounceMs = 0,
}: UsePageAnnotationsForLayoutParams): Annotation[] {
  const debouncedValues = useDebouncedValue(values, debounceMs);

  return useMemo(() => {
    const resolvedValues = debounceMs > 0 ? debouncedValues : values;
    if (!instance || !schema || !resolvedValues || viewportWidth <= 0 || viewportHeight <= 0) {
      return [];
    }

    const resolvedSchema = enrichSchemaWithPhotoBlocks(schema);

    return pageValuesToAnnotations({
      lineGuideId,
      pageNumber: instance.sourcePageNumber ?? schema.sourcePageNumber,
      schema: resolvedSchema,
      values: resolvedValues,
      viewportWidth,
      viewportHeight,
      sourceWidth,
      sourceHeight,
    });
  }, [
    debounceMs,
    debouncedValues,
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
