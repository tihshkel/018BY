import { router, useLocalSearchParams, type Href } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";

import { AlbumPreviewPhotoBlockEditor } from "@/components/album/album-preview-photo-block-editor";
import { NonEditableBanner } from "@/components/album/non-editable-banner";
import { PageFontPicker } from "@/components/album/page-font-picker";
import { TemplateWireframePreview } from "@/components/album/template-wireframe-preview";
import PageRenderer, { type PageRendererRef } from "@/components/page-renderer";
import { AppButton, AppHeader, AppScreen, AppText } from "@/components/ui";
import { normalizeAlbumFontId } from "@/constants/album-fonts";
import {
  colors,
  radii,
  spacing,
} from "@/constants/design-tokens";
import { useAlbumPagePreviewLayout } from "@/hooks/use-album-editor-layout";
import { usePageAnnotationsForLayout } from "@/hooks/use-page-annotations-for-layout";
import { useAlbumPagePhotoEditor } from "@/hooks/use-album-page-photo-editor";
import { useAlbumProject } from "@/hooks/use-album-project";
import {
  buildAlbumPagesHref,
  navigateToAlbumPages,
  type AlbumFlowParams,
} from "@/utils/albumNavigation";
import {
  getDefaultVariantIdForPage,
} from "@/utils/variantPreview";
import {
  hasFormTextInput,
  isPhotoOnlySchema,
  resolveFormPathname,
  usesUnifiedPhotoEditor,
} from "@/utils/albumPageNavigation";
import { resolvePagePreviewBackgroundUri } from "@/utils/pagePreviewBackground";
import { resolvePhotoBlockSafeZoneViewportRect } from "@/utils/photoBlockSafeZone";
import { getDefaultPageAspectRatio, persistProjectViewport } from "@/utils/exportViewport";
import {
  getBlankInteriorPageUri,
} from "@/utils/albumImages";
import { resolveInstancePageImageUri } from "@/utils/resolveInstancePageImage";
import { createEmptyPageValues } from "@/utils/pageStorage";
import { computePageStatus } from "@/utils/pageStatus";
import {
  getPageFormatForLineGuide,
  isBlankTemplateLineGuide,
} from "@/utils/photoPageTemplateManifest";

