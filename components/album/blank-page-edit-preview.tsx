import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import PageRenderer from '@/components/page-renderer';
import { TemplateWireframePreview } from '@/components/album/template-wireframe-preview';
import { AppText } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/design-tokens';
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
};

const PAGE_ASPECT: Record<string, number> = {
  '18x24': 3 / 4,
  '21x21': 1,
};

export function BlankPageEditPreview({
  schema,
  pageValues,
  imageUri,
  maxWidth,
}: BlankPageEditPreviewProps) {
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);

  const pageFormat = getPageFormatForLineGuide(schema.lineGuideId);
  const aspect = PAGE_ASPECT[pageFormat] ?? PAGE_ASPECT['18x24'];
  const width = Math.max(240, Math.min(maxWidth, 420));
  const height = width / aspect;

  const annotations = useMemo(
    () =>
      pageValuesToAnnotations({
        lineGuideId: schema.lineGuideId,
        pageNumber: schema.sourcePageNumber,
        schema,
        values: pageValues,
        viewportWidth: width,
        viewportHeight: height,
        sourceWidth: sourceSize?.width,
        sourceHeight: sourceSize?.height,
      }),
    [height, pageValues, schema, sourceSize?.height, sourceSize?.width, width],
  );

  if (!isBlankTemplateLineGuide(schema.lineGuideId)) return null;

  const hasPhotoContent = Object.values(pageValues.photoBlocks ?? {}).some((block) =>
    block.slots.some((slot) => typeof slot === 'string' && slot.length > 0),
  );

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
            values={pageValues}
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
        Нажмите на фото-слоты или поля ниже, изменения сразу появятся здесь.
      </AppText>
    </View>
  );
}

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
