import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { normalizeDesignedAlbumVariantId } from '@/utils/variantPreview';

/** Pixel dimensions of assets in assets/photo-layout-previews/. */
const LAYOUT_PREVIEW_ASPECT: Record<string, number> = {
  one_large: 1024 / 705,
  two_vertical: 1024 / 488,
  three_hero: 1004 / 1024,
  four_grid: 1004 / 1024,
};

const PREVIEW_MAX_WIDTH = 84;
const PREVIEW_MAX_HEIGHT = 46;

type LayoutPreviewThumbnailProps = {
  variantId: string;
  uri: string;
};

export function LayoutPreviewThumbnail({ variantId, uri }: LayoutPreviewThumbnailProps) {
  const layoutSize = useMemo(() => {
    const key = normalizeDesignedAlbumVariantId(variantId);
    const aspect = LAYOUT_PREVIEW_ASPECT[key] ?? 1024 / 705;

    let width = PREVIEW_MAX_WIDTH;
    let height = width / aspect;

    if (height > PREVIEW_MAX_HEIGHT) {
      height = PREVIEW_MAX_HEIGHT;
      width = height * aspect;
    }

    return { width, height };
  }, [variantId]);

  return (
    <View style={[styles.wrap, layoutSize]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'visible',
  },
});