export default function AlbumPagePreviewScreen() {
  const { id, instanceId, celebration, coverType, interiorType, mode } =
    useLocalSearchParams<{
      id?: string;
      instanceId?: string;
      celebration?: string;
      coverType?: string;
      interiorType?: string;
      mode?: string;
    }>();

  const isFinalPreview = mode === "final";
  const rendererRef = useRef<PageRendererRef>(null);
  const [ready, setReady] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(() =>
    getDefaultPageAspectRatio({ lineGuideId: interiorType === "kids_48" ? "kids_48" : undefined }),
  );
  const [sourceImageSize, setSourceImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const previewLayout = useAlbumPagePreviewLayout(imageAspectRatio);

  const project = useAlbumProject({
    projectId: id,
    celebration,
    coverType,
    interiorType,
  });

  const albumFlowParams: AlbumFlowParams = {
    id,
    celebration,
    coverType,
    interiorType,
  };

  const goToPageList = () => navigateToAlbumPages(albumFlowParams);

  const instance = useMemo(
    () => project.instances.find((i) => i.instanceId === instanceId),
    [project.instances, instanceId],
  );

  const schema = instance ? project.getSchemaForInstance(instance) : undefined;
  const resolvedLineGuideId = schema?.lineGuideId ?? project.lineGuideId ?? interiorType;
  const values = instanceId ? project.pageValuesMap[instanceId] : undefined;
  const status = schema ? computePageStatus(schema, values) : "empty";
  const baseImageUri = instance
    ? resolveInstancePageImageUri(project.images, instance)
    : undefined;
  const primaryPhotoBlock = schema?.photoBlocks?.[0];
  const selectedVariantId = useMemo(() => {
    if (!values?.photoBlocks) return null;
    for (const block of Object.values(values.photoBlocks)) {
      if (block?.variantId) return block.variantId;
    }
    return null;
  }, [values?.photoBlocks]);
  const effectiveVariantId = useMemo(() => {
    if (selectedVariantId) return selectedVariantId;
    if (!schema || !instance) return null;
    return getDefaultVariantIdForPage(
      resolvedLineGuideId,
      instance.sourcePageNumber ?? schema.sourcePageNumber,
      primaryPhotoBlock,
    );
  }, [
    instance,
    primaryPhotoBlock,
    resolvedLineGuideId,
    schema,
    selectedVariantId,
  ]);
  const hasContent =
    status === "filled" ||
    status === "draft" ||
    status === "continue";
  const hasPhotoContent = useMemo(
    () =>
      Object.values(values?.photoBlocks ?? {}).some((block) =>
        block?.slots?.some((slot) => typeof slot === "string" && slot.length > 0),
      ),
    [values?.photoBlocks],
  );
  const isBlankTemplatePage =
    Boolean(schema?.templateLibraryId) &&
    isBlankTemplateLineGuide(resolvedLineGuideId);
  const showBlankTemplateGuide = isBlankTemplatePage && !hasContent && !isFinalPreview;
  const showTemplateWireframe =
    isBlankTemplatePage &&
    Boolean(schema?.templateLibraryId) &&
    !isFinalPreview &&
    (showBlankTemplateGuide || !hasPhotoContent);
  const preferDesignLayout = !isFinalPreview && !hasContent;
  const resolvedImageUri = useMemo(
    () =>
      resolvePagePreviewBackgroundUri({
        lineGuideId: resolvedLineGuideId,
        sourcePageNumber: instance?.sourcePageNumber ?? schema?.sourcePageNumber,
        baseImageUri,
        variantId: effectiveVariantId,
        preferDesignLayout,
      }),
    [
      baseImageUri,
      effectiveVariantId,
      instance?.sourcePageNumber,
      preferDesignLayout,
      project.lineGuideId,
      resolvedLineGuideId,
      schema?.sourcePageNumber,
    ],
  );
  const [displayImageUri, setDisplayImageUri] = useState<string | undefined>(
    resolvedImageUri ?? undefined,
  );
  const [blankPageFallbackUri, setBlankPageFallbackUri] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setDisplayImageUri(resolvedImageUri ?? undefined);
    setReady(false);
  }, [resolvedImageUri]);

  useEffect(() => {
    let cancelled = false;

    if (resolvedImageUri || !isBlankTemplatePage) {
      setBlankPageFallbackUri(null);
      return () => {
        cancelled = true;
      };
    }

    getBlankInteriorPageUri(resolvedLineGuideId)
      .then((uri) => {
        if (!cancelled) {
          setBlankPageFallbackUri(uri);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBlankPageFallbackUri(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isBlankTemplatePage, resolvedImageUri, resolvedLineGuideId]);

  const imageUri = displayImageUri ?? resolvedImageUri ?? blankPageFallbackUri ?? undefined;
  const selectedFontId = normalizeAlbumFontId(values?.textFontFamily);
  const hasTextFields = hasFormTextInput(schema);
  const isLocked =
    schema?.pageType === "non_editable" || status === "locked";

  const photoEditor = useAlbumPagePhotoEditor({
    instanceId,
    schema,
    pageValues: values ?? createEmptyPageValues(),
    projectId: project.projectId,
    commitPagePatch: project.updatePageValues,
  });

  const primaryBlockValues = primaryPhotoBlock
    ? photoEditor.photoBlocks[primaryPhotoBlock.blockId]
    : undefined;
  const primaryVariantId =
    primaryBlockValues?.variantId ??
    effectiveVariantId ??
    primaryPhotoBlock?.variants[0]?.variantId ??
    "default";
  const primarySlotUris = primaryBlockValues?.slots ?? [];
  const hasFilledPhotos = primarySlotUris.some(Boolean);
  const isCircleTreeBlock = primaryPhotoBlock?.layoutKind === "circle_tree";
  const primaryVariant =
    primaryPhotoBlock?.variants.find((item) => item.variantId === primaryVariantId) ??
    primaryPhotoBlock?.variants[0];
  const isMultiSlotCollage = (primaryVariant?.slots ?? 0) > 1;
  const shouldMaskPdfPhotoPlaceholder =
    isFinalPreview &&
    !isLocked &&
    primaryPhotoBlock != null &&
    hasFilledPhotos &&
    !isCircleTreeBlock &&
    !isMultiSlotCollage;
  const showPhotoBlockEditor = shouldMaskPdfPhotoPlaceholder;

  const photoSafeBounds = useMemo(() => {
    if (!shouldMaskPdfPhotoPlaceholder || !instance || !schema) return null;
    return resolvePhotoBlockSafeZoneViewportRect({
      lineGuideId: resolvedLineGuideId,
      sourcePageNumber: instance.sourcePageNumber ?? schema.sourcePageNumber,
      variantId: primaryVariantId,
      coordinateWidth: previewLayout.coordinateWidth,
      coordinateHeight: previewLayout.coordinateHeight,
      sourceWidth: sourceImageSize?.width,
      sourceHeight: sourceImageSize?.height,
      templateLibraryId: schema.templateLibraryId,
      photoOnlyPage: isPhotoOnlySchema(schema),
    });
  }, [
    instance,
    previewLayout.coordinateHeight,
    previewLayout.coordinateWidth,
    primaryVariantId,
    resolvedLineGuideId,
    schema,
    showPhotoBlockEditor,
    shouldMaskPdfPhotoPlaceholder,
    sourceImageSize?.height,
    sourceImageSize?.width,
  ]);

  const annotations = usePageAnnotationsForLayout({
    instance,
    schema,
    values,
    lineGuideId: resolvedLineGuideId,
    viewportWidth: previewLayout.coordinateWidth,
    viewportHeight: previewLayout.coordinateHeight,
    sourceWidth: sourceImageSize?.width,
    sourceHeight: sourceImageSize?.height,
    debounceMs: 0,
  });

  const displayAnnotations = useMemo(() => {
    if (!showPhotoBlockEditor) return annotations;
    // Draggable collage editor redraws user photos; keep gender fills and placeholders.
    return annotations.filter(
      (item) => item.type !== "image" || !item.imageUri,
    );
  }, [annotations, showPhotoBlockEditor]);

  useEffect(() => {
    setReady(false);
  }, [instanceId, imageUri]);

  const handlePageReady = useCallback(() => {
    setReady(true);
  }, []);

  const handleSourceSize = useCallback((size: { width: number; height: number }) => {
    setSourceImageSize((prev) => {
      if (prev?.width === size.width && prev?.height === size.height) {
        return prev;
      }
      return { width: size.width, height: size.height };
    });
    if (size.width > 0 && size.height > 0) {
      setImageAspectRatio((prev) => {
        const next = size.height / size.width;
        return Math.abs(prev - next) < 0.0001 ? prev : next;
      });
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!imageUri) {
      setImageAspectRatio(getDefaultPageAspectRatio({ lineGuideId: resolvedLineGuideId }));
      setSourceImageSize(null);
    }
  }, [imageUri, resolvedLineGuideId]);

  useEffect(() => {
    if (!imageUri) return;
    void ExpoImage.prefetch(imageUri);
  }, [imageUri]);

  useEffect(() => {
    if (!id || previewLayout.coordinateWidth <= 0 || previewLayout.coordinateHeight <= 0) {
      return;
    }

    persistProjectViewport(id, {
      width: previewLayout.coordinateWidth,
      height: previewLayout.coordinateHeight,
    }).catch(() => {});
  }, [id, previewLayout.coordinateWidth, previewLayout.coordinateHeight]);

  if (project.isLoading || !instance || !schema) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  const isExcluded = status === "excluded";
  const pageLabel = `Страница ${instance.order} из ${project.instances.length}`;

  const handleFill = () => {
    const pathname = usesUnifiedPhotoEditor(schema)
      ? resolveFormPathname(schema)
      : "/album-page-form";
    router.push({
      pathname,
      params: { id, instanceId, celebration, coverType, interiorType },
    } as unknown as Href);
  };

  const handleChangeTemplate = () => {
    if (!instanceId) return;
    router.push({
      pathname: "/album-template-library",
      params: {
        id,
        celebration,
        coverType,
        interiorType,
        instanceId,
        mode: "replace",
      },
    } as unknown as Href);
  };

  const handleLater = () => {
    if (instanceId && hasContent) {
      project.markDraftSaved(instanceId);
    }
    goToPageList();
  };

  const handleFontChange = (fontId: string) => {
    if (!instanceId) return;
    project.updatePageValues(instanceId, (prev) => ({
      ...prev,
      textFontFamily: fontId,
    }));
  };

  const handleSave = async () => {
    if (!instanceId) return;
    const current = project.pageValuesMap[instanceId] ?? values;
    if (current) {
      await project.savePageValuesNow(instanceId, current);
    }
    router.replace(
      buildAlbumPagesHref({
        ...albumFlowParams,
        scrollToInstanceId: instanceId,
      }),
    );
  };

  const fontPicker =
    !isLocked && isFinalPreview && (hasTextFields || schema.captionEnabled) ? (
      <PageFontPicker value={selectedFontId} onChange={handleFontChange} />
    ) : null;

  const previewBlock = (
    <View style={styles.previewSection}>
      <AppText variant="bodySm" style={styles.previewHint}>
        {isFinalPreview
          ? showPhotoBlockEditor
            ? "Нажмите на фото — появится рамка. Перетаскивайте, ущипните для масштаба; фото остаётся в рамке PDF"
            : "Так страница будет выглядеть в альбоме — проверьте текст и фото"
          : showTemplateWireframe
            ? "Схема страницы: серые блоки — места для фото, линии — поля для текста"
            : preferDesignLayout
              ? "Пример макета из дизайн-PDF — здесь видно, где текст и фото"
            : "Предпросмотр макета — так страница будет выглядеть в книге"}
      </AppText>

      <View
        style={[
          styles.pageShadowWrap,
          {
            width: previewLayout.displayWidth,
            height: previewLayout.displayHeight,
          },
        ]}
      >
        <View
          style={[
            styles.pageScaleWrap,
            {
              width: previewLayout.coordinateWidth,
              height: previewLayout.coordinateHeight,
              transform: [{ scale: previewLayout.displayScale }],
            },
          ]}
        >
          <View
            style={[
              styles.pageCard,
              {
                width: previewLayout.coordinateWidth,
                height: previewLayout.coordinateHeight,
              },
            ]}
          >
            {showTemplateWireframe ? (
              <TemplateWireframePreview
                templateId={schema.templateLibraryId!}
                format={getPageFormatForLineGuide(resolvedLineGuideId)}
                values={values}
              />
            ) : imageUri ? (
              <PageRenderer
                ref={rendererRef}
                imageUri={imageUri}
                annotations={displayAnnotations}
                width={previewLayout.coordinateWidth}
                height={previewLayout.coordinateHeight}
                sourceWidth={sourceImageSize?.width}
                sourceHeight={sourceImageSize?.height}
                lineGuideId={resolvedLineGuideId}
                sourcePageNumber={instance.sourcePageNumber ?? schema.sourcePageNumber}
                waitForAnnotationImages={false}
                backgroundColor={colors.white}
                readOnly
                onReady={handlePageReady}
                onSourceSize={handleSourceSize}
                onImageError={() => {
                  if (baseImageUri && displayImageUri !== baseImageUri) {
                    setDisplayImageUri(baseImageUri);
                    return;
                  }
                  if (
                    isBlankTemplatePage &&
                    blankPageFallbackUri &&
                    imageUri !== blankPageFallbackUri
                  ) {
                    setDisplayImageUri(blankPageFallbackUri);
                  }
                }}
                middleLayer={
                  showPhotoBlockEditor && instance ? (
                    <AlbumPreviewPhotoBlockEditor
                      lineGuideId={resolvedLineGuideId}
                      sourcePageNumber={
                        instance.sourcePageNumber ?? schema.sourcePageNumber
                      }
                      variantId={primaryVariantId}
                      slotUris={primarySlotUris}
                      templateLibraryId={schema.templateLibraryId}
                      groupTransform={values?.photoGroupTransform}
                      safeBounds={photoSafeBounds}
                      coordinateWidth={previewLayout.coordinateWidth}
                      coordinateHeight={previewLayout.coordinateHeight}
                      sourceWidth={sourceImageSize?.width}
                      sourceHeight={sourceImageSize?.height}
                      onGroupTransformChange={photoEditor.handleGroupTransformChange}
                    />
                  ) : null
                }
              />
            ) : (
              <View style={styles.previewUnavailable}>
                <ActivityIndicator color={colors.primary} />
                <AppText variant="caption" style={styles.previewUnavailableText}>
                  Загрузка макета страницы…
                </AppText>
              </View>
            )}
            {!showTemplateWireframe && !ready && imageUri ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {!isFinalPreview ? (
        <AppText variant="caption" style={styles.previewNote}>
          {hasContent
            ? "Ниже можно изменить данные или вернуться к списку страниц"
            : "Чтобы ввести текст и фото, нажмите «Заполнить страницу»"}
        </AppText>
      ) : null}
    </View>
  );

  const actionsBlock = isLocked ? (
    <AppButton
      title="Назад к списку"
      variant="outline"
      onPress={goToPageList}
    />
  ) : isExcluded ? (
    <View style={styles.actions}>
      <AppButton
        title="Вернуть в альбом"
        onPress={() => {
          if (instanceId) project.setPageExcluded(instanceId, false);
        }}
      />
      <AppButton title="Назад к списку" variant="outline" onPress={goToPageList} />
    </View>
  ) : isFinalPreview ? (
    <View style={styles.actions}>
      <AppButton title="Сохранить страницу" onPress={handleSave} />
      <AppButton title="Изменить" variant="outline" onPress={handleFill} />
      <AppButton
        title="Далее →"
        variant="ghost"
        onPress={() => {
          const next = project.instances.find(
            (i) => i.order === instance.order + 1,
          );
          if (next) {
            router.replace({
              pathname: "/album-page-preview",
              params: {
                id,
                instanceId: next.instanceId,
                celebration,
                coverType,
                interiorType,
                mode: "final",
              },
            } as unknown as Href);
              } else {
                router.replace(buildAlbumPagesHref(albumFlowParams));
              }
        }}
      />
    </View>
  ) : (
    <View style={styles.actions}>
      <AppButton
        title={
          hasContent
            ? status === "continue"
              ? "Продолжить заполнение"
              : "Редактировать данные"
            : "Заполнить страницу"
        }
        onPress={handleFill}
      />
      <AppButton
        title="Редактировать позже"
        variant="outline"
        onPress={handleLater}
      />
      {isBlankTemplatePage ? (
        <AppButton
          title="Сменить шаблон"
          variant="ghost"
          onPress={handleChangeTemplate}
        />
      ) : null}
    </View>
  );

  return (
    <AppScreen
      scroll
      contentContainerStyle={[styles.container, previewLayout.shellStyle]}
    >
      <AppHeader
        title={isFinalPreview ? "Предпросмотр страницы" : pageLabel}
        onBack={goToPageList}
        right={
          !isLocked && hasContent && !isFinalPreview ? (
            <AppText
              variant="bodySm"
              style={styles.editLink}
              onPress={handleFill}
            >
              Изменить
            </AppText>
          ) : null
        }
      />

      {isLocked ? <NonEditableBanner /> : null}

      {previewLayout.useSplitLayout ? (
        <View style={styles.splitRow}>
          <View style={styles.previewColumn}>{previewBlock}</View>
          <View style={styles.controlsColumn}>
            {fontPicker}
            {actionsBlock}
          </View>
        </View>
      ) : (
        <>
          {fontPicker}
          {previewBlock}
          {actionsBlock}
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  editLink: {
    color: colors.primary,
  },
  splitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.lg,
    width: "100%",
  },
  previewColumn: {
    flex: 1.15,
    minWidth: 0,
    alignItems: "center",
  },
  controlsColumn: {
    flex: 0.85,
    minWidth: 280,
    maxWidth: 360,
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  previewSection: {
    gap: spacing.sm,
    alignItems: "center",
    width: "100%",
  },
  previewHint: {
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
  previewNote: {
    color: colors.placeholder,
    textAlign: "center",
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  pageShadowWrap: {
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.sm,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  pageScaleWrap: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
    overflow: "hidden",
  },
  pageCard: {
    borderRadius: radii.sm,
    overflow: "hidden",
    backgroundColor: colors.white,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  previewUnavailable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  previewUnavailableText: {
    color: colors.textSecondary,
    textAlign: "center",
  },
  actions: {
    gap: spacing.sm,
    width: "100%",
  },
});
