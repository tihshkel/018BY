import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { TemplateWireframePreview } from '@/components/album/template-wireframe-preview';
import { colors } from '@/constants/design-tokens';
import type { AlbumPageSchema, PageStatus, PageValues } from '@/types/album-page-schema';
import {
  getPageFormatForLineGuide,
  isBlankTemplateLineGuide,
} from '@/utils/photoPageTemplateManifest';

type BlankPageThumbnailProps = {
  schema: AlbumPageSchema;
  values: PageValues;
  status: PageStatus;
  imageUri?: string;
  width?: number;
  height?: number;
};

/** List thumbnail — wireframe only (no full PageRenderer) to avoid memory churn. */
export function BlankPageThumbnail({
  schema,
  values,
}: BlankPageThumbnailProps) {
  const pageFormat = getPageFormatForLineGuide(schema.lineGuideId);

  const templateId = useMemo(
    () => schema.templateLibraryId,
    [schema.templateLibraryId],
  );

  if (!isBlankTemplateLineGuide(schema.lineGuideId) || !templateId) {
    return null;
  }

  return (
    <View style={styles.fill}>
      <TemplateWireframePreview
        templateId={templateId}
        format={pageFormat}
        values={values}
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
