import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { PageStatusBadge } from '@/components/album/page-status-badge';
import { PageStatusIndicator } from '@/components/album/page-status-indicator';
import { AppText } from '@/components/ui/app-text';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';
import type { PageStatus } from '@/types/album-page-schema';

type PageListItemProps = {
  title: string;
  status: PageStatus;
  pageNumber?: number;
  thumbnailUri?: string;
  onPress: () => void;
  onDelete?: () => void;
  onMenuPress?: () => void;
  canDelete?: boolean;
  showChevron?: boolean;
  compact?: boolean;
};

function PageCard({
  title,
  status,
  pageNumber,
  thumbnailUri,
  onPress,
  onMenuPress,
  showChevron,
  compact = false,
}: Pick<
  PageListItemProps,
  'title' | 'status' | 'pageNumber' | 'thumbnailUri' | 'onPress' | 'onMenuPress' | 'showChevron' | 'compact'
>) {
  return (
    <Pressable
      testID={pageNumber != null ? `page-card-${pageNumber}` : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.thumbnailWrap, compact && styles.thumbnailWrapCompact]}>
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} contentFit="cover" />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="image-outline" size={28} color={colors.tabInactive} />
          </View>
        )}
      </View>

      <View style={[styles.info, compact && styles.infoCompact]}>
        {pageNumber != null ? (
          <AppText variant="caption" style={styles.pageNumber}>
            {pageNumber}.
          </AppText>
        ) : null}
        <AppText variant="body" numberOfLines={2} style={styles.title}>
          {title}
        </AppText>
        <PageStatusBadge status={status} />
      </View>

      <View style={[styles.trailing, compact && styles.trailingCompact]}>
        {onMenuPress ? (
          <Pressable
            onPress={() => onMenuPress()}
            hitSlop={8}
            style={({ pressed }) => [styles.menuBtn, pressed && styles.menuBtnPressed]}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
        {!compact && showChevron ? (
          <Ionicons name="chevron-forward" size={20} color={colors.tabInactive} />
        ) : !compact ? (
          <PageStatusIndicator status={status} size={32} />
        ) : null}
      </View>
    </Pressable>
  );
}

export function PageListItem({
  title,
  status,
  pageNumber,
  thumbnailUri,
  onPress,
  onDelete,
  onMenuPress,
  canDelete = true,
  showChevron = false,
  compact = false,
}: PageListItemProps) {
  const swipeRef = useRef<SwipeableMethods>(null);

  if (!canDelete || !onDelete) {
    return (
      <View style={styles.row}>
        <PageCard
          title={title}
          status={status}
          pageNumber={pageNumber}
          thumbnailUri={thumbnailUri}
          onPress={onPress}
          onMenuPress={onMenuPress}
          showChevron={showChevron}
          compact={compact}
        />
      </View>
    );
  }

  const handleDeletePress = () => {
    swipeRef.current?.close();
    onDelete();
  };

  return (
    <View style={styles.row}>
      <Swipeable
        ref={swipeRef}
        overshootRight={false}
        friction={2}
        rightThreshold={48}
        renderRightActions={() => (
          <Pressable
            onPress={handleDeletePress}
            style={({ pressed }) => [styles.deleteAction, pressed && styles.deleteActionPressed]}
            accessibilityRole="button"
            accessibilityLabel="Удалить страницу"
          >
            <Ionicons name="trash-outline" size={22} color={colors.white} />
          </Pressable>
        )}
      >
        <PageCard
          title={title}
          status={status}
          pageNumber={pageNumber}
          thumbnailUri={thumbnailUri}
          onPress={onPress}
          onMenuPress={onMenuPress}
          showChevron={showChevron}
          compact={compact}
        />
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.sm,
  },
  cardCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: spacing.xs,
    position: 'relative',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.92,
  },
  thumbnailWrap: {
    width: 56,
    height: 72,
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginRight: spacing.sm,
    backgroundColor: '#F5F5F5',
  },
  thumbnailWrapCompact: {
    width: '100%',
    height: 120,
    marginRight: 0,
    marginBottom: spacing.xs,
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
    gap: 4,
    paddingRight: spacing.xs,
  },
  infoCompact: {
    paddingRight: 0,
  },
  pageNumber: {
    color: colors.textSecondary,
    fontFamily: sansFont('semibold'),
    fontWeight: '600',
  },
  title: {
    color: colors.textPrimary,
    fontFamily: sansFont('semibold'),
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 20,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trailingCompact: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  menuBtn: {
    padding: 4,
  },
  menuBtnPressed: {
    opacity: 0.7,
  },
  deleteAction: {
    width: 80,
    flex: 1,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: radii.md,
    borderBottomRightRadius: radii.md,
  },
  deleteActionPressed: {
    opacity: 0.88,
  },
});
