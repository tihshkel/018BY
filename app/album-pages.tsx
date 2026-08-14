import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  type Href,
} from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
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
import { touchProjectLastOpened } from "@/utils/userProjects";
import { useAlbumProject } from "@/hooks/use-album-project";
import { useAlbumPageListLayout } from "@/hooks/use-album-editor-layout";
import type { AlbumPageSchema, PageInstance, PageValues } from "@/types/album-page-schema";
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
import { hasPendingAlbumProjectPersist } from "@/utils/albumProjectPersist";
import { isBlankTemplateLineGuide } from "@/utils/photoPageTemplateManifest";
import { resolveInstancePageImageUri } from "@/utils/resolveInstancePageImage";
import { resolveDisplayPageStatus } from "@/utils/pageStatus";
import { getProjectCoverImageSource } from "@/utils/projectCoverImage";
import { normalizeRouteParam } from "@/utils/routeParams";
import { releaseAndroidImageMemory } from "@/utils/androidSessionRelief";

function getAlbumHeroSubtitle(celebration?: string, lineGuideId?: string): string {
  if (celebration === 'wedding') {
    return lineGuideId === 'family_blank_21x21'
      ? 'Соберите свадебный альбом 21×21 см — выберите шаблон для каждой страницы'
      : 'Соберите свадебный альбом 18×24 см — выберите шаблон для каждой страницы';
  }
  if (celebration === 'family' || lineGuideId?.startsWith('family_blank')) {
    return 'Соберите семейный альбом — выберите шаблон для каждой страницы';
  }
  if (celebration === 'holidays' || lineGuideId === 'holidays_blank') {
    return 'Соберите праздничный альбом — выберите шаблон для каждой страницы';
  }
  if (celebration === 'pregnancy') {
    return 'Сохраняем важные моменты ожидания малыша';
  }
  if (celebration === 'kids') {
    return 'Сохраняем важные моменты первого года жизни';
  }
  return 'Заполняйте страницы в удобном темпе';
}

function getPageSubtitle(
  instance: PageInstance,
  schema: AlbumPageSchema | undefined,
  values: PageValues | undefined,
): string {
  const fieldValue = schema?.fields
    ?.map((field) => values?.fields[field.fieldId]?.trim())
    .find((value): value is string => Boolean(value));
  if (fieldValue) return fieldValue;

  const caption = values?.caption?.trim();
  if (caption) return caption;

  const photoCaption = values?.photoCaptions
    ?.map((item) => item?.trim())
    .find((value): value is string => Boolean(value));
  if (photoCaption) return photoCaption;

  return `Страница ${instance.order}`;
}

