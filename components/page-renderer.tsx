import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { captureRef } from 'react-native-view-shot';
import PdfAnnotations, { type Annotation } from './pdf-annotations';
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

  useEffect(() => {
    setLoadedAnnotationImageUris(new Set());
  }, [imageUri, pendingAnnotationImageUris.join('|')]);

  useEffect(() => {
    if (!isImageLoaded || !onReady) return;

    const annotationImagesReady =
      pendingAnnotationImageUris.length === 0 ||
      pendingAnnotationImageUris.every((uri) => loadedAnnotationImageUris.has(uri));

    if (!annotationImagesReady) return;

    const settleMs = pendingAnnotationImageUris.length > 0 ? 400 : 150;

    const timer = setTimeout(() => {
      onReady();
    }, settleMs);

    return () => clearTimeout(timer);
  }, [isImageLoaded, loadedAnnotationImageUris, pendingAnnotationImageUris, onReady]);

  const handleAnnotationImageLoad = React.useCallback((uri: string) => {
    setLoadedAnnotationImageUris((prev) => {
      if (prev.has(uri)) return prev;
      const next = new Set(prev);
      next.add(uri);
      return next;
    });
  }, []);

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

        {isImageLoaded && (
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
});

export default PageRenderer;
