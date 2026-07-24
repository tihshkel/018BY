import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PhotoSlotGestureLayer } from '@/components/album/photo-slot-gesture-layer';
import { AppText } from '@/components/ui';
import { colors, radii, spacing, surfaces } from '@/constants/design-tokens';
import type { PhotoBlockSchema, PhotoSlotTransform } from '@/types/album-page-schema';
import {
  getCollageAspectRatio,
  getCollageSlotFrames,
  getPageCalibratedCollageLayout,
} from '@/utils/photoSlotGridLayout';
import {
  DEFAULT_PHOTO_SLOT_TRANSFORM,
  photoSlotTransformKey,
} from '@/utils/photoSlotTransform';

type AlbumPhotoSlotGridProps = {
  block: PhotoBlockSchema;
  selectedVariantId: string;
  slotUris: (string | null)[];
  slotTransforms: Record<string, PhotoSlotTransform>;
  groupTransform?: PhotoSlotTransform;
  lineGuideId?: string;
  sourcePageNumber?: number;
  templateLibraryId?: string;
  onPickPhoto: (slotIndex: number) => void;
  onRemovePhoto?: (slotIndex: number) => void;
  onSlotTransformChange: (slotIndex: number, transform: PhotoSlotTransform) => void;
  onGroupTransformChange?: (transform: PhotoSlotTransform) => void;
  embedded?: boolean;
};

export const AlbumPhotoSlotGrid = React.memo(function AlbumPhotoSlotGrid({
  block,
  selectedVariantId,
  slotUris,
  slotTransforms,
  lineGuideId,
  sourcePageNumber,
  templateLibraryId,
  onPickPhoto,
  onRemovePhoto,
  onSlotTransformChange,
  embedded = false,
}: AlbumPhotoSlotGridProps) {
  const variant =
    block.variants.find((item) => item.variantId === selectedVariantId) ?? block.variants[0];
  const slotCount = variant?.slots ?? slotUris.length;
  const layoutSlotIndices =
    variant?.slotIndices && variant.slotIndices.length === slotCount
      ? variant.slotIndices
      : undefined;
  const filledCount = slotUris.filter(Boolean).length;

  const collageLayout = useMemo(
    () =>
      getPageCalibratedCollageLayout({
        lineGuideId,
        sourcePageNumber,
        variantId: selectedVariantId,
        slotCount,
        templateLibraryId,
        slotIndices: layoutSlotIndices,
      }),
    [layoutSlotIndices, lineGuideId, selectedVariantId, slotCount, sourcePageNumber, templateLibraryId],
  );

  const frames = collageLayout?.frames ?? getCollageSlotFrames(selectedVariantId, slotCount);

  const collageAspect =
    collageLayout?.aspectRatio ?? getCollageAspectRatio(selectedVariantId, slotCount);

  if (!variant) return null;

  return (
    <View style={[styles.section, embedded && styles.sectionEmbedded]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <AppText variant="titleSm">{block.label}</AppText>
          {slotCount > 1 ? (
            <View style={styles.countBadge}>
              <AppText variant="caption" style={styles.countText}>
                {filledCount} / {slotCount}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="bodySm" style={styles.hint}>
          {filledCount === 0
            ? slotCount === 1
              ? 'Нажмите на зону, чтобы добавить фото'
              : `Добавьте до ${slotCount} фото в раскладку`
            : 'Перетаскивайте и масштабируйте каждое фото. Размер всей раскладки — в финальном предпросмотре'}
        </AppText>
      </View>

      <View style={[styles.collage, { aspectRatio: collageAspect }]}>
        {frames.map((frame) => {
          const slotIndex = frame.slotIndex;
          const key = photoSlotTransformKey(block.blockId, slotIndex);
          const transform = slotTransforms[key] ?? DEFAULT_PHOTO_SLOT_TRANSFORM;
          const slotLabel = slotCount > 1 ? `Фото ${slotIndex + 1}` : 'Добавить фото';

          return (
            <View
              key={slotIndex}
              style={[
                styles.slotFrame,
                {
                  left: `${frame.leftPercent}%`,
                  top: `${frame.topPercent}%`,
                  width: `${frame.widthPercent}%`,
                  height: `${frame.heightPercent}%`,
                },
              ]}
            >
              <PhotoSlotGestureLayer
                uri={slotUris[slotIndex]}
                slotLabel={slotLabel}
                slotIndex={slotIndex}
                transform={transform}
                chromeStyle="overlay"
                gesturesEnabled={Boolean(slotUris[slotIndex])}
                onPressEmpty={() => onPickPhoto(slotIndex)}
                onReplacePhoto={() => onPickPhoto(slotIndex)}
                onRemovePhoto={onRemovePhoto ? () => onRemovePhoto(slotIndex) : undefined}
                onTransformChange={(next) => onSlotTransformChange(slotIndex, next)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionEmbedded: {
    paddingTop: spacing.xs,
  },
  header: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  countBadge: {
    backgroundColor: colors.primarySurface,
    borderRadius: radii.lg,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    color: colors.primaryPressed,
    fontWeight: '600',
  },
  hint: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  collage: {
    width: '100%',
    position: 'relative',
    borderRadius: radii.md,
    backgroundColor: surfaces.muted,
    overflow: 'hidden',
    padding: 5,
  },
  slotFrame: {
    position: 'absolute',
    padding: 3,
  },
});
