import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams, type Href } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { AppButton, AppHeader, AppScreen, AppText } from "@/components/ui";
import {
  buildDefaultPlacementOrder,
  NEW_PLACEMENT_PAGE_ID,
  PagePlacementReorderList,
  type PlacementRow,
} from "@/components/album/page-placement-reorder-list";
import { getAlbumSections } from "@/constants/album-sections";
import {
  getAlbumPageSchema,
  getAlbumPageSchemas,
} from "@/constants/generated/album-page-schemas";
import {
  colors,
  createShadow,
  radii,
  sansFont,
  spacing,
} from "@/constants/design-tokens";
import type { AlbumPageSchema } from "@/types/album-page-schema";
import { useAlbumFormLayout } from "@/hooks/use-album-editor-layout";
import { useAlbumProject } from "@/hooks/use-album-project";
import {
  getAlbumImageUrisForViewing,
  getAlbumImages,
  getAlbumPageCount,
  getBlankInteriorPageUri,
  isBlankInteriorAlbum,
  resolveLineGuideId,
} from "@/utils/albumImages";
import { navigateToAlbumPages, type AlbumFlowParams } from "@/utils/albumNavigation";
import { getDiaryInteriorImageUris } from "@/utils/diaryInteriors";
import { resolveInstancePageImageUri } from "@/utils/resolveInstancePageImage";
import { PICKER_CONTENT_MAX_WIDTH } from "@/utils/responsive";

type WizardStep = "pick-page" | "pick-position";

type TemplatePageRow = {
  sourcePageIndex: number;
  schema: AlbumPageSchema;
  thumbnailUri?: string;
};

async function loadTemplateCatalogUris(
  albumId: string,
  category: string | undefined,
  lineGuideId: string,
): Promise<string[]> {
  if (category === "diary" && albumId.startsWith("diary_interior_")) {
    return (await getDiaryInteriorImageUris(albumId)) ?? [];
  }
  if (isBlankInteriorAlbum(albumId)) {
    const resolvedLineGuide = resolveLineGuideId(albumId, category);
    const blankUri = await getBlankInteriorPageUri(resolvedLineGuide);
    const count = getAlbumPageCount(albumId);
    return Array(count).fill(blankUri);
  }
  const uris = await getAlbumImageUrisForViewing(albumId);
  if (uris.length > 0) return uris;
  return getAlbumImages(albumId).map((asset) => String(asset));
}

