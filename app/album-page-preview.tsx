import { router, useLocalSearchParams, type Href } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
} from "react-native";

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
  resolveFormPathname,
  usesUnifiedPhotoEditor,
} from "@/utils/albumPageNavigation";
import { resolvePagePreviewBackgroundUri } from "@/utils/pagePreviewBackground";
import { persistProjectViewport } from "@/utils/exportViewport";
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
  const [imageAspectRatio, setImageAspectRatio] = useState(1.414);
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
      schema.lineGuideId ?? project.lineGuideId,
      instance.sourcePageNumber ?? schema.sourcePageNumber,
      primaryPhotoBlock,
    );
  }, [
    instance,
    primaryPhotoBlock,
    project.lineGuideId,
    schema,
    selectedVariantId,
  ]);
  const hasContent =
    status === "filled" ||
    status === "draft" ||
    status === "continue";
  const isBlankTemplatePage =
    Boolean(schema?.templateLibraryId) &&
    isBlankTemplateLineGuide(schema?.lineGuideId ?? project.lineGuideId);
  const showBlankTemplateGuide = isBlankTemplatePage && !hasContent && !isFinalPreview;
  const preferDesignLayout = !isFinalPreview && !hasContent;
  const resolvedImageUri = useMemo(
    () =>
      resolvePagePreviewBackgroundUri({
        lineGuideId: schema?.lineGuideId ?? project.lineGuideId,
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
      schema?.lineGuideId,
      schema?.sourcePageNumber,
    ],
  );
  const [displayImageUri, setDisplayImageUri] = useState<string | undefined>(
    resolvedImageUri ?? undefined,
  );

  useEffect(() => {
    setDisplayImageUri(resolvedImageUri ?? undefined);
    setReady(false);
  }, [resolvedImageUri]);

  const imageUri = displayImageUri ?? resolvedImageUri;
  const selectedFontId = normalizeAlbumFontId(values?.textFontFamily);
  const hasTextFields = hasFormTextInput(schema);
  const isLocked =
    schema?.pageType === "non_editable" || status === "locked";

  const photoEditor = useAlbumPagePhotoEditor({
    instanceId,
    schema,
    pageValues: values ?? createEmptyPageValues(),
    project,
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
  const showPhotoBlockEditor =
    isFinalPreview &&
    !isLocked &&
    primaryPhotoBlock != null &&
    hasFilledPhotos &&
    !isCircleTreeBlock;

  const annotations = usePageAnnotationsForLayout({
    instance,
    schema,
    values,
    lineGuideId: project.lineGuideId,
    viewportWidth: previewLayout.coordinateWidth,
    viewportHeight: previewLayout.coordinateHeight,
    sourceWidth: sourceImageSize?.width,
    sourceHeight: sourceImageSize?.height,
  });

  const displayAnnotations = useMemo(() => {
    if (!showPhotoBlockEditor) return annotations;
    // Draggable collage editor redraws user photos; keep gender fills and placeholders.
    return annotations.filter(
      (item) => item.type !== "image" || !item.imageUri,
    );
  }, [annotations, showPhotoBlockEditor]);
  const calibratedAnnotations = imageUri && !sourceImageSize ? [] : displayAnnotations;

  useEffect(() => {
    setReady(false);
  }, [instanceId, annotations.length, selectedFontId]);

  useEffect(() => {
    if (!imageUri) {
      setImageAspectRatio(1.414);
      setSourceImageSize(null);
      return;
    }

    let cancelled = false;
    Image.getSize(
      imageUri,
      (width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        setImageAspectRatio(height / width);
        setSourceImageSize({ width, height });
      },
      () => {
        if (!cancelled) {
          setImageAspectRatio(1.414);
          setSourceImageSize(null);
        }
      },
    );

    return () => {
      cancelled = true;
    };
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
    router.replace(buildAlbumPagesHref(albumFlowParams));
  };

  const fontPicker =
    !isLocked && hasTextFields && isFinalPreview ? (
      <PageFontPicker value={selectedFontId} onChange={handleFontChange} />
    ) : null;

  const previewBlock = (
    <View style={styles.previewSection}>
      <AppText variant="bodySm" style={styles.previewHint}>
        {isFinalPreview
          ? showPhotoBlockEditor
            ? "Нажмите на блок фото — появится розовая рамка. Перетаскивайте блок или углы для изменения размера"
            : "Так страница будет выглядеть в альбоме — проверьте текст и фото"
          : showBlankTemplateGuide
            ? "Схема страницы: розовые блоки — места для фото, линии — поля для текста"
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
            {showBlankTemplateGuide && schema?.templateLibraryId ? (
              <TemplateWireframePreview
                templateId={schema.templateLibraryId}
                format={getPageFormatForLineGuide(schema.lineGuideId ?? project.lineGuideId)}
                values={values}
              />
            ) : imageUri ? (
              <PageRenderer
                ref={rendererRef}
                imageUri={imageUri}
                annotations={calibratedAnnotations}
                width={previewLayout.coordinateWidth}
                height={previewLayout.coordinateHeight}
                sourceWidth={sourceImageSize?.width}
                sourceHeight={sourceImageSize?.height}
                lineGuideId={project.lineGuideId}
                backgroundColor={colors.white}
                onReady={() => setReady(true)}
                onSourceSize={setSourceImageSize}
                onImageError={() => {
                  if (baseImageUri && displayImageUri !== baseImageUri) {
                    setDisplayImageUri(baseImageUri);
                  }
                }}
              />
            ) : null}
            {showPhotoBlockEditor && instance ? (
              <AlbumPreviewPhotoBlockEditor
                lineGuideId={schema.lineGuideId ?? project.lineGuideId}
                sourcePageNumber={
                  instance.sourcePageNumber ?? schema.sourcePageNumber
                }
                variantId={primaryVariantId}
                slotUris={primarySlotUris}
                templateLibraryId={schema.templateLibraryId}
                groupTransform={values?.photoGroupTransform}
                coordinateWidth={previewLayout.coordinateWidth}
                coordinateHeight={previewLayout.coordinateHeight}
                sourceWidth={sourceImageSize?.width}
                sourceHeight={sourceImageSize?.height}
                onGroupTransformChange={photoEditor.handleGroupTransformChange}
              />
            ) : null}
            {!showBlankTemplateGuide && !ready && imageUri ? (
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
  actions: {
    gap: spacing.sm,
    width: "100%",
  },
});
