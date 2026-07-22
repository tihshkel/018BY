import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { captureRef } from 'react-native-view-shot';
import PdfAnnotations, { type Annotation } from './pdf-annotations';
import { ReadOnlyPageAnnotations } from './read-only-page-annotations';
import { ALBUM_TEMPLATE_DISPLAY_PROPS } from '@/utils/albumPhotoDisplay';
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
    middleLayer,
  }, ref) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const renderWidth = width ?? windowWidth;
  const renderHeight = height ?? windowHeight;
  const viewRef = useRef<View>(null);
  const onReadyRef = useRef(onReady);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [bgRetryKey, setBgRetryKey] = useState(0);
  const bgRetryCountRef = useRef(0);
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

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    setIsImageLoaded(false);
    setLoadedAnnotationImageUris(new Set());
    bgRetryCountRef.current = 0;
    setBgRetryKey(0);
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
  }, [pendingAnnotationImageUris.join('|')]);

  useEffect(() => {
    if (!isImageLoaded) return;

    const fireReady = () => {
      onReadyRef.current?.();
    };

    if (!waitForAnnotationImages) {
      const timer = setTimeout(fireReady, 80);
      const fallback = setTimeout(fireReady, 1500);
      return () => {
        clearTimeout(timer);
        clearTimeout(fallback);
      };
    }

    const annotationImagesReady =
      pendingAnnotationImageUris.length === 0 ||
      pendingAnnotationImageUris.every((uri) => loadedAnnotationImageUris.has(uri));

    if (!annotationImagesReady) return;

    const settleMs = pendingAnnotationImageUris.length > 0 ? 400 : 150;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        fireReady();
      }
    }, settleMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    isImageLoaded,
    loadedAnnotationImageUris,
    pendingAnnotationImageUris,
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
          key={`${imageUri}::${bgRetryKey}`}
          source={{ uri: imageUri }}
          style={styles.image}
          contentFit="contain"
          contentPosition="center"
          {...ALBUM_TEMPLATE_DISPLAY_PROPS}
          cachePolicy="memory-disk"
          recyclingKey={`${imageUri}::${bgRetryKey}`}
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
            // Retry 2 раза: на Android после логина первый fetch HTTPS часто падает до прогрева сети/кэша.
            if (bgRetryCountRef.current < 2) {
              bgRetryCountRef.current += 1;
              const attempt = bgRetryCountRef.current;
              setTimeout(() => {
                setBgRetryKey((k) => k + 1);
              }, 250 * attempt);
              return;
            }
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
