import { getProjectCoverImageSource } from '@/utils/projectCoverImage';
import { getProjectCategoryLabel, type UserProject } from '@/utils/userProjects';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type ProjectCardProps = {
  project: UserProject;
  cardWidth: number;
  isGrid: boolean;
  imagePriority?: 'high' | 'normal';
  onPress: () => void;
  onLongPress: () => void;
};

export function ProjectCard({
  project,
  cardWidth,
  isGrid,
  imagePriority = 'normal',
  onPress,
  onLongPress,
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
    : { width: cardWidth };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.projectCard,
        sizeStyle,
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
          <Ionicons name="book" size={40} color="#C9A89A" />
        )}
      </View>
      <Text
        style={[styles.cardTitle, isGrid && styles.cardTitleGrid]}
        numberOfLines={isGrid ? 3 : undefined}
      >
        {project.title}
      </Text>
      {project.category !== 'diary' ? (
        <Text
          style={[styles.cardCategory, isGrid && styles.cardCategoryGrid]}
          numberOfLines={isGrid ? 2 : undefined}
        >
          {categoryLabel}
        </Text>
      ) : isGrid ? (
        <View style={styles.cardCategorySpacer} />
      ) : null}
      <View style={styles.cardStats}>
        <Text style={styles.cardStatText}>{project.pagesCount} стр.</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginRight: 16,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F0EB',
  },
  projectCardGrid: {
    marginRight: 0,
    padding: 12,
    minWidth: 0,
    alignSelf: 'flex-start',
  },
  projectCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageGrid: {
    height: 128,
    marginBottom: 10,
  },
  cardImageContent: {
    width: '100%',
    height: '100%',
  },
  cardTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 4,
  },
  cardTitleGrid: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 6,
  },
  cardCategory: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    marginBottom: 12,
  },
  cardCategoryGrid: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  cardCategorySpacer: {
    minHeight: 24,
    marginBottom: 8,
  },
  cardStats: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
  },
  cardStatText: {
    fontSize: 13,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
});