export default function AlbumPagesScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    celebration?: string | string[];
    coverType?: string | string[];
    interiorType?: string | string[];
    eventDate?: string | string[];
    highlightInstanceId?: string | string[];
    scrollToInstanceId?: string | string[];
  }>();

  const id = normalizeRouteParam(params.id);
  const celebration = normalizeRouteParam(params.celebration);
  const coverType = normalizeRouteParam(params.coverType);
  const interiorType = normalizeRouteParam(params.interiorType);
  const eventDate = normalizeRouteParam(params.eventDate);
  const highlightInstanceId = normalizeRouteParam(params.highlightInstanceId);
  const scrollToInstanceId = normalizeRouteParam(params.scrollToInstanceId);

  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const hasScrolledToHighlightRef = useRef(false);
  const skipNextReloadRef = useRef(Boolean(highlightInstanceId || scrollToInstanceId));
  const [highlightDismissed, setHighlightDismissed] = useState(false);

  const scrollTargetInstanceId = useMemo(() => {
    if (scrollToInstanceId) return scrollToInstanceId;
    if (highlightInstanceId && !highlightDismissed) return highlightInstanceId;
    return undefined;
  }, [scrollToInstanceId, highlightInstanceId, highlightDismissed]);

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
  const { shellStyle, pageGridColumnCount, layout } = useAlbumPageListLayout();
  const listFocused = useIsFocused();
  const pageItemWidth =
    pageGridColumnCount > 1
      ? (layout.contentMaxWidth - (pageGridColumnCount - 1) * spacing.sm) / pageGridColumnCount
      : undefined;

  useFocusEffect(
    useCallback(() => {
      releaseAndroidImageMemory(120);
      if (!project.projectId || project.isLoading) return;
      void touchProjectLastOpened(project.projectId);
      if (skipNextReloadRef.current) {
        skipNextReloadRef.current = false;
        return;
      }
      // Не перечитывать весь map с диска при каждом возврате — это лагало при 60 заполненных
      if (hasPendingAlbumProjectPersist(project.projectId)) {
        void project.reloadProjectData();
        return;
      }
      if (project.hydrateFromSnapshot()) {
        return;
      }
      void project.reloadProjectData();
    }, [project.projectId, project.isLoading, project.reloadProjectData, project.hydrateFromSnapshot]),
  );

  const highlightedInstance = useMemo(() => {
    if (!highlightInstanceId || highlightDismissed) return null;
    return project.instances.find((item) => item.instanceId === highlightInstanceId) ?? null;
  }, [highlightInstanceId, highlightDismissed, project.instances]);

  const highlightedPosition = useMemo(() => {
    if (!highlightedInstance) return null;
    const index = project.instances.findIndex(
      (item) => item.instanceId === highlightedInstance.instanceId,
    );
    return index >= 0 ? index + 1 : null;
  }, [highlightedInstance, project.instances]);

  const scrollToHighlightedPage = useCallback((y: number) => {
    if (hasScrolledToHighlightRef.current) return;
    hasScrolledToHighlightRef.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 48), animated: true });
  }, []);

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
    [project.instances, project.pageValuesMap, project.getSchemaForInstance],
  );

  const sectionProgressList = useMemo(
    () =>
      computeSectionProgressList(
        project.lineGuideId,
        project.instances,
        project.pageValuesMap,
        project.getSchemaForInstance,
      ),
    [project.lineGuideId, project.instances, project.pageValuesMap, project.getSchemaForInstance],
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

  const instanceIndexById = useMemo(() => {
    const map = new Map<string, number>();
    project.instances.forEach((item, index) => {
      map.set(item.instanceId, index);
    });
    return map;
  }, [project.instances]);

  const sectionRowsById = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        instance: PageInstance;
        title: string;
        subtitle?: string;
        status: ReturnType<typeof resolveDisplayPageStatus> | "empty";
        thumbnailUri?: string;
        schema?: AlbumPageSchema;
        pageValues?: PageValues;
        canShowMenu: boolean;
        canDuplicate: boolean;
        canDeleteCopy: boolean;
        canReorder: boolean;
        canChangeTemplate?: boolean;
        globalIndex: number;
      }>
    >();

    for (const section of sections) {
      const sectionInstances = instancesBySection.get(section.sectionId) ?? [];
      const rows = sectionInstances.map((instance) => {
        const schema = project.getSchemaForInstance(instance);
        const values = project.pageValuesMap[instance.instanceId];
        const status = resolveDisplayPageStatus(schema, values);
        return {
          instance,
          title: project.getInstanceTitle(instance),
          subtitle: getPageSubtitle(instance, schema, values),
          status,
          thumbnailUri: resolveInstancePageImageUri(
            project.images,
            instance,
            project.lineGuideId,
          ),
          schema,
          pageValues: values,
          canShowMenu: canShowPageActions(schema, instance),
          canDuplicate: schema?.canDuplicate ?? false,
          canDeleteCopy: instance.addedByUser,
          canReorder: instance.addedByUser,
          canChangeTemplate: isBlankTemplateLineGuide(project.lineGuideId),
          globalIndex: instanceIndexById.get(instance.instanceId) ?? -1,
        };
      });
      map.set(section.sectionId, rows);
    }
    return map;
  }, [
    sections,
    instancesBySection,
    instanceIndexById,
    project.pageValuesMap,
    project.images,
    project.lineGuideId,
    project.getSchemaForInstance,
    project.getInstanceTitle,
  ]);

  const handleOpenPage = useCallback((instanceId: string) => {
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
  }, [project, celebration, coverType, interiorType]);

  const handleContinue = useCallback(() => {
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
  }, [project, handleOpenPage]);

  const handleAddPage = useCallback(() => {
    const pathname = isBlankTemplateLineGuide(project.lineGuideId)
      ? "/album-template-library"
      : "/album-add-page";

    router.push({
      pathname,
      params: {
        id: project.projectId,
        celebration,
        coverType,
        interiorType,
      },
    } as unknown as Href);
  }, [project.lineGuideId, project.projectId, celebration, coverType, interiorType]);

  const handleChangeTemplate = useCallback((instanceId: string) => {
    router.push({
      pathname: "/album-template-library",
      params: {
        id: project.projectId,
        celebration,
        coverType,
        interiorType,
        instanceId,
        mode: "replace",
      },
    } as unknown as Href);
  }, [project.projectId, celebration, coverType, interiorType]);

  const handleDeleteCopy = useCallback((instanceId: string, title: string) => {
    Alert.alert("Удалить копию?", `«${title}» будет удалена из альбома.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => void project.removePage(instanceId),
      },
    ]);
  }, [project]);

  const handleMove = useCallback((instanceId: string, direction: -1 | 1) => {
    const index = project.instances.findIndex((i) => i.instanceId === instanceId);
    const instance = project.instances[index];
    if (!instance?.addedByUser) return;
    const target = index + direction;
    if (index < 0 || target < 0 || target >= project.instances.length) return;
    void project.movePage(instanceId, target);
  }, [project]);

  const handleReorderPage = useCallback((instanceId: string, toIndex: number) => {
    void project.movePage(instanceId, toIndex);
  }, [project]);

  const handleToggleExcluded = useCallback(
    (instanceId: string, excluded: boolean) => {
      project.setPageExcluded(instanceId, excluded);
    },
    [project],
  );

  if (project.isLoading) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="bodySm" style={styles.loadingHint}>
          Загружаем альбом…
        </AppText>
      </AppScreen>
    );
  }

  const progressBarWidth = `${albumProgress.percent}%`;

  return (
    <AppScreen edges={["top"]} style={styles.screen}>
      <AppHeader showBack onBack={() => navigateToHomeFromAlbum()} />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          shellStyle,
          { paddingBottom: spacing.lg + insets.bottom + 160 },
        ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === "android"}
      >
        {highlightedInstance && highlightedPosition != null ? (
          <View style={styles.highlightBanner}>
            <View style={styles.highlightBannerText}>
              <AppText variant="bodySm" style={styles.highlightTitle}>
                Страница добавлена на позицию {highlightedPosition}
              </AppText>
              <AppText variant="caption" style={styles.highlightSubtitle}>
                {project.getInstanceTitle(highlightedInstance)}
              </AppText>
            </View>
            <View style={styles.highlightActions}>
              <Pressable
                onPress={() => handleOpenPage(highlightedInstance.instanceId)}
                style={({ pressed }) => [
                  styles.highlightEditBtn,
                  pressed && styles.highlightEditBtnPressed,
                ]}
              >
                <AppText variant="caption" style={styles.highlightEditText}>
                  Заполнить
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => setHighlightDismissed(true)}
                hitSlop={8}
                style={({ pressed }) => [pressed && styles.pressedIcon]}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        ) : null}

        <View ref={scrollContentRef}>
        <View style={styles.hero}>
          {coverSource ? (
            <Image
              source={coverSource}
              style={styles.heroCover}
              contentFit="cover"
              cachePolicy="disk"
              recyclingKey={`album-cover-${project.projectId}`}
              transition={0}
            />
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
              {getAlbumHeroSubtitle(
                project.meta?.category ?? celebration,
                project.lineGuideId,
              )}
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
          const progress = sectionProgressList.find((p) => p.sectionId === section.sectionId);
          if (!progress) return null;
          const rows = sectionRowsById.get(section.sectionId) ?? [];
          const isDiary = project.lineGuideId.startsWith('diary_interior_');
          // Дневники: первые две секции открыты — иначе после короткого intro кажется, что альбом «обрублен».
          const defaultExpanded = index === 0 || (isDiary && index === 1);

          return (
            <AlbumSectionAccordion
              key={section.sectionId}
              sectionProgress={progress}
              pages={rows}
              pageColumnCount={pageGridColumnCount}
              pageItemWidth={pageItemWidth}
              defaultExpanded={defaultExpanded}
              onOpenPage={handleOpenPage}
              onDuplicate={(instanceId) => void project.duplicatePage(instanceId)}
              onDeleteCopy={handleDeleteCopy}
              onRename={(instanceId, title) => void project.renamePage(instanceId, title)}
              onChangeTemplate={handleChangeTemplate}
              onMoveUp={(instanceId) => handleMove(instanceId, -1)}
              onMoveDown={(instanceId) => handleMove(instanceId, 1)}
              onReorderPage={handleReorderPage}
              totalPages={project.instances.length}
              reorderDisabled={project.isSaving}
              onToggleExcluded={handleToggleExcluded}
              highlightInstanceId={
                highlightDismissed ? undefined : scrollTargetInstanceId
              }
              scrollContentRef={scrollContentRef}
              onHighlightMeasured={scrollToHighlightedPage}
              showPageImages={listFocused}
            />
          );
        })}
        </View>
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
            onPress={handleAddPage}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
            <AppText variant="button" style={styles.secondaryBtnText}>
              Добавить страницу
            </AppText>
          </Pressable>
          <Pressable
            testID="album-export-button"
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
    gap: spacing.md,
  },
  loadingHint: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
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
  highlightBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    padding: spacing.sm,
    marginBottom: spacing.md,
    ...createShadow("sm"),
  },
  highlightBannerText: {
    flex: 1,
    gap: 2,
  },
  highlightTitle: {
    color: colors.textPrimary,
    fontFamily: sansFont("semibold"),
  },
  highlightSubtitle: {
    color: colors.textSecondary,
  },
  highlightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  highlightEditBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  highlightEditBtnPressed: {
    opacity: 0.9,
  },
  highlightEditText: {
    color: colors.white,
    fontFamily: sansFont("semibold"),
  },
  pressedIcon: {
    opacity: 0.75,
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
