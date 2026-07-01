import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  BLANK_ALBUM_PHOTO_RADIUS,
  colors,
  radii,
  sansFont,
  templateWireframe,
} from '@/constants/design-tokens';
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
  if (direct?.trim()) return direct;
  const suffix = `_${blockId}`;
  const match = Object.entries(values.fields).find(
    ([fieldId, value]) =>
      (fieldId === blockId || fieldId.endsWith(suffix)) && value.trim().length > 0,
  );
  return match?.[1];
}

export const TemplateWireframePreview = React.memo(function TemplateWireframePreview({
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

  const photoSlots = layout.photoSlots ?? [];
  const timelineEvents = layout.events ?? [];

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
            <Ionicons name="image-outline" size={14} color={templateWireframe.icon} />
          </View>
        ))}

        {timelineEvents.map((event) => (
          <React.Fragment key={event.id}>
            <View
              style={[
                styles.box,
                styles.photo,
                {
                  left: `${event.photo.x * 100}%`,
                  top: `${event.photo.y * 100}%`,
                  width: `${event.photo.w * 100}%`,
                  height: `${event.photo.h * 100}%`,
                },
              ]}
            >
              <Ionicons name="image-outline" size={14} color={templateWireframe.icon} />
            </View>
            {renderTextWireframe(event.date, values)}
            {renderTextWireframe(event.description, values)}
          </React.Fragment>
        ))}

        {(layout.textBlocks ?? []).map((block) => renderTextWireframe(block, values))}
      </View>
    </View>
  );
});

function renderTextWireframe(
  block: {
    id: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
  },
  values?: PageValues,
) {
  const fieldValue = getFieldPreviewValue(values, block.id);
  const captionValue =
    block.type === 'caption'
      ? values?.caption ?? values?.photoCaptions?.[Number(block.id.replace(/\D/g, '')) - 1]
      : undefined;
  const textValue = fieldValue || captionValue;
  const isLongText = block.type === 'longText';
  const isTitle = block.type === 'title';
  const isDate = block.type === 'date';

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
        <Text numberOfLines={isLongText ? 3 : 1} style={styles.textValue}>
          {textValue.trim()}
        </Text>
      ) : (
        <View style={styles.textLines}>
          <View style={[styles.textLine, (isTitle || isDate) && styles.titleLine]} />
          {isLongText ? (
            <>
              <View style={styles.textLine} />
              <View style={[styles.textLine, styles.shortLine]} />
            </>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignItems: 'center',
    backgroundColor: templateWireframe.canvas,
    height: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  frame: {
    backgroundColor: templateWireframe.page,
    borderColor: colors.border,
    borderRadius: radii.xs,
    borderWidth: StyleSheet.hairlineWidth,
    height: '92%',
    overflow: 'hidden',
    position: 'relative',
    ...createPreviewShadow(),
  },
  pageWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: templateWireframe.page,
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    borderRadius: 4,
  },
  photo: {
    backgroundColor: templateWireframe.photoFill,
    borderColor: templateWireframe.photoBorder,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BLANK_ALBUM_PHOTO_RADIUS,
  },
  text: {
    alignItems: 'stretch',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dashed: {
    backgroundColor: templateWireframe.dashedFill,
    borderColor: templateWireframe.dashedBorder,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  textLines: {
    gap: 3,
    width: '100%',
  },
  textLine: {
    backgroundColor: templateWireframe.textLine,
    borderRadius: 999,
    height: 3,
    width: '100%',
  },
  titleLine: {
    backgroundColor: templateWireframe.textLineStrong,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  };
}
