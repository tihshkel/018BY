import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import PageRenderer from '@/components/page-renderer';
import { TemplateWireframePreview } from '@/components/album/template-wireframe-preview';
import { AppText } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/design-tokens';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useDevRenderCount } from '@/hooks/use-dev-render-count';
import type { AlbumPageSchema, PageValues } from '@/types/album-page-schema';
import {
  getPageFormatForLineGuide,
  isBlankTemplateLineGuide,
} from '@/utils/photoPageTemplateManifest';
import { isBlankEditPreviewReady } from '@/utils/pageStatus';
import { pageValuesToAnnotations } from '@/utils/pageValuesAdapter';
import { enrichSchemaWithPhotoBlocks } from '@/utils/schemaPhotoBlocks';

type BlankPageEditPreviewProps = {
  schema: AlbumPageSchema;
  pageValues: PageValues;
  imageUri?: string;
  maxWidth: number;
  /** На планшете допускаем чуть больший предпросмотр. */
  isTablet?: boolean;
};

const PAGE_ASPECT: Record<string, number> = {
  '18x24': 3 / 4,
  '21x21': 1,
};

const PREVIEW_DEBOUNCE_MS = 500;

export const BlankPageEditPreview = React.memo(function BlankPageEditPreview({
  schema,
  pageValues,
  imageUri,
  maxWidth,
  isTablet = false,
}: BlankPageEditPreviewProps) {
  useDevRenderCount('BlankPageEditPreview');

  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);

  const pageFormat = getPageFormatForLineGuide(schema.lineGuideId);
  const aspect = PAGE_ASPECT[pageFormat] ?? PAGE_ASPECT['18x24'];
  const widthCap = isTablet ? 520 : 420;
  const width = Math.max(240, Math.min(maxWidth, widthCap));
  const height = width / aspect;
  const debouncedPageValues = useDebouncedValue(pageValues, PREVIEW_DEBOUNCE_MS);

  const resolvedSchema = useMemo(() => enrichSchemaWithPhotoBlocks(schema), [schema]);

  const previewReady = useMemo(
    () => isBlankEditPreviewReady(pageValues, resolvedSchema),
    [pageValues, resolvedSchema],
  );

  const debouncedPreviewReady = useMemo(
    () => isBlankEditPreviewReady(debouncedPageValues, resolvedSchema),
    [debouncedPageValues, resolvedSchema],
  );

  const annotations = useMemo(
    () =>
      debouncedPreviewReady
        ? pageValuesToAnnotations({
            lineGuideId: resolvedSchema.lineGuideId,
            pageNumber: resolvedSchema.sourcePageNumber,
            schema: resolvedSchema,
            values: debouncedPageValues,
            viewportWidth: width,
            viewportHeight: height,
            sourceWidth: sourceSize?.width,
            sourceHeight: sourceSize?.height,
          })
        : [],
    [
      debouncedPageValues,
      debouncedPreviewReady,
      height,
      resolvedSchema,
      sourceSize?.height,
      sourceSize?.width,
      width,
    ],
  );

  const handleSourceSize = useCallback((size: { width: number; height: number }) => {
    setSourceSize(size);
  }, []);

  const showLivePreview = Boolean(imageUri && debouncedPreviewReady);

  const hint = !previewReady
    ? resolvedSchema.pageType === 'free_page'
      ? 'Добавьте хотя бы одно фото — тогда появится предпросмотр.'
      : 'Загрузите все фото для страницы — тогда появится предпросмотр.'
    : 'Предпросмотр обновляется с небольшой задержкой, пока вы печатаете.';

  if (!isBlankTemplateLineGuide(resolvedSchema.lineGuideId)) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText variant="bodySm" style={styles.title}>
          Предпросмотр страницы
        </AppText>
        <AppText variant="caption" style={styles.format}>
          {pageFormat === '21x21' ? '21×21' : '18×24'}
        </AppText>
      </View>
      <View style={[styles.pageShadow, { width, height }]}>
        {showLivePreview ? (
          <PageRenderer
            imageUri={imageUri!}
            annotations={annotations}
            width={width}
            height={height}
            sourceWidth={sourceSize?.width}
            sourceHeight={sourceSize?.height}
            lineGuideId={resolvedSchema.lineGuideId}
            sourcePageNumber={resolvedSchema.sourcePageNumber}
            backgroundColor={colors.white}
            readOnly
            waitForAnnotationImages={false}
            onSourceSize={handleSourceSize}
          />
        ) : (
          <TemplateWireframePreview
            templateId={resolvedSchema.templateLibraryId ?? 'SinglePhotoTemplate'}
            format={pageFormat}
            values={debouncedPageValues}
          />
        )}
      </View>
      <AppText variant="caption" style={styles.hint}>
        {hint}
      </AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.textPrimary,
  },
  format: {
    color: colors.textSecondary,
  },
  pageShadow: {
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  hint: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
