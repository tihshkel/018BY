import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppButton, AppHeader, AppScreen, AppText } from '@/components/ui';
import { getAlbumSections } from '@/constants/album-sections';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';
import { useAlbumProject } from '@/hooks/use-album-project';
import {
  buildAlbumPagesHref,
  navigateToHomeFromAlbum,
  type AlbumFlowParams,
} from '@/utils/albumNavigation';
import { resolveInstancePageImageUri } from '@/utils/resolveInstancePageImage';
import { resolvePagePreviewBackgroundUri } from '@/utils/pagePreviewBackground';
import { useResponsiveLayout, getTabletContentShell } from '@/utils/responsive';

const GRID_COLUMNS = 3;

export default function AlbumStructureGridScreen() {
  const { id, celebration, coverType, interiorType, eventDate } =
    useLocalSearchParams<{
      id?: string;
      celebration?: string;
      coverType?: string;
      interiorType?: string;
      eventDate?: string;
    }>();

  const layout = useResponsiveLayout(720);
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

  const sections = useMemo(
    () => getAlbumSections(project.lineGuideId),
    [project.lineGuideId]
  );

  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.sectionId ?? '');

  const sectionInstances = useMemo(() => {
    const section = sections.find((s) => s.sectionId === activeSectionId);
    if (!section) return project.instances;
    return project.instances.filter(
      (i) =>
        i.sourcePageNumber >= section.pageRange[0] &&
        i.sourcePageNumber <= section.pageRange[1]
    );
  }, [project.instances, sections, activeSectionId]);

  const openPagePreview = (instanceId: string) => {
    router.push({
      pathname: '/album-page-preview',
      params: {
        id: project.projectId,
        instanceId,
        celebration,
        coverType,
        interiorType,
      },
    } as unknown as Href);
  };

  if (project.isLoading) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  return (
    <AppScreen edges={['top']}>
      <AppHeader
        title="Структура альбома"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.tabsRow, shellStyle]}
        style={styles.tabsScroll}
      >
        {sections.map((section) => {
          const active = section.sectionId === activeSectionId;
          return (
            <Pressable
              key={section.sectionId}
              onPress={() => setActiveSectionId(section.sectionId)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <AppText
                variant="caption"
                style={[styles.tabText, active && styles.tabTextActive]}
                numberOfLines={2}
              >
                {section.title}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.gridContent, shellStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {sectionInstances.map((instance) => {
            const title = project.getInstanceTitle(instance);
            const schema = project.getSchemaForInstance(instance);
            const thumb =
              resolvePagePreviewBackgroundUri({
                lineGuideId: project.lineGuideId,
                sourcePageNumber:
                  instance.sourcePageNumber ?? schema?.sourcePageNumber,
                baseImageUri: resolveInstancePageImageUri(
                  project.images,
                  instance,
                  project.lineGuideId,
                ),
                quality: 'thumbnail',
              }) ?? undefined;
            return (
              <Pressable
                key={instance.instanceId}
                style={({ pressed }) => [styles.gridItem, pressed && styles.gridItemPressed]}
                onPress={() => openPagePreview(instance.instanceId)}
              >
                <View style={styles.thumbWrap}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="image-outline" size={24} color={colors.tabInactive} />
                    </View>
                  )}
                </View>
                <AppText variant="caption" style={styles.pageNumber}>
                  {instance.order}
                </AppText>
                <AppText variant="caption" style={styles.pageTitle} numberOfLines={2}>
                  {title}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, shellStyle]}>
        <AppButton
          title="Перейти к заполнению"
          onPress={() => router.replace(buildAlbumPagesHref(albumFlowParams))}
        />
        <AppButton
          title="На главную"
          variant="ghost"
          onPress={() => navigateToHomeFromAlbum()}
        />
      </View>
    </AppScreen>
  );
}

const itemGap = spacing.sm;
const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsScroll: {
    maxHeight: 56,
    marginBottom: spacing.sm,
  },
  tabsRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    maxWidth: 160,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: sansFont('regular'),
  },
  tabTextActive: {
    color: colors.primary,
    fontFamily: sansFont('semibold'),
    fontWeight: '600',
  },
  gridContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: itemGap,
  },
  gridItem: {
    width: `${(100 - 4) / GRID_COLUMNS}%` as unknown as number,
    minWidth: 100,
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  gridItemPressed: {
    opacity: 0.9,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 0.78,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    marginBottom: 4,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumber: {
    color: colors.textSecondary,
    fontFamily: sansFont('semibold'),
    fontWeight: '600',
  },
  pageTitle: {
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
});
