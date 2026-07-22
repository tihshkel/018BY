import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LayoutPreviewThumbnail } from '@/components/album/layout-preview-thumbnail';
import { AppText } from '@/components/ui';
import { colors, radii, sansFont, spacing, surfaces } from '@/constants/design-tokens';
import { getCollageAspectRatio, getCollageSlotFrames } from '@/utils/photoSlotGridLayout';
import type { VariantPreviewThumbnail } from '@/utils/variantPreview';

type AlbumVariantBarProps = {
  thumbnails: VariantPreviewThumbnail[];
  selectedVariantId?: string;
  onSelectVariant: (variantId: string) => void;
  embedded?: boolean;
};

function resolveSlotCount(variantId: string): number {
  if (variantId.includes('four')) return 4;
  if (variantId.includes('three')) return 3;
  if (variantId.includes('two')) return 2;
  return 1;
}

function shortVariantLabel(variantId: string): string {
  const count = resolveSlotCount(variantId);
  if (count === 1) return '1 фото';
  return `${count} фото`;
}

function VariantLayoutPreview({
  variantId,
  selected,
}: {
  variantId: string;
  selected: boolean;
}) {
  const slotCount = resolveSlotCount(variantId);
  const frames = getCollageSlotFrames(variantId, slotCount);
  const aspectRatio = getCollageAspectRatio(variantId, slotCount);
  const slotColor = selected ? colors.primaryLight : colors.border;

  return (
    <View style={[styles.previewBox, { aspectRatio }]}>
      {frames.map((frame) => (
        <View
          key={frame.slotIndex}
          style={[
            styles.previewSlot,
            {
              left: `${frame.leftPercent}%`,
              top: `${frame.topPercent}%`,
              width: `${frame.widthPercent}%`,
              height: `${frame.heightPercent}%`,
              backgroundColor: selected ? colors.primarySurface : surfaces.muted,
              borderColor: slotColor,
            },
          ]}
        />
      ))}
    </View>
  );
}

function VariantThumbnailPreview({
  item,
  selected,
}: {
  item: VariantPreviewThumbnail;
  selected: boolean;
}) {
  const imageUri = selected && item.selectedUri ? item.selectedUri : item.uri;
  if (imageUri) {
    return <LayoutPreviewThumbnail variantId={item.variantId} uri={imageUri} />;
  }

  return <VariantLayoutPreview variantId={item.variantId} selected={selected} />;
}

export function AlbumVariantBar({
  thumbnails,
  selectedVariantId,
  onSelectVariant,
  embedded = false,
}: AlbumVariantBarProps) {
  if (thumbnails.length <= 1) return null;

  // 4 широких превью (особенно 2 фото) не влезают в ряд на узком экране —
  // скролл с фиксированной шириной чипа, иначе иконки вылезают из трека.
  const useScroll = thumbnails.length >= 4;

  const options = (
    <>
      {thumbnails.map((item) => {
        const isSelected = item.variantId === selectedVariantId;
        return (
          <Pressable
            key={item.variantId}
            testID={`variant-chip-${item.variantId}`}
            onPress={() => onSelectVariant(item.variantId)}
            style={({ pressed }) => [
              styles.segment,
              useScroll ? styles.segmentScroll : styles.segmentFlex,
              isSelected && styles.segmentSelected,
              pressed && !isSelected && styles.segmentPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={item.label}
          >
            <VariantThumbnailPreview item={item} selected={isSelected} />
            <AppText
              variant="caption"
              style={[styles.segmentLabel, isSelected && styles.segmentLabelSelected]}
              numberOfLines={1}
            >
              {shortVariantLabel(item.variantId)}
            </AppText>
          </Pressable>
        );
      })}
    </>
  );

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      <AppText variant="caption" style={styles.label}>
        Раскладка на странице
      </AppText>

      {useScroll ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollTrack}
        >
          {options}
        </ScrollView>
      ) : (
        <View style={styles.track}>{options}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  wrapEmbedded: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    marginLeft: 2,
  },
  track: {
    flexDirection: 'row',
    backgroundColor: surfaces.muted,
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
    overflow: 'hidden',
  },
  scrollTrack: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: surfaces.muted,
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
  },
  segment: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radii.md,
    gap: 6,
    minWidth: 0,
    overflow: 'hidden',
  },
  segmentFlex: {
    flex: 1,
  },
  segmentScroll: {
    flexGrow: 0,
    flexShrink: 0,
    width: 86,
  },
  segmentSelected: {
    backgroundColor: colors.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentPressed: {
    opacity: 0.88,
  },
  segmentLabel: {
    color: colors.textSecondary,
    fontFamily: sansFont('regular'),
    textAlign: 'center',
  },
  segmentLabelSelected: {
    color: colors.primaryPressed,
    fontFamily: sansFont('semibold'),
    fontWeight: '600',
  },
  previewBox: {
    width: '100%',
    maxWidth: 72,
    position: 'relative',
    borderRadius: radii.sm,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  previewSlot: {
    position: 'absolute',
    borderRadius: 3,
    borderWidth: 1,
  },
});
