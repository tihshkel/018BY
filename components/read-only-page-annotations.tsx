import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Annotation } from '@/components/pdf-annotations';
import { AVAILABLE_FONTS, getAlbumFontFamilyName } from '@/constants/album-fonts';
import { useDevRenderCount } from '@/hooks/use-dev-render-count';
import { applyPhotoSlotTransform } from '@/utils/photoSlotTransform';
import { getCachedPageSourceSize, setPageSourceSize } from '@/utils/pageSourceDimensions';
import {
  getLineSlotsForPage,
} from '@/utils/textLineSlots';
import { getTemplateTypographyProfile } from '@/constants/album-text-margins';
import {
  distributeTextForTemplateAnnotation,
  getEffectiveTemplateFontSize,
  getTemplateBlockTextInsets,
  getTemplateLineRowInsets,
  getTemplateLineTextTop,
  getTemplateLineTypography,
  getWishSlotInputKind,
  usesStrokeBaselineLayout,
} from '@/utils/templateLineText';
import { maxLinesForBoxHeight, wrapTextToLines } from '@/utils/textWrap';

type ReadOnlyPageAnnotationsProps = {
  annotations: Annotation[];
  lineGuideId?: string;
  sourcePageNumber?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  onImageAnnotationLoad?: (uri: string) => void;
  onImageAnnotationError?: (uri: string) => void;
};

