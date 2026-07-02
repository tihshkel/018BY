import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PhotoSlotTransform } from '@/types/album-page-schema';
import { resolvePageSourceSize } from '@/utils/pageSourceDimensions';
import {
  applyPhotoSlotTransform,
  DEFAULT_PHOTO_SLOT_TRANSFORM,
} from '@/utils/photoSlotTransform';

type PhotoSlotCropPreviewProps = {
  uri: string;
  transform?: PhotoSlotTransform;
};

/**
 * Read-only crop from the form editor — no slot gestures.
 * Used in final preview so only the photo block scale/position can change.
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

  const innerStyle = useMemo(() => {
    if (slotSize.width <= 0 || slotSize.height <= 0) return null;
    const rect = applyPhotoSlotTransform(
      { x: 0, y: 0, width: slotSize.width, height: slotSize.height },
      transform,
      imageAspect > 0 ? imageAspect : undefined,
    );
    return {
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }, [imageAspect, slotSize.height, slotSize.width, transform]);

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
          <Image source={{ uri }} style={styles.image} contentFit="cover" />
        </View>
      ) : (
        <Image source={{ uri }} style={styles.fallback} contentFit="cover" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
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
    width: '100%',
    height: '100%',
  },
});
