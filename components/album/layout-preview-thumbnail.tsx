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

const PREVIEW_MAX_HEIGHT = 44;

type LayoutPreviewThumbnailProps = {
  variantId: string;
  uri: string;
};

export function LayoutPreviewThumbnail({ variantId, uri }: LayoutPreviewThumbnailProps) {
  const aspect = useMemo(() => {
    const key = normalizeDesignedAlbumVariantId(variantId);
    return LAYOUT_PREVIEW_ASPECT[key] ?? 1024 / 705;
  }, [variantId]);

  return (
    <View style={styles.wrap}>
      <Image
        source={{ uri }}
        style={[styles.image, { aspectRatio: aspect, maxHeight: PREVIEW_MAX_HEIGHT }]}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 72,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
  },
});
