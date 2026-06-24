import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { TemplateWireframePreview } from '@/components/album/template-wireframe-preview';
import PageRenderer from '@/components/page-renderer';
import { colors } from '@/constants/design-tokens';
import type { AlbumPageSchema, PageStatus, PageValues } from '@/types/album-page-schema';
import {
  getPageFormatForLineGuide,
  isBlankTemplateLineGuide,
} from '@/utils/photoPageTemplateManifest';
import { pageValuesToAnnotations } from '@/utils/pageValuesAdapter';

type BlankPageThumbnailProps = {
  schema: AlbumPageSchema;
  values: PageValues;
  status: PageStatus;
  imageUri?: string;
  width?: number;
  height?: number;
};

export function BlankPageThumbnail({
  schema,
  values,
  status,
  imageUri,
  width = 56,
  height = 72,
}: BlankPageThumbnailProps) {
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);
  const [layoutSize, setLayoutSize] = useState({ width, height });
  const pageFormat = getPageFormatForLineGuide(schema.lineGuideId);
  const renderWidth = Math.max(layoutSize.width, 1);
  const renderHeight = Math.max(layoutSize.height, 1);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    const nextHeight = event.nativeEvent.layout.height;
    if (nextWidth > 0 && nextHeight > 0) {
      setLayoutSize({ width: nextWidth, height: nextHeight });
    }
  };

  const annotations = useMemo(
    () =>
      pageValuesToAnnotations({
        lineGuideId: schema.lineGuideId,
        pageNumber: schema.sourcePageNumber,
        schema,
        values,
        viewportWidth: renderWidth,
        viewportHeight: renderHeight,
        sourceWidth: sourceSize?.width,
        sourceHeight: sourceSize?.height,
      }),
    [renderHeight, renderWidth, schema, sourceSize?.height, sourceSize?.width, values],
  );

  if (!isBlankTemplateLineGuide(schema.lineGuideId) || !schema.templateLibraryId) {
    return null;
  }

  const hasPhotoContent = Object.values(values.photoBlocks ?? {}).some((block) =>
    block.slots.some((slot) => typeof slot === 'string' && slot.length > 0),
  );

  if (status === 'empty' || !imageUri || !hasPhotoContent) {
    return (
      <View style={styles.fill} onLayout={handleLayout}>
        <TemplateWireframePreview
          templateId={schema.templateLibraryId}
          format={pageFormat}
          values={values}
        />
      </View>
    );
  }

  return (
    <View style={styles.fill} onLayout={handleLayout}>
      <PageRenderer
        imageUri={imageUri}
        annotations={annotations}
        width={renderWidth}
        height={renderHeight}
        sourceWidth={sourceSize?.width}
        sourceHeight={sourceSize?.height}
        lineGuideId={schema.lineGuideId}
        backgroundColor={colors.white}
        onSourceSize={setSourceSize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    backgroundColor: colors.white,
    height: '100%',
    width: '100%',
  },
});
