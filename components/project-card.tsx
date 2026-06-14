import { colors, createShadow, radii, spacing } from '@/constants/design-tokens';
import { getProjectCoverImageSource } from '@/utils/projectCoverImage';
import { getProjectCategoryLabel, type UserProject } from '@/utils/userProjects';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';

type ProjectCardProps = {
  project: UserProject;
  cardWidth: number;
  isGrid: boolean;
  imagePriority?: 'high' | 'normal';
  onPress: () => void;
  onLongPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ProjectCard({
  project,
  cardWidth,
  isGrid,
  imagePriority = 'normal',
  onPress,
  onLongPress,
  style,
}: ProjectCardProps) {
  const coverSource = getProjectCoverImageSource(project);
  const categoryLabel = getProjectCategoryLabel(project.category);

  const sizeStyle = isGrid
    ? [
        styles.projectCardGrid,
        cardWidth > 0
          ? { width: cardWidth, flexGrow: 0, flexShrink: 0 }
          : { flex: 1 },
      ]
    : cardWidth > 0
      ? { width: cardWidth }
      : { width: '100%' as const };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.projectCard,
        sizeStyle,
        style,
        pressed && styles.projectCardPressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={[styles.cardImage, isGrid && styles.cardImageGrid]}>
        {coverSource ? (
          <Image
            source={coverSource}
            style={styles.cardImageContent}
            contentFit="cover"
            priority={imagePriority}
            cachePolicy="disk"
            transition={0}
            fadeDuration={0}
            recyclingKey={project.id}
            placeholderContentFit="contain"
          />
        ) : (
          <Ionicons name="book-outline" size={36} color={colors.primary} />
        )}
      </View>

      <View style={styles.cardBody}>
        <AppText variant="titleSm" numberOfLines={2} style={styles.cardTitle}>
          {project.title}
        </AppText>

        {project.category !== 'diary' ? (
          <AppText variant="bodySm" numberOfLines={1}>
            {categoryLabel}
          </AppText>
        ) : null}

        <View style={styles.pageBadge}>
          <AppText variant="caption" style={styles.pageBadgeText}>
            {project.pagesCount} стр.
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  projectCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginRight: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...createShadow('sm'),
  },
  projectCardGrid: {
    marginRight: 0,
    padding: spacing.sm,
    minWidth: 0,
    alignSelf: 'flex-start',
  },
  projectCardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  cardImage: {
    width: '100%',
    height: 176,
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardImageGrid: {
    height: 120,
    marginBottom: 10,
  },
  cardImageContent: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  pageBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySurface,
  },
  pageBadgeText: {
    color: colors.primaryPressed,
    fontWeight: '600',
  },
});