function StepProgressBar({ step }: { step: WizardStep }) {
  const progress = step === "pick-page" ? 0.5 : 1;
  return (
    <View style={styles.stepBlock}>
      <AppText variant="stepLabel" style={styles.stepLabel}>
        {step === "pick-page" ? "Шаг 1 из 2" : "Шаг 2 из 2"}
      </AppText>
      <AppText variant="titleSm" style={styles.stepTitle}>
        {step === "pick-page" ? "Какую страницу добавить?" : "Куда поставить?"}
      </AppText>
      <AppText variant="bodySm" style={styles.stepHint}>
        {step === "pick-page"
          ? "Выберите макет из каталога альбома"
          : "Нажмите на страницу — новая встанет сразу после неё. Или зажмите ≡ и перетащите"}
      </AppText>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

function pageTypeLabel(pageType: AlbumPageSchema["pageType"]): string {
  switch (pageType) {
    case "photo":
    case "event_photo":
    case "caption_photo_page":
    case "free_photo_caption":
      return "Фото";
    case "free":
      return "Свободная";
    case "non_editable":
      return "Декор";
    case "structured":
      return "Текст";
    default:
      return "Страница";
  }
}

export default function AlbumAddPageScreen() {
  const { id, celebration, coverType, interiorType } = useLocalSearchParams<{
    id?: string;
    celebration?: string;
    coverType?: string;
    interiorType?: string;
  }>();
  const { height: windowHeight } = useWindowDimensions();

  const project = useAlbumProject({
    projectId: id,
    celebration,
    coverType,
    interiorType,
  });
  const { shellStyle } = useAlbumFormLayout();

  const albumFlowParams: AlbumFlowParams = {
    id,
    celebration,
    coverType,
    interiorType,
  };

  const [step, setStep] = useState<WizardStep>("pick-page");
  const [templateUris, setTemplateUris] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedSourcePageIndex, setSelectedSourcePageIndex] = useState<
    number | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placementOrder, setPlacementOrder] = useState<PlacementRow[]>([]);
  const loadingTopOffset = Math.min(
    Math.max(windowHeight * 0.18, 120),
    180,
  );

  const schemas = useMemo(
    () => getAlbumPageSchemas(project.lineGuideId),
    [project.lineGuideId],
  );

  const sections = useMemo(
    () => getAlbumSections(project.lineGuideId),
    [project.lineGuideId],
  );

  useEffect(() => {
    if (project.isLoading || !project.lineGuideId) return;
    let cancelled = false;

    (async () => {
      setCatalogLoading(true);
      try {
        const albumId =
          project.meta?.interiorType ?? project.meta?.albumId ?? project.lineGuideId;
        const category = project.meta?.category ?? celebration;
        const uris = await loadTemplateCatalogUris(
          albumId,
          category,
          project.lineGuideId,
        );
        if (!cancelled) setTemplateUris(uris);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    project.isLoading,
    project.lineGuideId,
    project.meta?.interiorType,
    project.meta?.albumId,
    project.meta?.category,
    celebration,
  ]);

  const templateRows = useMemo((): TemplatePageRow[] => {
    return schemas.map((schema) => ({
      sourcePageIndex: schema.sourcePageNumber - 1,
      schema,
      thumbnailUri: templateUris[schema.sourcePageNumber - 1],
    }));
  }, [schemas, templateUris]);

  const filteredTemplateRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return templateRows;
    return templateRows.filter((row) => {
      const title = row.schema.title.toLowerCase();
      const pageNum = String(row.schema.sourcePageNumber);
      return title.includes(query) || pageNum.includes(query);
    });
  }, [templateRows, searchQuery]);

  const sectionedTemplates = useMemo(() => {
    if (sections.length === 0) {
      return [{ sectionId: "all", title: "Все страницы", rows: filteredTemplateRows }];
    }
    const used = new Set<number>();
    const grouped = sections
      .map((section) => {
        const rows = filteredTemplateRows.filter((row) => {
          const n = row.schema.sourcePageNumber;
          if (n < section.pageRange[0] || n > section.pageRange[1]) return false;
          used.add(n);
          return true;
        });
        return { sectionId: section.sectionId, title: section.title, rows };
      })
      .filter((group) => group.rows.length > 0);

    const rest = filteredTemplateRows.filter(
      (row) => !used.has(row.schema.sourcePageNumber),
    );
    if (rest.length > 0) {
      grouped.push({ sectionId: "other", title: "Другие страницы", rows: rest });
    }
    return grouped;
  }, [sections, filteredTemplateRows]);

  const selectedTemplate = useMemo(() => {
    if (selectedSourcePageIndex == null) return null;
    return templateRows.find(
      (row) => row.sourcePageIndex === selectedSourcePageIndex,
    );
  }, [selectedSourcePageIndex, templateRows]);

  const handleSelectTemplate = useCallback(
    (sourcePageIndex: number) => {
      const template = templateRows.find(
        (row) => row.sourcePageIndex === sourcePageIndex,
      );
      if (!template) return;

      setSelectedSourcePageIndex(sourcePageIndex);
      setPlacementOrder(
        buildDefaultPlacementOrder({
          instances: project.instances,
          getTitle: (instance) => project.getInstanceTitle(instance),
          getThumbnail: (instance) =>
            resolveInstancePageImageUri(project.images, instance),
          sourcePageNumber: template.schema.sourcePageNumber,
          newPageTitle: template.schema.title,
          newThumbnailUri: template.thumbnailUri,
        }),
      );
      setStep("pick-position");
    },
    [templateRows, project.instances, project.images, project],
  );

  const handleBack = useCallback(() => {
    if (step === "pick-position") {
      setStep("pick-page");
      return;
    }
    navigateToAlbumPages(albumFlowParams);
  }, [step, albumFlowParams]);

  const handleConfirmPlacement = useCallback(async () => {
    if (
      selectedSourcePageIndex == null ||
      !project.projectId ||
      isSubmitting
    ) {
      return;
    }

    const newIndex = placementOrder.findIndex(
      (row) => row.id === NEW_PLACEMENT_PAGE_ID,
    );
    if (newIndex < 0) return;

    setIsSubmitting(true);
    try {
      const schema = getAlbumPageSchema(
        project.lineGuideId,
        selectedSourcePageIndex + 1,
      );
      const newInstanceId = await project.addPage({
        insertAfterIndex: newIndex - 1,
        sourcePageIndex: selectedSourcePageIndex,
        titleOverride: schema?.title,
      });
      router.replace({
        pathname: "/album-pages",
        params: {
          id: project.projectId,
          celebration,
          coverType,
          interiorType,
          ...(newInstanceId ? { highlightInstanceId: newInstanceId } : {}),
        },
      } as unknown as Href);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedSourcePageIndex,
    project,
    isSubmitting,
    placementOrder,
    celebration,
    coverType,
    interiorType,
  ]);

  if (project.isLoading || catalogLoading) {
    return (
      <AppScreen
        contentContainerStyle={[
          styles.loadingContent,
          { paddingTop: loadingTopOffset },
        ]}
      >
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="bodySm" style={styles.loadingText}>
            Загружаем страницы альбома…
          </AppText>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scroll={step === "pick-page"}
      tabletShell
      contentMaxWidth={PICKER_CONTENT_MAX_WIDTH}
      contentContainerStyle={[
        styles.container,
        shellStyle,
        step === "pick-position" && styles.containerPlacement,
      ]}
    >
      <AppHeader title="Добавить страницу" onBack={handleBack} />

      <StepProgressBar step={step} />

      {step === "pick-page" ? (
        <>
          {templateRows.length > 10 ? (
            <View style={styles.searchWrap}>
              <Ionicons
                name="search-outline"
                size={18}
                color={colors.textSecondary}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Поиск по названию или номеру…"
                placeholderTextColor={colors.placeholder}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.tabInactive}
                  />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {sectionedTemplates.map((section) => (
            <View key={section.sectionId} style={styles.sectionBlock}>
              <AppText variant="bodySm" style={styles.sectionTitle}>
                {section.title}
              </AppText>
              <View style={styles.templateGrid}>
                {section.rows.map((row) => {
                  const isSelected =
                    selectedSourcePageIndex === row.sourcePageIndex;
                  return (
                    <Pressable
                      key={row.schema.pageId}
                      onPress={() => handleSelectTemplate(row.sourcePageIndex)}
                      style={({ pressed }) => [
                        styles.templateCard,
                        isSelected && styles.templateCardSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.templatePreview}>
                        {row.thumbnailUri ? (
                          <Image
                            source={{ uri: row.thumbnailUri }}
                            style={styles.templateImage}
                            contentFit="cover"
                            transition={0}
                          />
                        ) : (
                          <View style={styles.templatePlaceholder}>
                            <Ionicons
                              name="document-outline"
                              size={28}
                              color={colors.tabInactive}
                            />
                          </View>
                        )}
                        <View style={styles.pageBadge}>
                          <AppText variant="caption" style={styles.pageBadgeText}>
                            {row.schema.sourcePageNumber}
                          </AppText>
                        </View>
                      </View>
                      <AppText
                        variant="bodySm"
                        numberOfLines={2}
                        style={styles.templateTitle}
                      >
                        {row.schema.title}
                      </AppText>
                      <View style={styles.typePill}>
                        <AppText variant="caption" style={styles.typePillText}>
                          {pageTypeLabel(row.schema.pageType)}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {filteredTemplateRows.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="search-outline"
                size={32}
                color={colors.tabInactive}
              />
              <AppText variant="bodySm" style={styles.emptyText}>
                Ничего не найдено
              </AppText>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.placementStep}>
          {selectedTemplate ? (
            <View style={styles.selectedSummary}>
              <View style={styles.selectedPreview}>
                {selectedTemplate.thumbnailUri ? (
                  <Image
                    source={{ uri: selectedTemplate.thumbnailUri }}
                    style={styles.selectedImage}
                    contentFit="cover"
                    transition={0}
                  />
                ) : (
                  <View style={styles.templatePlaceholder}>
                    <Ionicons
                      name="document-outline"
                      size={22}
                      color={colors.tabInactive}
                    />
                  </View>
                )}
              </View>
              <View style={styles.selectedInfo}>
                <AppText variant="caption" style={styles.selectedLabel}>
                  Добавляем
                </AppText>
                <AppText variant="body" numberOfLines={2}>
                  {selectedTemplate.schema.title}
                </AppText>
                <AppText variant="caption" style={styles.selectedMeta}>
                  Стр. {selectedTemplate.schema.sourcePageNumber} ·{" "}
                  {pageTypeLabel(selectedTemplate.schema.pageType)}
                </AppText>
              </View>
              <Pressable
                onPress={() => setStep("pick-page")}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.changeBtn,
                  pressed && styles.pressed,
                ]}
              >
                <AppText variant="caption" style={styles.changeBtnText}>
                  Изменить
                </AppText>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.placementListWrap}>
            <PagePlacementReorderList
              rows={placementOrder}
              onOrderChange={setPlacementOrder}
              disabled={isSubmitting}
            />
          </View>

          <View style={styles.placementActions}>
            {isSubmitting ? (
              <View style={styles.submittingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText variant="bodySm" style={styles.submittingText}>
                  Добавляем страницу…
                </AppText>
              </View>
            ) : (
              <>
                <AppButton
                  title="Добавить страницу"
                  onPress={() => void handleConfirmPlacement()}
                />
                <AppButton
                  title="Отмена"
                  variant="outline"
                  onPress={() => navigateToAlbumPages(albumFlowParams)}
                  style={styles.cancelBtn}
                />
              </>
            )}
          </View>
        </View>
      )}
    </AppScreen>
  );
}

const CARD_WIDTH = "47%";

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },
  containerPlacement: {
    flex: 1,
  },
  placementStep: {
    flex: 1,
  },
  placementListWrap: {
    flex: 1,
    minHeight: 220,
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingCard: {
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textSecondary,
  },
  stepBlock: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  stepLabel: {
    color: colors.primary,
  },
  stepTitle: {
    color: colors.textPrimary,
  },
  stepHint: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primarySurface,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    ...createShadow("sm"),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: sansFont("regular"),
    color: colors.textPrimary,
    paddingVertical: 6,
  },
  sectionBlock: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: sansFont("semibold"),
  },
  templateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  templateCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...createShadow("md"),
  },
  templateCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.6,
  },
  templatePreview: {
    aspectRatio: 3 / 4,
    borderRadius: radii.sm,
    overflow: "hidden",
    backgroundColor: colors.primarySurface,
    marginBottom: spacing.xs,
    position: "relative",
  },
  templateImage: {
    width: "100%",
    height: "100%",
  },
  templatePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageBadge: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pageBadgeText: {
    color: colors.primary,
    fontFamily: sansFont("semibold"),
  },
  templateTitle: {
    color: colors.textPrimary,
    minHeight: 40,
  },
  typePill: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: colors.primarySurface,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typePillText: {
    color: colors.primary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
  },
  selectedSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  selectedPreview: {
    width: 52,
    height: 68,
    borderRadius: radii.sm,
    overflow: "hidden",
    backgroundColor: colors.white,
  },
  selectedImage: {
    width: "100%",
    height: "100%",
  },
  selectedInfo: {
    flex: 1,
    gap: 2,
  },
  selectedLabel: {
    color: colors.primary,
    fontFamily: sansFont("semibold"),
  },
  selectedMeta: {
    color: colors.textSecondary,
  },
  changeBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  changeBtnText: {
    color: colors.primary,
    fontFamily: sansFont("semibold"),
  },
  placementActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  submittingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  submittingText: {
    color: colors.textSecondary,
  },
  cancelBtn: {
    marginTop: spacing.sm,
  },
});
