import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlbumPhotoImageRaw } from '@/components/album/album-photo-image';
import type { PhotoSlotTransform } from '@/types/album-page-schema';
import { androidDecodeSize } from '@/utils/androidImageDecode';
import { resolvePageSourceSize, setPageSourceSize } from '@/utils/pageSourceDimensions';
import { resolvePhotoSlotTransformForDisplay } from '@/utils/photoSlotInitialTransform';
import { applyPhotoSlotTransform, DEFAULT_PHOTO_SLOT_TRANSFORM } from '@/utils/photoSlotTransform';

type PhotoSlotCropPreviewProps = {
  uri: string;
  transform?: PhotoSlotTransform;
  /** Known viewport px — mount Image immediately at real size (no 1×1 decode). */
  knownWidth?: number;
  knownHeight?: number;
};

/**
 * Read-only crop from the form editor — no slot gestures.
 * Preview/export: cover-fill the slot (no letterbox empty half for portrait photos).
 * Zoom-in crop (scale > 1) is preserved; scale < 1 is upgraded to cover.
 */
export function PhotoSlotCropPreview({
  uri,
  transform = DEFAULT_PHOTO_SLOT_TRANSFORM,
  knownWidth,
  knownHeight,
}: PhotoSlotCropPreviewProps) {
  const initialW = knownWidth && knownWidth > 8 ? knownWidth : 0;
  const initialH = knownHeight && knownHeight > 8 ? knownHeight : 0;
  const [slotSize, setSlotSize] = useState({ width: initialW, height: initialH });
  const [imageAspect, setImageAspect] = useState(0);
  const decodeSize = useMemo(
    () => androidDecodeSize(slotSize.width, slotSize.height, 1.75),
    [slotSize.height, slotSize.width],
  );

  useEffect(() => {
    if (knownWidth && knownWidth > 8 && knownHeight && knownHeight > 8) {
      setSlotSize({ width: knownWidth, height: knownHeight });
    }
  }, [knownHeight, knownWidth]);

  useEffect(() => {
    let cancelled = false;
    resolvePageSourceSize(uri).then((size) => {
      if (cancelled || !size?.width || !size?.height) return;
      setImageAspect(size.width / size.height);
    });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const displayTransform = useMemo(() => {
    if (slotSize.width <= 0 || slotSize.height <= 0) {
      return resolvePhotoSlotTransformForDisplay(transform, 1, 1, undefined, {
        fillLetterbox: true,
      });
    }
    return resolvePhotoSlotTransformForDisplay(
      transform,
      slotSize.width,
      slotSize.height,
      imageAspect > 0 ? imageAspect : undefined,
      { fillLetterbox: true },
    );
  }, [imageAspect, slotSize.height, slotSize.width, transform]);

  const scale = displayTransform.scale ?? 1;
  const isZoomedIn = scale > 1.02;

  const frameStyle = useMemo(() => {
    if (!isZoomedIn || slotSize.width <= 0 || slotSize.height <= 0) {
      return styles.fallback;
    }

    const rect = applyPhotoSlotTransform(
      { x: 0, y: 0, width: slotSize.width, height: slotSize.height },
      displayTransform,
      imageAspect > 0 ? imageAspect : undefined,
    );
    return {
      ...styles.inner,
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }, [displayTransform, imageAspect, isZoomedIn, slotSize.height, slotSize.width]);

  const hasRealSlotSize = slotSize.width > 8 && slotSize.height > 8;

  return (
    <View
      style={styles.wrap}
      pointerEvents="none"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 8 && height > 8) {
          setSlotSize((prev) =>
            Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
              ? prev
              : { width, height },
          );
        }
      }}
    >
      {hasRealSlotSize ? (
        <View style={frameStyle}>
          <AlbumPhotoImageRaw
            uri={uri}
            style={styles.image}
            allowDownscaling
            decodeWidth={decodeSize?.width ?? slotSize.width}
            decodeHeight={decodeSize?.height ?? slotSize.height}
            recyclingKey={`${uri}:${Math.round(slotSize.width)}x${Math.round(slotSize.height)}`}
            onLoad={() => {
              void resolvePageSourceSize(uri).then((size) => {
                if (size?.width && size?.height) {
                  setPageSourceSize(uri, size);
                  setImageAspect(size.width / size.height);
                }
              });
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  inner: {
    position: 'absolute',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
  },
});
