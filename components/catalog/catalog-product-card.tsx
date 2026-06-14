import React from 'react';
import { StyleSheet, View } from 'react-native';

import { CatalogGiftCoverImage } from '@/components/catalog-gift-cover-image';
import { AppButton, AppCard, AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';
import type { GiftItem } from '@/app/(tabs)/gifts';

type CatalogProductCardProps = {
  item: GiftItem;
  imagePriority?: 'high' | 'normal';
  onPress: () => void;
};

export function CatalogProductCard({
  item,
  imagePriority = 'normal',
  onPress,
}: CatalogProductCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.coverWrap}>
        <CatalogGiftCoverImage
          item={item}
          style={styles.coverImage}
          imagePriority={imagePriority}
        />
      </View>
      <View style={styles.body}>
        <AppText variant="titleSm" numberOfLines={3}>
          {item.title}
        </AppText>
        <AppButton title="Открыть на Wildberries" onPress={onPress} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  coverWrap: {
    height: 240,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
});