function WrappedTemplateText({
  content,
  width,
  height,
  fontSize,
  fontFamily,
  color,
  textAlign,
}: {
  content: string;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string | undefined;
  color: string;
  textAlign: 'left' | 'center' | 'right' | 'auto' | 'justify' | undefined;
}) {
  const boxWidth = Math.max(1, width || 360);
  const boxHeight = Math.max(fontSize, height || fontSize * 2);
  const lineHeight = fontSize * 1.2;
  const maxLines = maxLinesForBoxHeight(boxHeight, fontSize);
  const lines = wrapTextToLines(content, boxWidth, fontSize).slice(0, maxLines);

  return (
    <>
      {lines.map((line, lineIndex) => (
        <Text
          key={`${lineIndex}-${line.slice(0, 8)}`}
          style={[
            styles.text,
            {
              color,
              fontSize,
              fontFamily,
              lineHeight,
              textAlign: textAlign ?? 'left',
              maxWidth: boxWidth,
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {line}
        </Text>
      ))}
    </>
  );
}

/**
 * Lightweight read-only overlay for PageRenderer preview/export capture.
 * Renders text and photo slots without editing chrome or PanResponders.
 */
function ReadOnlyPageAnnotationsInner({
  annotations,
  lineGuideId,
  sourcePageNumber,
  viewportWidth,
  viewportHeight,
  sourceWidth,
  sourceHeight,
  onImageAnnotationLoad,
  onImageAnnotationError,
}: ReadOnlyPageAnnotationsProps) {
  useDevRenderCount('ReadOnlyPageAnnotations');

  const [imageAspectByUri, setImageAspectByUri] = useState<Record<string, number>>({});

  const resolveImageAspect = useCallback((uri: string): number | undefined => {
    const local = imageAspectByUri[uri];
    if (local && local > 0) return local;
    const cached = getCachedPageSourceSize(uri);
    if (cached && cached.width > 0 && cached.height > 0) {
      return cached.width / cached.height;
    }
    return undefined;
  }, [imageAspectByUri]);

  const handleAnnotationImageLoaded = useCallback(
    (uri: string, width: number, height: number) => {
      if (width > 0 && height > 0) {
        setPageSourceSize(uri, { width, height });
        setImageAspectByUri((prev) => {
          const aspect = width / height;
          if (prev[uri] === aspect) return prev;
          return { ...prev, [uri]: aspect };
        });
      }
      onImageAnnotationLoad?.(uri);
    },
    [onImageAnnotationLoad],
  );

  const [fontsLoaded] = useFonts(
    AVAILABLE_FONTS.reduce(
      (acc, font) => {
        if (font.file && font.id !== 'default') {
          acc[font.name] = font.file;
        }
        return acc;
      },
      {} as Record<string, number>,
    ),
  );

  const sorted = useMemo(
    () => [...annotations].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)),
    [annotations],
  );

  const lineSlots = useMemo(() => {
    if (
      !lineGuideId ||
      !sourcePageNumber ||
      !viewportWidth ||
      !viewportHeight ||
      viewportWidth <= 0 ||
      viewportHeight <= 0 ||
      !sourceWidth ||
      !sourceHeight ||
      sourceWidth <= 0 ||
      sourceHeight <= 0
    ) {
      return null;
    }
    return getLineSlotsForPage({
      lineGuideId,
      page: sourcePageNumber,
      viewportWidth,
      viewportHeight,
      sourceWidth,
      sourceHeight,
    });
  }, [
    lineGuideId,
    sourceHeight,
    sourcePageNumber,
    sourceWidth,
    viewportHeight,
    viewportWidth,
  ]);

  const profile = getTemplateTypographyProfile(lineGuideId);
  const defaultFontSize = profile.fixedLineFontSize ?? 16;

  return (
    <View style={styles.layer} pointerEvents="box-none">
      {sorted.map((annotation) => {
        if (annotation.type === 'text' && annotation.content) {
          const fontFamily = fontsLoaded
            ? getAlbumFontFamilyName(annotation.fontFamily)
            : undefined;
          const fontSize = annotation.fontSize ?? defaultFontSize;
          const usesTemplateLineSlots = typeof annotation.templateLineStart === 'number';
          const startIndex = annotation.templateLineStart ?? 0;
          const slotCount = annotation.templateLineCount ?? 1;

          if (usesTemplateLineSlots && lineSlots != null && lineSlots[startIndex]) {
            const { segments } = distributeTextForTemplateAnnotation({
              text: annotation.content,
              startSlotIndex: startIndex,
              slots: lineSlots,
              fontSize,
              lineGuideId,
              fontId: annotation.fontFamily,
              lineCount: slotCount,
            });

            const linesToRender = segments
              .map((segment) => {
                const lineSlot = lineSlots[segment.slotIndex];
                if (!lineSlot || !segment.content) return null;
                return {
                  slotIndex: segment.slotIndex,
                  content: segment.content,
                  lineSlot,
                };
              })
              .filter((row): row is NonNullable<typeof row> => row != null);

            if (linesToRender.length === 0) {
              return null;
            }

            return (
              <React.Fragment key={annotation.id}>
                {linesToRender.map((row) => {
                  const rowFontSize = getEffectiveTemplateFontSize(
                    lineGuideId,
                    row.lineSlot,
                    fontSize,
                    {
                      textContent: row.content,
                      fontId: annotation.fontFamily,
                    },
                  );
                  const rowTop = getTemplateLineTextTop(
                    row.lineSlot,
                    rowFontSize,
                    lineGuideId,
                    lineSlots ?? undefined,
                  );
                  const rowTypography = getTemplateLineTypography(
                    rowFontSize,
                    row.lineSlot.lineHeight,
                    getWishSlotInputKind(row.lineSlot, lineGuideId),
                    lineGuideId,
                  );
                  const wishInputKind = getWishSlotInputKind(row.lineSlot, lineGuideId);
                  const usesStrokeBaseline = usesStrokeBaselineLayout(row.lineSlot, lineGuideId);
                  const { viewportTopInset, textTopInset } = getTemplateLineRowInsets(
                    row.lineSlot,
                    rowTypography.fontSize,
                    wishInputKind,
                    lineGuideId,
                  );
                  const textInsets = getTemplateBlockTextInsets(row.lineSlot, lineGuideId);
                  const isKidsTeethOverlayLine =
                    lineGuideId === 'kids_48' &&
                    row.lineSlot.page === 10 &&
                    row.lineSlot.index !== 21;
                  return (
                    <View
                      key={`${annotation.id}-line-${row.slotIndex}`}
                      style={[
                        styles.annotation,
                        {
                          left: row.lineSlot.x + textInsets.left,
                          top: rowTop - viewportTopInset,
                          width: textInsets.width || row.lineSlot.width,
                          height: isKidsTeethOverlayLine
                            ? rowTypography.fontSize + 2
                            : rowTypography.lineHeight + viewportTopInset,
                          zIndex: annotation.zIndex,
                          overflow: isKidsTeethOverlayLine || usesStrokeBaseline
                            ? 'visible'
                            : 'hidden',
                        },
                      ]}
                      pointerEvents="none"
                    >
                      <Text
                        style={[
                          styles.text,
                          {
                            position: 'absolute',
                            top: textTopInset,
                            left: 0,
                            color: annotation.color ?? '#3D3D3D',
                            fontSize: rowTypography.fontSize,
                            fontFamily,
                            lineHeight: usesStrokeBaseline
                              ? rowTypography.fontSize
                              : rowTypography.lineHeight,
                            textAlign: annotation.textAlign ?? 'left',
                            maxWidth: textInsets.width || row.lineSlot.width,
                            includeFontPadding: false,
                          },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="clip"
                      >
                        {row.content}
                      </Text>
                    </View>
                  );
                })}
              </React.Fragment>
            );
          }

          const layout = {
            x: annotation.x,
            y: annotation.y,
            width: annotation.width,
            height: annotation.height,
          };
          return (
            <View
              key={annotation.id}
              style={[
                styles.annotation,
                {
                  left: layout.x,
                  top: layout.y,
                  width: layout.width,
                  height: layout.height,
                  zIndex: annotation.zIndex,
                  overflow: 'hidden',
                },
              ]}
              pointerEvents="none"
            >
              <WrappedTemplateText
                content={annotation.content}
                width={layout.width || 360}
                height={layout.height || fontSize * 2}
                fontSize={fontSize}
                fontFamily={fontFamily}
                color={annotation.color ?? '#3D3D3D'}
                textAlign={annotation.textAlign}
              />
            </View>
          );
        }

        if (annotation.type !== 'image') return null;

        const isCircle = annotation.clipShape === 'circle';
        const circleRadius = isCircle
          ? Math.min(annotation.width, annotation.height) / 2
          : 0;
        const circleClipStyle = isCircle
          ? { borderRadius: circleRadius, overflow: 'hidden' as const }
          : undefined;

        if (!annotation.imageUri && annotation.fillColor) {
          const fillSize = isCircle
            ? Math.min(annotation.width, annotation.height)
            : null;
          const fillLeft = isCircle
            ? annotation.x + (annotation.width - fillSize!) / 2
            : annotation.x;
          const fillTop = isCircle
            ? annotation.y + (annotation.height - fillSize!) / 2
            : annotation.y;
          const fillWidth = fillSize ?? annotation.width;
          const fillHeight = fillSize ?? annotation.height;
          const fillRadius = isCircle ? fillWidth / 2 : circleRadius;

          return (
            <View
              key={annotation.id}
              style={[
                styles.annotation,
                {
                  left: fillLeft,
                  top: fillTop,
                  width: fillWidth,
                  height: fillHeight,
                  zIndex: annotation.zIndex,
                  backgroundColor: annotation.fillColor,
                  opacity: annotation.fillOpacity ?? 1,
                  borderRadius: fillRadius,
                },
              ]}
              pointerEvents="none"
            />
          );
        }

        if (!annotation.imageUri) return null;

        const handleAnnotationImageSettled = (event: {
          source?: { width?: number; height?: number };
        }) => {
          const width = event.source?.width ?? 0;
          const height = event.source?.height ?? 0;
          handleAnnotationImageLoaded(annotation.imageUri!, width, height);
        };
        const handleAnnotationImageFailed = () => {
          onImageAnnotationError?.(annotation.imageUri!);
        };

        const imageAspect = resolveImageAspect(annotation.imageUri);

        const innerStyle = annotation.imageSlotTransform
          ? (() => {
              const inner = applyPhotoSlotTransform(
                { x: 0, y: 0, width: annotation.width, height: annotation.height },
                annotation.imageSlotTransform,
                imageAspect,
              );
              return {
                left: inner.x,
                top: inner.y,
                width: inner.width,
                height: inner.height,
              };
            })()
          : null;

        return (
          <View
            key={annotation.id}
            style={[
              styles.annotation,
              {
                left: annotation.x,
                top: annotation.y,
                width: annotation.width,
                height: annotation.height,
                zIndex: annotation.zIndex,
              },
            ]}
            pointerEvents="none"
          >
            <View style={[styles.imageClip, circleClipStyle]}>
              {innerStyle ? (
                <View style={[styles.imageInner, innerStyle]}>
                  <Image
                    source={{ uri: annotation.imageUri }}
                    style={styles.imageFill}
                    contentFit={annotation.imageContentFit ?? 'cover'}
                    cachePolicy="disk"
                    transition={0}
                    fadeDuration={0}
                    allowDownscaling
                    recyclingKey={annotation.id}
                    onLoad={handleAnnotationImageSettled}
                    onError={handleAnnotationImageFailed}
                  />
                </View>
              ) : (
                <Image
                  source={{ uri: annotation.imageUri }}
                  style={styles.imageFill}
                  contentFit={annotation.imageContentFit ?? 'cover'}
                  cachePolicy="disk"
                  transition={0}
                  fadeDuration={0}
                  allowDownscaling
                  recyclingKey={annotation.id}
                  onLoad={handleAnnotationImageSettled}
                  onError={handleAnnotationImageFailed}
                />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function areReadOnlyAnnotationsEqual(
  prev: ReadOnlyPageAnnotationsProps,
  next: ReadOnlyPageAnnotationsProps,
): boolean {
  return (
    prev.annotations === next.annotations &&
    prev.lineGuideId === next.lineGuideId &&
    prev.sourcePageNumber === next.sourcePageNumber &&
    prev.viewportWidth === next.viewportWidth &&
    prev.viewportHeight === next.viewportHeight &&
    prev.sourceWidth === next.sourceWidth &&
    prev.sourceHeight === next.sourceHeight &&
    prev.onImageAnnotationLoad === next.onImageAnnotationLoad &&
    prev.onImageAnnotationError === next.onImageAnnotationError
  );
}

export const ReadOnlyPageAnnotations = React.memo(
  ReadOnlyPageAnnotationsInner,
  areReadOnlyAnnotationsEqual,
);

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  annotation: {
    position: 'absolute',
  },
  text: {
    includeFontPadding: false,
  },
  imageClip: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  imageInner: {
    position: 'absolute',
    overflow: 'hidden',
  },
  imageFill: {
    width: '100%',
    height: '100%',
  },
});
