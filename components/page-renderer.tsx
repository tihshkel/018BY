import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { captureRef } from 'react-native-view-shot';
import PdfAnnotations, { type Annotation } from './pdf-annotations';
import { ReadOnlyPageAnnotations } from './read-only-page-annotations';
import { setPageSourceSize } from '@/utils/pageSourceDimensions';

export interface PageRendererRef {
  capture: () => Promise<string | null>;
}

type CaptureFormat = 'png' | 'jpg';

interface PageRendererProps {
  imageUri: string;
  annotations: Annotation[];
  width?: number;
  height?: number;
  lineGuideId?: string;
  sourceWidth?: number;
  sourceHeight?: number;
  onReady?: () => void;
  onImageError?: () => void;
  onSourceSize?: (size: { width: number; height: number }) => void;
  captureScale?: number;
  captureFormat?: CaptureFormat;
  captureQuality?: number;
  backgroundColor?: string;
  /** Use lightweight read-only annotations (preview/export) instead of full PdfAnnotations. */
  readOnly?: boolean;
  /** Номер страницы в PDF для калибровки line-slots (designed-альбомы). */
  sourcePageNumber?: number;
  /** Ждать загрузки фото в аннотациях перед onReady (экспорт). Для экрана превью — false. */
  waitForAnnotationImages?: boolean;
  /** Доп. пауза после готовности слоёв перед onReady (экспорт — дать фону дописаться). */
  readySettleMs?: number;
  /** Средний слой между фоном и текстом (например, фото в финальном предпросмотре). */
  middleLayer?: React.ReactNode;
}

/**
 * Компонент для рендеринга страницы редактора для экспорта
 * Рендерит страницу точно так же, как в редакторе, и может делать скриншот
 */
