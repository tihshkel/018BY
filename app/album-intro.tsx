import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton, AppScreen, AppText } from '@/components/ui';
import { getAlbumSections } from '@/constants/album-sections';
import {
  colors,
  createShadow,
  radii,
  sansFont,
  spacing,
} from '@/constants/design-tokens';
import { useAlbumProject } from '@/hooks/use-album-project';
import {
  buildAlbumPagesHref,
  buildAlbumStructureGridHref,
  navigateToHomeFromAlbum,
  type AlbumFlowParams,
} from '@/utils/albumNavigation';
import { markAlbumIntroSeen } from '@/utils/albumIntro';
import { getProjectCoverImageSource } from '@/utils/projectCoverImage';
import { useResponsiveLayout, getTabletContentShell } from '@/utils/responsive';

export default function AlbumIntroScreen() {
  const { id, celebration, coverType, interiorType, eventDate } =
    useLocalSearchParams<{
      id?: string;
      celebration?: string;
      coverType?: string;
      interiorType?: string;
      eventDate?: string;
    }>();

  const layout = useResponsiveLayout(560);
  const shellStyle = getTabletContentShell(layout);

  const albumFlowParams: AlbumFlowParams = {
    id,
    celebration,
    coverType,
    interiorType,
    eventDate,
  };

  const project = useAlbumProject({
    projectId: id,
    celebration,
    coverType,
    interiorType,
    eventDate,
  });

  const sectionsCount = useMemo(
    () => getAlbumSections(project.lineGuideId).length,
    [project.lineGuideId]
  );

  const coverSource = useMemo(
    () =>
      getProjectCoverImageSource({
        coverType: project.meta?.coverType ?? coverType,
        albumId: project.meta?.albumId ?? project.meta?.interiorType,
        category: project.meta?.category ?? celebration,
      }),
    [project.meta, coverType, celebration]
  );

  useEffect(() => {
    if (!project.isLoading && !project.projectId && celebration) {
      /* new project flow handled by hook */
    }
  }, [project.isLoading, project.projectId, celebration]);

  const handleStart = async () => {
    if (!project.projectId) return;
    await markAlbumIntroSeen(project.projectId);
    router.replace(buildAlbumPagesHref(albumFlowParams));
  };

  const handleViewStructure = async () => {
    if (!project.projectId) return;
    await markAlbumIntroSeen(project.projectId);
    router.push(buildAlbumStructureGridHref(albumFlowParams));
  };

  if (project.isLoading || !project.projectId) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  const pageCount = project.instances.length;
  const title = project.meta?.title ?? 'Фотоальбом для новорожденного';

  return (
    <AppScreen edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, shellStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.coverWrap}>
          {coverSource ? (
            <Image source={coverSource} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="book-outline" size={48} color={colors.tabInactive} />
            </View>
          )}
        </View>

        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="bodySm" style={styles.subtitle}>
          Первые важные моменты жизни малыша
        </AppText>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="documents-outline" size={20} color={colors.primary} />
            <AppText variant="caption" style={styles.statText}>
              {pageCount} страниц
            </AppText>
          </View>
          <View style={styles.stat}>
            <Ionicons name="layers-outline" size={20} color={colors.primary} />
            <AppText variant="caption" style={styles.statText}>
              {sectionsCount} разделов
            </AppText>
          </View>
          <View style={styles.stat}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <AppText variant="caption" style={styles.statText}>
              можно добавлять
            </AppText>
          </View>
        </View>

        <AppText variant="bodySm" style={styles.description}>
          Сохраняйте важные моменты, заполняйте готовые страницы и добавляйте фотографии —
          приложение соберёт красивый альбом как в бумажной версии.
        </AppText>

        <View style={styles.actions}>
          <AppButton title="Начать заполнение" onPress={() => void handleStart()} />
          <AppButton
            title="Посмотреть все страницы"
            variant="outline"
            onPress={() => void handleViewStructure()}
          />
        </View>

        <View style={styles.footerNote}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
          <AppText variant="caption" style={styles.footerNoteText}>
            Ваши данные надёжно защищены
          </AppText>
        </View>

        <AppButton
          title="На главную"
          variant="ghost"
          onPress={() => navigateToHomeFromAlbum()}
          style={styles.homeLink}
        />
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  coverWrap: {
    width: '72%',
    maxWidth: 280,
    aspectRatio: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    ...createShadow('md'),
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: colors.textPrimary,
    fontFamily: sansFont('medium'),
  },
  description: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  footerNoteText: {
    color: colors.textSecondary,
  },
  homeLink: {
    marginTop: spacing.xs,
  },
});
