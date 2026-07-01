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
import { pageValuesToAnnotations } from '@/utils/pageValuesAdapter';

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

  const hasPhotoContent = useMemo(
    () =>
      Object.values(pageValues.photoBlocks ?? {}).some((block) =>
        block.slots.some((slot) => typeof slot === 'string' && slot.length > 0),
      ),
    [pageValues.photoBlocks],
  );

  const annotations = useMemo(
    () =>
      hasPhotoContent
        ? pageValuesToAnnotations({
            lineGuideId: schema.lineGuideId,
            pageNumber: schema.sourcePageNumber,
            schema,
            values: debouncedPageValues,
            viewportWidth: width,
            viewportHeight: height,
            sourceWidth: sourceSize?.width,
            sourceHeight: sourceSize?.height,
          })
        : [],
    [
      debouncedPageValues,
      hasPhotoContent,
      height,
      schema,
      sourceSize?.height,
      sourceSize?.width,
      width,
    ],
  );

  if (!isBlankTemplateLineGuide(schema.lineGuideId)) return null;

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
        {!imageUri || !hasPhotoContent ? (
          <TemplateWireframePreview
            templateId={schema.templateLibraryId ?? 'SinglePhotoTemplate'}
            format={pageFormat}
            values={debouncedPageValues}
          />
        ) : (
          <PageRenderer
            imageUri={imageUri}
            annotations={annotations}
            width={width}
            height={height}
            sourceWidth={sourceSize?.width}
            sourceHeight={sourceSize?.height}
            lineGuideId={schema.lineGuideId}
            backgroundColor={colors.white}
            onSourceSize={setSourceSize}
          />
        )}
      </View>
      <AppText variant="caption" style={styles.hint}>
        Предпросмотр обновляется с небольшой задержкой, пока вы печатаете.
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
