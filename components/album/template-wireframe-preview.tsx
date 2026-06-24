import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, sansFont } from '@/constants/design-tokens';
import type { PageFormat, PageValues } from '@/types/album-page-schema';
import { getTemplateLayout } from '@/utils/photoPageTemplateManifest';

type TemplateWireframePreviewProps = {
  templateId: string;
  format: PageFormat;
  values?: PageValues;
};

function getFieldPreviewValue(values: PageValues | undefined, blockId: string): string | undefined {
  if (!values?.fields) return undefined;
  const direct = values.fields[blockId] ?? values.fields[`_${blockId}`];
  if (direct) return direct;
  const match = Object.entries(values.fields).find(([fieldId, value]) =>
    fieldId.endsWith(blockId) && value.trim().length > 0,
  );
  return match?.[1];
}

export function TemplateWireframePreview({
  templateId,
  format,
  values,
}: TemplateWireframePreviewProps) {
  const layout = useMemo(() => getTemplateLayout(templateId, format), [format, templateId]);
  const aspect = format === '21x21' ? 1 : 3 / 4;

  if (!layout) {
    return (
      <View style={styles.canvas}>
        <View style={[styles.frame, { aspectRatio: aspect }]} />
      </View>
    );
  }

  const photoSlots =
    layout.photoSlots ??
    layout.events?.map((event) => event.photo) ??
    [];

  return (
    <View style={styles.canvas}>
      <View style={[styles.frame, { aspectRatio: aspect }]}>
        <View style={styles.pageWash} />
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
          >
            <Ionicons name="image-outline" size={14} color={colors.primary} />
          </View>
        ))}

        {(layout.textBlocks ?? []).map((block) => {
          const fieldValue = getFieldPreviewValue(values, block.id);
          const captionValue =
            block.type === 'caption'
              ? values?.caption ?? values?.photoCaptions?.[Number(block.id.replace(/\D/g, '')) - 1]
              : undefined;
          const textValue = fieldValue || captionValue;

          return (
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
            >
              {textValue ? (
                <Text numberOfLines={block.type === 'longText' ? 3 : 1} style={styles.textValue}>
                  {textValue.trim()}
                </Text>
              ) : (
                <View style={styles.textLines}>
                  <View style={[styles.textLine, block.type === 'title' && styles.titleLine]} />
                  {block.type === 'longText' ? (
                    <>
                      <View style={styles.textLine} />
                      <View style={[styles.textLine, styles.shortLine]} />
                    </>
                  ) : null}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    height: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  frame: {
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderColor: 'rgba(241, 148, 162, 0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    height: '92%',
    overflow: 'hidden',
    position: 'relative',
    ...createPreviewShadow(),
  },
  pageWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFDFC',
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    borderRadius: 6,
  },
  photo: {
    backgroundColor: '#F7EEF0',
    borderColor: 'rgba(241, 148, 162, 0.34)',
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    alignItems: 'stretch',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dashed: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(241, 148, 162, 0.45)',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  textLines: {
    gap: 3,
    width: '100%',
  },
  textLine: {
    backgroundColor: '#E8DDE0',
    borderRadius: 999,
    height: 3,
    width: '100%',
  },
  titleLine: {
    backgroundColor: colors.primary,
    opacity: 0.45,
  },
  shortLine: {
    width: '68%',
  },
  textValue: {
    color: colors.textPrimary,
    fontFamily: sansFont('regular'),
    fontSize: 6,
    lineHeight: 7,
    textAlign: 'center',
  },
});

function createPreviewShadow() {
  return {
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  };
}
