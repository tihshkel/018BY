import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { PageDragHandle } from "@/components/album/page-drag-handle";
import { AppText } from "@/components/ui";
import {
  colors,
  createShadow,
  radii,
  sansFont,
  spacing,
} from "@/constants/design-tokens";
import type { PageInstance } from "@/types/album-page-schema";

export const NEW_PLACEMENT_PAGE_ID = "__album_new_page__";

export type PlacementRow =
  | {
      id: string;
      kind: "existing";
      instanceId: string;
      title: string;
      thumbnailUri?: string;
    }
  | {
      id: typeof NEW_PLACEMENT_PAGE_ID;
      kind: "new";
      title: string;
      thumbnailUri?: string;
      sourcePageNumber: number;
    };

const ROW_HEIGHT = 88;

export function getDefaultInsertAfterIndex(
  instances: PageInstance[],
  sourcePageNumber: number,
): number {
  let lastMatch = -1;
  for (let i = 0; i < instances.length; i += 1) {
    if (instances[i].sourcePageNumber === sourcePageNumber) {
      lastMatch = i;
    }
  }
  if (lastMatch >= 0) return lastMatch;

  for (let i = instances.length - 1; i >= 0; i -= 1) {
    if (instances[i].sourcePageNumber < sourcePageNumber) {
      return i;
    }
  }
  return instances.length > 0 ? instances.length - 1 : -1;
}

export function buildDefaultPlacementOrder(params: {
  instances: PageInstance[];
  getTitle: (instance: PageInstance) => string;
  getThumbnail: (instance: PageInstance) => string | undefined;
  sourcePageNumber: number;
  newPageTitle: string;
  newThumbnailUri?: string;
}): PlacementRow[] {
  const {
    instances,
    getTitle,
    getThumbnail,
    sourcePageNumber,
    newPageTitle,
    newThumbnailUri,
  } = params;

  const rows: PlacementRow[] = instances.map((instance) => ({
    id: instance.instanceId,
    kind: "existing",
    instanceId: instance.instanceId,
    title: getTitle(instance),
    thumbnailUri: getThumbnail(instance),
  }));

  const insertAfter = getDefaultInsertAfterIndex(instances, sourcePageNumber);
  const newRow: PlacementRow = {
    id: NEW_PLACEMENT_PAGE_ID,
    kind: "new",
    title: newPageTitle,
    thumbnailUri: newThumbnailUri,
    sourcePageNumber,
  };

  rows.splice(insertAfter + 1, 0, newRow);
  return rows;
}

function moveRow(rows: PlacementRow[], from: number, to: number): PlacementRow[] {
  if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) {
    return rows;
  }
  const next = [...rows];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

type RowProps = {
  row: PlacementRow;
  index: number;
  displayNumber: number;
  isActive: boolean;
  disabled: boolean;
  onDragStart: (index: number) => void;
  onDragMove: (index: number, translationY: number) => void;
  onDragEnd: () => void;
};

function PlacementRowCard({
  row,
  index,
  displayNumber,
  isActive,
  disabled,
  onDragStart,
  onDragMove,
  onDragEnd,
}: RowProps) {
  const isNew = row.kind === "new";
  const canDrag = isNew && !disabled;
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: isActive ? 20 : 0,
    elevation: isActive ? 8 : 0,
  }));

  const handleDragStart = useCallback(() => {
    onDragStart(index);
  }, [index, onDragStart]);

  const handleDragMove = useCallback(
    (translationY: number) => {
      translateY.value = translationY;
      onDragMove(index, translationY);
    },
    [index, onDragMove, translateY],
  );

  const handleDragEnd = useCallback(() => {
    translateY.value = withSpring(0);
    onDragEnd();
  }, [onDragEnd, translateY]);

  return (
    <Animated.View style={[styles.rowWrap, animatedStyle]}>
      <View
        style={[
          styles.row,
          isNew && styles.rowNew,
          isActive && styles.rowDragging,
          !isNew && styles.rowFixed,
        ]}
      >
        {canDrag ? (
          <PageDragHandle
            active={isActive}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          />
        ) : (
          <View style={styles.fixedSlot}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.tabInactive} />
          </View>
        )}

        <View style={styles.thumbWrap}>
          {row.thumbnailUri ? (
            <Image
              source={{ uri: row.thumbnailUri }}
              style={styles.thumb}
              contentFit="cover"
              transition={0}
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Ionicons name="image-outline" size={16} color={colors.tabInactive} />
            </View>
          )}
        </View>

        <View style={styles.rowText}>
          <AppText variant="caption" style={styles.rowOrder}>
            {displayNumber}. {isNew ? "Новая страница" : "Страница альбома"}
          </AppText>
          <AppText variant="body" numberOfLines={2}>
            {row.title}
          </AppText>
          {isNew ? (
            <AppText variant="caption" style={styles.newHint}>
              Зажмите ≡ и перетащите
            </AppText>
          ) : null}
        </View>

        {isNew ? (
          <View style={styles.newBadge}>
            <AppText variant="caption" style={styles.newBadgeText}>
              Новая
            </AppText>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

type PagePlacementReorderListProps = {
  rows: PlacementRow[];
  onOrderChange: (rows: PlacementRow[]) => void;
  disabled?: boolean;
};

export function PagePlacementReorderList({
  rows,
  onOrderChange,
  disabled = false,
}: PagePlacementReorderListProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const rowsRef = useRef(rows);
  const draggingIndexRef = useRef<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const handleDragStart = useCallback((index: number) => {
    const row = rowsRef.current[index];
    if (row?.kind !== "new") return;
    draggingIndexRef.current = index;
    hoverIndexRef.current = index;
    setDraggingIndex(index);
    setScrollEnabled(false);
  }, []);

  const handleDragMove = useCallback((index: number, translationY: number) => {
    if (draggingIndexRef.current !== index) return;
    const nextHover = Math.max(
      0,
      Math.min(rowsRef.current.length - 1, Math.round(index + translationY / ROW_HEIGHT)),
    );
    hoverIndexRef.current = nextHover;
  }, []);

  const handleDragEnd = useCallback(() => {
    const from = draggingIndexRef.current;
    const to = hoverIndexRef.current;
    if (from != null && to != null) {
      onOrderChange(moveRow(rowsRef.current, from, to));
    }
    draggingIndexRef.current = null;
    hoverIndexRef.current = null;
    setDraggingIndex(null);
    setScrollEnabled(true);
  }, [onOrderChange]);

  return (
    <ScrollView
      style={styles.scroll}
      scrollEnabled={scrollEnabled}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.listContent}
    >
      <View style={styles.list}>
        {rows.map((row, index) => (
          <PlacementRowCard
            key={row.id}
            row={row}
            index={index}
            displayNumber={index + 1}
            isActive={draggingIndex === index}
            disabled={disabled}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  rowWrap: {
    minHeight: ROW_HEIGHT - spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    minHeight: ROW_HEIGHT - spacing.sm,
    ...createShadow("sm"),
  },
  rowFixed: {
    opacity: 0.92,
  },
  rowNew: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  rowDragging: {
    borderColor: colors.primaryLight,
    ...createShadow("md"),
  },
  fixedSlot: {
    width: 36,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbWrap: {
    width: 40,
    height: 52,
    borderRadius: radii.sm,
    overflow: "hidden",
    backgroundColor: colors.primarySurface,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowOrder: {
    color: colors.textSecondary,
  },
  newHint: {
    color: colors.primary,
    fontFamily: sansFont("medium"),
  },
  newBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newBadgeText: {
    color: colors.white,
    fontFamily: sansFont("semibold"),
  },
});
