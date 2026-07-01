import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, BLANK_ALBUM_PHOTO_RADIUS, radii } from '@/constants/design-tokens';
import type { PhotoBlockSchema } from '@/types/album-page-schema';
import { getContentRect } from '@/utils/imageContentRect';
import { getPhotoSlotViewportRect } from '@/utils/photoSlots';

type AlbumPreviewPhotoOverlayProps = {
  lineGuideId: string;
  sourcePageNumber: number;
  block: PhotoBlockSchema;
  variantId: string;
  slotUris: (string | null)[];
  coordinateWidth: number;
  coordinateHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
  onPickPhoto: (slotIndex: number) => void;
  onReplacePhoto?: (slotIndex: number) => void;
};

export function AlbumPreviewPhotoOverlay({
  lineGuideId,
  sourcePageNumber,
  block,
  variantId,
  slotUris,
  coordinateWidth,
  coordinateHeight,
  sourceWidth,
  sourceHeight,
  onPickPhoto,
  onReplacePhoto,
}: AlbumPreviewPhotoOverlayProps) {
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

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {Array.from({ length: slotCount }).map((_, slotIndex) => {
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

        const uri = slotUris[slotIndex];
        const slotLabel = slotCount > 1 ? `Фото ${slotIndex + 1}` : 'Фото';

        if (uri) {
          return (
            <Pressable
              key={slotIndex}
              testID={`preview-photo-slot-${slotIndex}`}
              onPress={() => (onReplacePhoto ?? onPickPhoto)(slotIndex)}
              style={[
                styles.filledHitArea,
                {
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Заменить ${slotLabel}`}
            >
              <View style={styles.replaceBadge}>
                <Ionicons name="camera-outline" size={14} color={colors.white} />
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={slotIndex}
            testID={`preview-photo-slot-${slotIndex}`}
            onPress={() => onPickPhoto(slotIndex)}
            style={[
              styles.emptySlot,
              {
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Добавить ${slotLabel}`}
          >
            <View style={styles.emptyInner}>
              <Ionicons name="camera-outline" size={28} color="#B8B8B8" />
              <AppText variant="bodySm" style={styles.emptyTitle}>
                Место для фото
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  emptySlot: {
    position: 'absolute',
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: '#D8D8D8',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  emptyInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    color: '#B8B8B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  filledHitArea: {
    position: 'absolute',
    borderRadius: BLANK_ALBUM_PHOTO_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  replaceBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});
