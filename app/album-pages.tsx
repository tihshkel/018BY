import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  type Href,
} from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlbumSectionAccordion } from "@/components/album/album-section-accordion";
import { AppButton, AppHeader, AppScreen, AppText } from "@/components/ui";
import { getAlbumSections } from "@/constants/album-sections";
import {
  colors,
  createShadow,
  radii,
  sansFont,
  spacing,
} from "@/constants/design-tokens";
import { useAlbumProject } from "@/hooks/use-album-project";
import { useAlbumPageListLayout } from "@/hooks/use-album-editor-layout";
import type { PageInstance } from "@/types/album-page-schema";
import {
  buildExportReviewHref,
  navigateToHomeFromAlbum,
  type AlbumFlowParams,
} from "@/utils/albumNavigation";
import {
  computeAlbumProgress,
  computeSectionProgressList,
  findNextPageToContinue,
} from "@/utils/albumProgress";
import {
  canShowPageActions,
  openAlbumPage,
} from "@/utils/albumPageNavigation";
import { computePageStatus } from "@/utils/pageStatus";
import { getProjectCoverImageSource } from "@/utils/projectCoverImage";

export default function AlbumPagesScreen() {
  const { id, celebration, coverType, interiorType, eventDate } =
    useLocalSearchParams<{
      id?: string;
      celebration?: string;
      coverType?: string;
      interiorType?: string;
      eventDate?: string;
    }>();

  const insets = useSafeAreaInsets();
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
  const { shellStyle } = useAlbumPageListLayout();

  useFocusEffect(
    useCallback(() => {
      if (project.projectId && !project.isLoading) {
        void project.reloadProjectData();
      }
    }, [project.projectId, project.isLoading, project.reloadProjectData]),
  );

  const sections = useMemo(
    () => getAlbumSections(project.lineGuideId),
    [project.lineGuideId],
  );

  const albumProgress = useMemo(
    () =>
      computeAlbumProgress(
        project.instances,
        project.pageValuesMap,
        project.getSchemaForInstance,
      ),
    [project.instances, project.pageValuesMap, project],
  );

  const sectionProgressList = useMemo(
    () =>
      computeSectionProgressList(
        project.lineGuideId,
        project.instances,
        project.pageValuesMap,
        project.getSchemaForInstance,
      ),
    [project.lineGuideId, project.instances, project.pageValuesMap, project],
  );

  const coverSource = useMemo(
    () =>
      getProjectCoverImageSource({
        coverType: project.meta?.coverType ?? coverType,
        albumId: project.meta?.albumId ?? project.meta?.interiorType,
        category: project.meta?.category ?? celebration,
      }),
    [project.meta, coverType, celebration],
  );

  const instancesBySection = useMemo(() => {
    const map = new Map<string, PageInstance[]>();
    for (const section of sections) {
      const list = project.instances.filter(
        (i) =>
          i.sourcePageNumber >= section.pageRange[0] &&
          i.sourcePageNumber <= section.pageRange[1],
      );
      map.set(section.sectionId, list);
    }
    return map;
  }, [sections, project.instances]);

  const handleOpenPage = (instanceId: string) => {
    const instance = project.instances.find((i) => i.instanceId === instanceId);
    if (!instance) return;
    const schema = project.getSchemaForInstance(instance);
    const values = project.pageValuesMap[instanceId];
    openAlbumPage({
      instanceId,
      projectId: project.projectId,
      schema,
      values,
      celebration,
      coverType,
      interiorType,
    });
  };

  const handleContinue = () => {
    const next = findNextPageToContinue(
      project.instances,
      project.pageValuesMap,
      project.getSchemaForInstance,
    );
    if (next) {
      handleOpenPage(next.instanceId);
      return;
    }
    Alert.alert(
      "Отлично!",
      "Все редактируемые страницы заполнены или уже в работе.",
    );
  };

  const handleDeleteCopy = (instanceId: string, title: string) => {
    Alert.alert("Удалить копию?", `«${title}» будет удалена из альбома.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => void project.removePage(instanceId),
      },
    ]);
  };

  const handleMove = (instanceId: string, direction: -1 | 1) => {
    const index = project.instances.findIndex((i) => i.instanceId === instanceId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= project.instances.length) return;
    void project.movePage(instanceId, target);
  };

  if (project.isLoading) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  const progressBarWidth = `${albumProgress.percent}%`;

  return (
    <AppScreen edges={["top"]} style={styles.screen}>
      <AppHeader showBack onBack={() => navigateToHomeFromAlbum()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          shellStyle,
          { paddingBottom: spacing.lg + insets.bottom + 160 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {coverSource ? (
            <Image source={coverSource} style={styles.heroCover} contentFit="cover" />
          ) : (
            <View style={styles.heroCoverPlaceholder}>
              <Ionicons name="book-outline" size={32} color={colors.tabInactive} />
            </View>
          )}
          <View style={styles.heroText}>
            <AppText variant="titleSm" style={styles.heroTitle}>
              {project.meta?.title ?? "Мой фотоальбом"}
            </AppText>
            <AppText variant="caption" style={styles.heroSubtitle}>
              Сохраняем важные моменты первого года жизни
            </AppText>
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <AppText variant="bodySm" style={styles.progressLabel}>
              Заполнено {albumProgress.filledCount} из {albumProgress.totalCount} страниц
            </AppText>
            <AppText variant="caption" style={styles.progressPercent}>
              {albumProgress.percent}%
            </AppText>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: progressBarWidth as `${number}%` }]}
            />
          </View>
        </View>

        <AppText variant="body" style={styles.sectionHeading}>
          Содержание альбома
        </AppText>

        {sections.map((section, index) => {
          const sectionInstances = instancesBySection.get(section.sectionId) ?? [];
          const progress = sectionProgressList.find((p) => p.sectionId === section.sectionId);
          if (!progress) return null;

          const rows = sectionInstances.map((instance) => {
            const schema = project.getSchemaForInstance(instance);
            const values = project.pageValuesMap[instance.instanceId];
            const status = schema
              ? computePageStatus(schema, values)
              : "empty";
            return {
              instance,
              title: project.getInstanceTitle(instance),
              status,
              thumbnailUri: project.images[instance.imageIndex],
              canShowMenu: canShowPageActions(schema, instance),
              canDuplicate: schema?.canDuplicate ?? false,
              canDeleteCopy: instance.addedByUser,
            };
          });

          return (
            <AlbumSectionAccordion
              key={section.sectionId}
              sectionProgress={progress}
              pages={rows}
              defaultExpanded={index === 0}
              onOpenPage={handleOpenPage}
              onDuplicate={(instanceId) => void project.duplicatePage(instanceId)}
              onDeleteCopy={handleDeleteCopy}
              onRename={(instanceId, title) => void project.renamePage(instanceId, title)}
              onMoveUp={(instanceId) => handleMove(instanceId, -1)}
              onMoveDown={(instanceId) => handleMove(instanceId, 1)}
              onToggleExcluded={(instanceId, excluded) =>
                project.setPageExcluded(instanceId, excluded)
              }
            />
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.sm) },
        ]}
      >
        <View style={[styles.footerInner, shellStyle]}>
          <AppButton title="Продолжить заполнение" onPress={handleContinue} />
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.secondaryBtnPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: "/album-add-page",
                params: {
                  id: project.projectId,
                  celebration,
                  coverType,
                  interiorType,
                },
              } as unknown as Href)
            }
          >
            <Ionicons name="add" size={20} color={colors.primary} />
            <AppText variant="button" style={styles.secondaryBtnText}>
              Добавить страницу
            </AppText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.exportBtn,
              pressed && styles.exportBtnPressed,
            ]}
            onPress={() => router.push(buildExportReviewHref(albumFlowParams))}
          >
            <Ionicons name="download-outline" size={18} color={colors.textPrimary} />
            <AppText variant="caption" style={styles.exportBtnText}>
              Скачать альбом
            </AppText>
          </Pressable>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.sm,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  heroCover: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
  },
  heroCoverPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontFamily: sansFont("bold"),
  },
  heroSubtitle: {
    color: colors.textSecondary,
  },
  progressBlock: {
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    color: colors.textPrimary,
    fontFamily: sansFont("medium"),
  },
  progressPercent: {
    color: colors.primary,
    fontFamily: sansFont("semibold"),
    fontWeight: "600",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primarySurface,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  sectionHeading: {
    fontFamily: sansFont("semibold"),
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerInner: {
    width: "100%",
    gap: spacing.sm,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
    minHeight: 52,
  },
  secondaryBtnPressed: {
    backgroundColor: colors.primarySurface,
  },
  secondaryBtnText: {
    color: colors.primary,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  exportBtnPressed: {
    opacity: 0.8,
  },
  exportBtnText: {
    color: colors.textPrimary,
    fontFamily: sansFont("medium"),
  },
});
