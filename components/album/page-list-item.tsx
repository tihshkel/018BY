import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PageStatusBadge } from '@/components/album/page-status-badge';
import { PageStatusIndicator } from '@/components/album/page-status-indicator';
import { AppText } from '@/components/ui/app-text';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';
import type { PageStatus } from '@/types/album-page-schema';

type PageListItemProps = {
  title: string;
  status: PageStatus;
  thumbnailUri?: string;
  onPress: () => void;
};

export function PageListItem({
  title,
  status,
  thumbnailUri,
  onPress,
}: PageListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.thumbnailWrap}>
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} contentFit="cover" />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="image-outline" size={28} color={colors.tabInactive} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <AppText variant="body" numberOfLines={2} style={styles.title}>
          {title}
        </AppText>
        <PageStatusBadge status={status} />
      </View>

      <PageStatusIndicator status={status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.92,
  },
  thumbnailWrap: {
    width: 72,
    height: 92,
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginRight: spacing.sm,
    backgroundColor: '#F5F5F5',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  info: {
    flex: 1,
    gap: 6,
    paddingRight: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: sansFont('semibold'),
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 22,
  },
});
