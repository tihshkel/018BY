import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PhotoSlotGestureLayer } from '@/components/album/photo-slot-gesture-layer';
import { BLANK_ALBUM_PHOTO_RADIUS } from '@/constants/design-tokens';
import type { PhotoBlockSchema, PhotoSlotTransform } from '@/types/album-page-schema';
import { getContentRect } from '@/utils/imageContentRect';
import { getPhotoSlotViewportRect } from '@/utils/photoSlots';
import {
  DEFAULT_PHOTO_SLOT_TRANSFORM,
  photoSlotTransformKey,
} from '@/utils/photoSlotTransform';

type AlbumPreviewPhotoGestureOverlayProps = {
  lineGuideId: string;
  sourcePageNumber: number;
  block: PhotoBlockSchema;
  variantId: string;
  slotUris: (string | null)[];
  slotTransforms: Record<string, PhotoSlotTransform>;
  coordinateWidth: number;
  coordinateHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
  onSlotTransformChange: (slotIndex: number, transform: PhotoSlotTransform) => void;
};

export function AlbumPreviewPhotoGestureOverlay({
  lineGuideId,
  sourcePageNumber,
  block,
  variantId,
  slotUris,
  slotTransforms,
  coordinateWidth,
  coordinateHeight,
  sourceWidth,
  sourceHeight,
  onSlotTransformChange,
}: AlbumPreviewPhotoGestureOverlayProps) {
  const variant =
    block.variants.find((item) => item.variantId === variantId) ?? block.variants[0];
  const slotCount = variant?.slots ?? slotUris.length;

  const contentRect = useMemo(
    () =>
      getContentRect(
        coordinateWidth,
        coordinateHeight,
        sourceWidth ?? coordinateWidth,
        sourceHeight ?? coordinateHeight,
      ),
    [coordinateHeight, coordinateWidth, sourceHeight, sourceWidth],
  );

  if (!variant || slotCount === 0) return null;

  const filledCount = slotUris.filter(Boolean).length;
  if (filledCount === 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {Array.from({ length: slotCount }).map((_, slotIndex) => {
        const uri = slotUris[slotIndex];
        if (!uri) return null;

        const rect = getPhotoSlotViewportRect({
          lineGuideId,
          page: sourcePageNumber,
          variantId: variant.variantId,
          slotIndex,
          viewportWidth: coordinateWidth,
          viewportHeight: coordinateHeight,
          sourceWidth,
          sourceHeight,
          contentRect,
        });

        if (!rect) return null;

        const transformKey = photoSlotTransformKey(block.blockId, slotIndex);
        const transform = slotTransforms[transformKey] ?? DEFAULT_PHOTO_SLOT_TRANSFORM;
        const slotLabel = slotCount > 1 ? `Фото ${slotIndex + 1}` : 'Фото';

        return (
          <View
            key={slotIndex}
            style={[
              styles.slotWrap,
              {
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
              },
            ]}
          >
            <PhotoSlotGestureLayer
              uri={uri}
              slotLabel={slotLabel}
              slotIndex={slotIndex}
              transform={transform}
              gesturesEnabled
              chromeStyle="overlay"
              onPressEmpty={() => {}}
              onTransformChange={(next) => onSlotTransformChange(slotIndex, next)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
  },
  slotWrap: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: BLANK_ALBUM_PHOTO_RADIUS,
  },
});
