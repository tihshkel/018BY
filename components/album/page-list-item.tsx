import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Swipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { PageDragHandle } from "@/components/album/page-drag-handle";
import { PageStatusBadge } from "@/components/album/page-status-badge";
import { PageStatusIndicator } from "@/components/album/page-status-indicator";
import { AppText } from "@/components/ui/app-text";
import { colors, radii, sansFont, spacing } from "@/constants/design-tokens";
import type { PageStatus } from "@/types/album-page-schema";

/** Высота строки + отступ для расчёта позиции при перетаскивании */
export const PAGE_LIST_ROW_HEIGHT = 88;

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
  /** Только добавленные пользователем страницы */
  canReorder?: boolean;
  itemIndex?: number;
  itemsCount?: number;
  onReorder?: (toIndex: number) => void;
  reorderDisabled?: boolean;
  isHighlighted?: boolean;
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
  canReorder = false,
  dragHandle,
  isDragging = false,
  isHighlighted = false,
}: {
  title: string;
  status: PageStatus;
  pageNumber?: number;
  thumbnailUri?: string;
  onPress: () => void;
  onMenuPress?: () => void;
  showChevron?: boolean;
  compact?: boolean;
  canReorder?: boolean;
  dragHandle?: React.ReactNode;
  isDragging?: boolean;
  isHighlighted?: boolean;
}) {
  return (
    <Pressable
      testID={pageNumber != null ? `page-card-${pageNumber}` : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        canReorder && styles.cardAdded,
        isHighlighted && styles.cardHighlighted,
        isDragging && styles.cardDragging,
        pressed && !isDragging && styles.pressed,
      ]}
    >
      {dragHandle}

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
        {canReorder ? (
          <AppText variant="caption" style={styles.reorderHint}>
            Зажмите ≡ и перетащите
          </AppText>
        ) : null}
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
  canReorder = false,
  itemIndex,
  itemsCount = 0,
  onReorder,
  reorderDisabled = false,
  isHighlighted = false,
}: PageListItemProps) {
  const swipeRef = useRef<SwipeableMethods>(null);
  const [isDragging, setIsDragging] = useState(false);
  const translateY = useSharedValue(0);
  const hoverIndexRef = useRef(itemIndex ?? 0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: isDragging ? 20 : 0,
    elevation: isDragging ? 8 : 0,
  }));

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    hoverIndexRef.current = itemIndex ?? 0;
  }, [itemIndex]);

  const handleDragMove = useCallback(
    (translationY: number) => {
      if (itemIndex == null) return;
      translateY.value = translationY;
      hoverIndexRef.current = Math.max(
        0,
        Math.min(
          itemsCount - 1,
          Math.round(itemIndex + translationY / PAGE_LIST_ROW_HEIGHT),
        ),
      );
    },
    [itemIndex, itemsCount, translateY],
  );

  const handleDragEnd = useCallback(() => {
    translateY.value = withSpring(0);
    setIsDragging(false);
    if (itemIndex != null && onReorder) {
      const target = hoverIndexRef.current;
      if (target !== itemIndex) {
        onReorder(target);
      }
    }
  }, [itemIndex, onReorder, translateY]);

  const dragHandle =
    canReorder && !compact ? (
      <PageDragHandle
        disabled={reorderDisabled}
        active={isDragging}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />
    ) : null;

  const card = (
    <PageCard
      title={title}
      status={status}
      pageNumber={pageNumber}
      thumbnailUri={thumbnailUri}
      onPress={onPress}
      onMenuPress={onMenuPress}
      showChevron={showChevron}
      compact={compact}
      canReorder={canReorder}
      dragHandle={dragHandle}
      isDragging={isDragging}
      isHighlighted={isHighlighted}
    />
  );

  const wrappedCard =
    canReorder && !compact ? (
      <Animated.View style={animatedStyle}>{card}</Animated.View>
    ) : (
      card
    );

  const rowContent = <View style={styles.row}>{wrappedCard}</View>;

  if (!canDelete || !onDelete) {
    return rowContent;
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
        enabled={!isDragging}
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
        {wrappedCard}
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.sm,
  },
  cardCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    padding: spacing.xs,
    position: "relative",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardAdded: {
    borderColor: colors.primaryLight,
  },
  cardHighlighted: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primarySurface,
  },
  cardDragging: {
    borderColor: colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  pressed: {
    opacity: 0.92,
  },
  thumbnailWrap: {
    width: 56,
    height: 72,
    borderRadius: radii.sm,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },
  thumbnailWrapCompact: {
    width: "100%",
    height: 120,
    marginBottom: spacing.xs,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
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
    fontFamily: sansFont("semibold"),
    fontWeight: "600",
  },
  title: {
    color: colors.textPrimary,
    fontFamily: sansFont("semibold"),
    fontWeight: "600",
    fontSize: 15,
    lineHeight: 20,
  },
  reorderHint: {
    color: colors.primary,
    fontFamily: sansFont("medium"),
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trailingCompact: {
    position: "absolute",
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
    alignItems: "center",
    justifyContent: "center",
    borderTopRightRadius: radii.md,
    borderBottomRightRadius: radii.md,
  },
  deleteActionPressed: {
    opacity: 0.88,
  },
});
