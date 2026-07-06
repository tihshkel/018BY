import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AlbumPreviewPhotoOverlay } from '@/components/album/album-preview-photo-overlay';
import PageRenderer, { type PageRendererRef } from '@/components/page-renderer';
import { AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';
import { useAlbumPagePreviewLayout } from '@/hooks/use-album-editor-layout';
import { resolveEditorPageSourceSize } from '@/utils/pageSourceDimensions';
import type { Annotation } from '@/components/pdf-annotations';
import type { PhotoBlockSchema } from '@/types/album-page-schema';

type AlbumPageLivePreviewProps = {
  imageUri?: string | null;
  annotations: Annotation[];
  lineGuideId: string;
  sourcePageNumber?: number;
  hint?: string;
  photoOverlay?: {
    sourcePageNumber: number;
    block: PhotoBlockSchema;
    variantId: string;
    slotUris: (string | null)[];
    onPickPhoto: (slotIndex: number) => void;
    onReplacePhoto?: (slotIndex: number) => void;
  };
};

export function AlbumPageLivePreview({
  imageUri,
  annotations,
  lineGuideId,
  sourcePageNumber,
  hint = 'Предпросмотр — так страница будет выглядеть в альбоме. Нажмите на зону «Место для фото», чтобы добавить снимок.',
  photoOverlay,
}: AlbumPageLivePreviewProps) {
  const rendererRef = useRef<PageRendererRef>(null);
  const [ready, setReady] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(1.414);
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);
  const previewLayout = useAlbumPagePreviewLayout(imageAspectRatio);
  const resolvedSourceSize = useMemo(
    () =>
      resolveEditorPageSourceSize({
        lineGuideId,
        measured: sourceSize,
        viewportFallback: {
          width: previewLayout.coordinateWidth,
          height: previewLayout.coordinateHeight,
        },
      }),
    [
      lineGuideId,
      previewLayout.coordinateHeight,
      previewLayout.coordinateWidth,
      sourceSize,
    ],
  );

  useEffect(() => {
    setReady(false);
  }, [imageUri]);

  const handleSourceSize = useCallback((size: { width: number; height: number }) => {
    if (size.width > 0 && size.height > 0) {
      setSourceSize({ width: size.width, height: size.height });
      setImageAspectRatio(size.height / size.width);
      setReady(true);
    }
  }, []);

  const handlePageReady = useCallback(() => {
    setReady(true);
  }, []);

  const previewBlock = useMemo(
    () => (
      <View
        style={[
          styles.pageShadowWrap,
          {
            width: previewLayout.displayWidth,
            height: previewLayout.displayHeight,
          },
        ]}
      >
        <View
          style={[
            styles.pageScaleWrap,
            {
              width: previewLayout.coordinateWidth,
              height: previewLayout.coordinateHeight,
              transform: [{ scale: previewLayout.displayScale }],
            },
          ]}
        >
          <View
            style={[
              styles.pageCard,
              {
                width: previewLayout.coordinateWidth,
                height: previewLayout.coordinateHeight,
              },
            ]}
          >
            {imageUri ? (
              <PageRenderer
                ref={rendererRef}
                imageUri={imageUri}
                annotations={annotations}
                width={previewLayout.coordinateWidth}
                height={previewLayout.coordinateHeight}
                sourceWidth={resolvedSourceSize.width}
                sourceHeight={resolvedSourceSize.height}
                lineGuideId={lineGuideId}
                sourcePageNumber={sourcePageNumber}
                backgroundColor={colors.white}
                readOnly
                waitForAnnotationImages={false}
                onReady={handlePageReady}
                onSourceSize={handleSourceSize}
              />
            ) : null}
            {photoOverlay && imageUri && ready ? (
              <AlbumPreviewPhotoOverlay
                lineGuideId={lineGuideId}
                sourcePageNumber={photoOverlay.sourcePageNumber}
                block={photoOverlay.block}
                variantId={photoOverlay.variantId}
                slotUris={photoOverlay.slotUris}
                coordinateWidth={previewLayout.coordinateWidth}
                coordinateHeight={previewLayout.coordinateHeight}
                onPickPhoto={photoOverlay.onPickPhoto}
                onReplacePhoto={photoOverlay.onReplacePhoto}
              />
            ) : null}
            {!ready && imageUri ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    ),
    [
      annotations,
      imageUri,
      lineGuideId,
      previewLayout.coordinateHeight,
      previewLayout.coordinateWidth,
      previewLayout.displayHeight,
      previewLayout.displayScale,
      previewLayout.displayWidth,
      ready,
      photoOverlay,
    ]
  );

  return (
    <View style={styles.wrap}>
      <AppText variant="bodySm" style={styles.hint}>
        {hint}
      </AppText>
      <View style={styles.center}>{previewBlock}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  hint: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  center: {
    alignItems: 'center',
  },
  pageShadowWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  pageScaleWrap: {
    transformOrigin: 'top left',
  },
  pageCard: {
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