const PageRenderer = React.forwardRef<PageRendererRef, PageRendererProps>(
  ({
    imageUri,
    annotations,
    width,
    height,
    lineGuideId,
    sourceWidth: sourceWidthProp,
    sourceHeight: sourceHeightProp,
    onReady,
    onImageError,
    onSourceSize,
    captureScale = 1.35,
    captureFormat = 'jpg',
    captureQuality = 0.92,
    backgroundColor = 'transparent',
    readOnly = false,
    sourcePageNumber: sourcePageNumberProp,
    waitForAnnotationImages = true,
    readySettleMs,
    middleLayer,
  }, ref) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const renderWidth = width ?? windowWidth;
  const renderHeight = height ?? windowHeight;
  const viewRef = useRef<View>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [loadedAnnotationImageUris, setLoadedAnnotationImageUris] = useState<Set<string>>(new Set());
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(
    sourceWidthProp && sourceHeightProp
      ? { width: sourceWidthProp, height: sourceHeightProp }
      : null
  );

  const pendingAnnotationImageUris = React.useMemo(
    () =>
      annotations
        .filter((ann) => ann.type === 'image' && ann.imageUri)
        .map((ann) => ann.imageUri as string),
    [annotations]
  );

  const sourceWidth = sourceSize?.width ?? sourceWidthProp;
  const sourceHeight = sourceSize?.height ?? sourceHeightProp;
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    setIsImageLoaded(false);
    setLoadedAnnotationImageUris(new Set());
    setSourceSize(
      sourceWidthProp && sourceHeightProp
        ? { width: sourceWidthProp, height: sourceHeightProp }
        : null,
    );
  }, [imageUri]);

  useEffect(() => {
    if (!sourceWidthProp || !sourceHeightProp) return;
    setSourceSize({ width: sourceWidthProp, height: sourceHeightProp });
  }, [sourceWidthProp, sourceHeightProp]);

  useEffect(() => {
    setLoadedAnnotationImageUris(new Set());
  }, [imageUri, pendingAnnotationImageUris.join('|')]);

  useEffect(() => {
    if (!isImageLoaded || waitForAnnotationImages) return;
    onReadyRef.current?.();
  }, [imageUri, isImageLoaded, waitForAnnotationImages]);

  useEffect(() => {
    if (!isImageLoaded || !waitForAnnotationImages) return;

    const annotationImagesReady =
      pendingAnnotationImageUris.length === 0 ||
      pendingAnnotationImageUris.every((uri) => loadedAnnotationImageUris.has(uri));

    if (!annotationImagesReady) return;

    const settleMs =
      readySettleMs ??
      (pendingAnnotationImageUris.length > 0 ? 400 : 150);

    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        onReadyRef.current?.();
      }
    }, settleMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    imageUri,
    isImageLoaded,
    loadedAnnotationImageUris,
    pendingAnnotationImageUris,
    readySettleMs,
    waitForAnnotationImages,
  ]);

  useEffect(() => {
    if (!isImageLoaded || !waitForAnnotationImages) return;

    const timeoutMs = pendingAnnotationImageUris.length > 0 ? 5000 : 2500;
    const timer = setTimeout(() => {
      onReadyRef.current?.();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [imageUri, isImageLoaded, pendingAnnotationImageUris.length, waitForAnnotationImages]);

  const handleAnnotationImageLoad = React.useCallback((uri: string) => {
    setLoadedAnnotationImageUris((prev) => {
      if (prev.has(uri)) return prev;
      const next = new Set(prev);
      next.add(uri);
      return next;
    });
  }, []);

  const markAnnotationImageSettled = React.useCallback(
    (uri: string) => {
      handleAnnotationImageLoad(uri);
    },
    [handleAnnotationImageLoad],
  );

  const capture = async (): Promise<string | null> => {
    if (!viewRef.current || !isImageLoaded) {
      return null;
    }

    try {
      const uri = await captureRef(viewRef, {
        format: captureFormat,
        quality: captureQuality,
        result: 'tmpfile',
        width: renderWidth * captureScale,
        height: renderHeight * captureScale,
        snapshotContentContainer: false,
      });
      
      return uri || null;
    } catch (error) {
      console.error('[PageRenderer] Ошибка при создании скриншота:', error);
      return null;
    }
  };

  React.useImperativeHandle(ref, () => ({
    capture,
  }));

  return (
    <View
      ref={viewRef}
      style={[
        styles.container,
        {
          width: renderWidth,
          height: renderHeight,
          backgroundColor,
        },
      ]}
      collapsable={false}
    >
      <View
        style={[
          styles.imageContainer,
          {
            width,
            height,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          contentFit="contain"
          contentPosition="center"
          transition={0}
          fadeDuration={0}
          cachePolicy="disk"
          priority="high"
          allowDownscaling={false}
          onLoad={(event) => {
            const w = event.source?.width;
            const h = event.source?.height;
            if (w && h) {
              const nextSourceSize = { width: w, height: h };
              setSourceSize(nextSourceSize);
              setPageSourceSize(imageUri, nextSourceSize);
              onSourceSize?.(nextSourceSize);
            }
            setIsImageLoaded(true);
          }}
          onError={() => {
            setIsImageLoaded(true);
            onImageError?.();
          }}
        />

        {isImageLoaded && middleLayer ? (
          <View style={styles.middleLayer} pointerEvents="box-none">
            {middleLayer}
          </View>
        ) : null}

        {isImageLoaded && (
          <View style={styles.annotationsLayer} pointerEvents="box-none">
            {readOnly ? (
              <ReadOnlyPageAnnotations
                annotations={annotations}
                lineGuideId={lineGuideId}
                sourcePageNumber={
                  sourcePageNumberProp ??
                  (typeof annotations[0]?.sourcePageNumber === 'number'
                    ? annotations[0].sourcePageNumber
                    : typeof annotations[0]?.page === 'number'
                      ? annotations[0].page
                      : undefined)
                }
                viewportWidth={renderWidth}
                viewportHeight={renderHeight}
                sourceWidth={sourceWidth}
                sourceHeight={sourceHeight}
                onImageAnnotationLoad={markAnnotationImageSettled}
                onImageAnnotationError={markAnnotationImageSettled}
              />
            ) : (
              <PdfAnnotations
                annotations={annotations}
                onAnnotationAdd={() => {}}
                onAnnotationUpdate={() => {}}
                onAnnotationDelete={() => {}}
                isEditing={false}
                currentTool={null}
                zoomLevel={1}
                viewportWidth={renderWidth}
                viewportHeight={renderHeight}
                sourceWidth={sourceWidth}
                sourceHeight={sourceHeight}
                lineGuideId={lineGuideId}
                onImageAnnotationLoad={handleAnnotationImageLoad}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
  }
);

PageRenderer.displayName = 'PageRenderer';

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  middleLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  annotationsLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
});

export default PageRenderer;
