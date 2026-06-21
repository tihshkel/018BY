import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/constants/design-tokens';
import type { PageFormat } from '@/types/album-page-schema';
import { getTemplateLayout } from '@/utils/photoPageTemplateManifest';

type TemplateWireframePreviewProps = {
  templateId: string;
  format: PageFormat;
};

export function TemplateWireframePreview({
  templateId,
  format,
}: TemplateWireframePreviewProps) {
  const layout = useMemo(() => getTemplateLayout(templateId, format), [format, templateId]);
  const aspect = format === '21x21' ? 1 : 3 / 4;

  if (!layout) {
    return <View style={[styles.frame, { aspectRatio: aspect }]} />;
  }

  const photoSlots =
    layout.photoSlots ??
    layout.events?.map((event) => event.photo) ??
    [];

  return (
    <View style={[styles.frame, { aspectRatio: aspect }]}>
      {layout.freeCanvas ? (
        <View
          style={[
            styles.box,
            styles.dashed,
            {
              left: `${layout.freeCanvas.x * 100}%`,
              top: `${layout.freeCanvas.y * 100}%`,
              width: `${layout.freeCanvas.w * 100}%`,
              height: `${layout.freeCanvas.h * 100}%`,
            },
          ]}
        />
      ) : null}

      {photoSlots.map((slot) => (
        <View
          key={slot.id}
          style={[
            styles.box,
            styles.photo,
            {
              left: `${slot.x * 100}%`,
              top: `${slot.y * 100}%`,
              width: `${slot.w * 100}%`,
              height: `${slot.h * 100}%`,
            },
          ]}
        />
      ))}

      {(layout.textBlocks ?? []).map((block) => (
        <View
          key={block.id}
          style={[
            styles.box,
            styles.text,
            {
              left: `${block.x * 100}%`,
              top: `${block.y * 100}%`,
              width: `${block.w * 100}%`,
              height: `${block.h * 100}%`,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    backgroundColor: colors.border,
    borderRadius: radii.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  box: {
    position: 'absolute',
    borderRadius: 2,
  },
  photo: {
    backgroundColor: 'rgba(122, 92, 62, 0.35)',
  },
  text: {
    backgroundColor: 'rgba(61, 61, 61, 0.25)',
  },
  dashed: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textSecondary,
    backgroundColor: 'transparent',
  },
});
