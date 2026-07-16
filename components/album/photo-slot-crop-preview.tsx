import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PhotoSlotTransform } from '@/types/album-page-schema';
import { resolvePageSourceSize, setPageSourceSize } from '@/utils/pageSourceDimensions';
import { resolvePhotoSlotTransformForDisplay } from '@/utils/photoSlotInitialTransform';
import { applyPhotoSlotTransform, DEFAULT_PHOTO_SLOT_TRANSFORM } from '@/utils/photoSlotTransform';

type PhotoSlotCropPreviewProps = {
  uri: string;
  transform?: PhotoSlotTransform;
};

/**
 * Read-only crop from the form editor — no slot gestures.
 * Preview/export: cover-fill the slot (no letterbox empty half for portrait photos).
 * Zoom-in crop (scale > 1) is preserved; scale < 1 is upgraded to cover.
 */
export function PhotoSlotCropPreview({
  uri,
  transform = DEFAULT_PHOTO_SLOT_TRANSFORM,
}: PhotoSlotCropPreviewProps) {
  const [slotSize, setSlotSize] = useState({ width: 0, height: 0 });
  const [imageAspect, setImageAspect] = useState(0);

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

  const innerStyle = useMemo(() => {
    if (!isZoomedIn || slotSize.width <= 0 || slotSize.height <= 0) return null;

    const rect = applyPhotoSlotTransform(
      { x: 0, y: 0, width: slotSize.width, height: slotSize.height },
      displayTransform,
      imageAspect > 0 ? imageAspect : undefined,
    );
    return {
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }, [displayTransform, imageAspect, isZoomedIn, slotSize.height, slotSize.width]);

  return (
    <View
      style={styles.wrap}
      pointerEvents="none"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setSlotSize({ width, height });
        }
      }}
    >
      {innerStyle ? (
        <View style={[styles.inner, innerStyle]}>
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit="cover"
            recyclingKey={uri}
            onLoad={(event) => {
              const { width, height } = event.source;
              if (width > 0 && height > 0) {
                setPageSourceSize(uri, { width, height });
                setImageAspect(width / height);
              }
            }}
          />
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={styles.fallback}
          contentFit="cover"
          recyclingKey={uri}
          onLoad={(event) => {
            const { width, height } = event.source;
            if (width > 0 && height > 0) {
              setPageSourceSize(uri, { width, height });
              setImageAspect(width / height);
            }
          }}
        />
      )}
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
