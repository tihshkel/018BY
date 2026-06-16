import { router, useLocalSearchParams, type Href } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
} from "react-native";

import { NonEditableBanner } from "@/components/album/non-editable-banner";
import { PageFontPicker } from "@/components/album/page-font-picker";
import PageRenderer, { type PageRendererRef } from "@/components/page-renderer";
import { AppButton, AppHeader, AppScreen, AppText } from "@/components/ui";
import {
  colors,
  radii,
  spacing,
} from "@/constants/design-tokens";
import { useAlbumPagePreviewLayout } from "@/hooks/use-album-editor-layout";
import { useAlbumProject } from "@/hooks/use-album-project";
import {
  buildAlbumPagesHref,
  navigateToAlbumPages,
  type AlbumFlowParams,
} from "@/utils/albumNavigation";
import { resolveVariantPreviewBackgroundUri } from "@/utils/albumImages";
import { isPhotoOnlySchema } from "@/utils/albumPageNavigation";
import { computePageStatus } from "@/utils/pageStatus";

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
  const baseImageUri = instance ? project.images[instance.imageIndex] : undefined;
  const selectedVariantId = useMemo(() => {
    if (!values?.photoBlocks) return null;
    for (const block of Object.values(values.photoBlocks)) {
      if (block?.variantId) return block.variantId;
    }
    return null;
  }, [values?.photoBlocks]);
  const imageUri =
    resolveVariantPreviewBackgroundUri({
      lineGuideId: schema?.lineGuideId ?? project.lineGuideId,
      sourcePageNumber: instance?.sourcePageNumber ?? schema?.sourcePageNumber,
      variantId: selectedVariantId,
    }) ?? baseImageUri;
  const selectedFontId = values?.textFontFamily ?? "default";
  const hasTextFields = (schema?.fields?.length ?? 0) > 0;

  const annotations = useMemo(() => {
    if (!instanceId) return [];
    return project.getPageAnnotations(instanceId);
  }, [instanceId, project, values, project.pageValuesMap]);

  useEffect(() => {
    setReady(false);
  }, [instanceId, annotations.length, selectedFontId]);

  useEffect(() => {
    if (!imageUri) {
      setImageAspectRatio(1.414);
      return;
    }

    let cancelled = false;
    Image.getSize(
      imageUri,
      (width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        setImageAspectRatio(height / width);
      },
      () => {
        if (!cancelled) setImageAspectRatio(1.414);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  if (project.isLoading || !instance || !schema) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  const isLocked = schema.pageType === "non_editable" || status === "locked";
  const isExcluded = status === "excluded";
  const hasContent =
    status === "filled" ||
    status === "draft" ||
    status === "continue";
  const pageLabel = `Страница ${instance.order} из ${project.instances.length}`;

  const handleFill = () => {
    if (isPhotoOnlySchema(schema)) {
      router.push({
        pathname: "/album-page-photos",
        params: { id, instanceId, celebration, coverType, interiorType },
      } as unknown as Href);
      return;
    }
    router.push({
      pathname: "/album-page-form",
      params: { id, instanceId, celebration, coverType, interiorType },
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
      {!isFinalPreview ? (
        <AppText variant="bodySm" style={styles.previewHint}>
          Предпросмотр макета — так страница будет выглядеть в книге
        </AppText>
      ) : null}

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
            {imageUri ? (
              <PageRenderer
                ref={rendererRef}
                imageUri={imageUri}
                annotations={annotations}
                width={previewLayout.coordinateWidth}
                height={previewLayout.coordinateHeight}
                lineGuideId={project.lineGuideId}
                backgroundColor={colors.white}
                onReady={() => setReady(true)}
              />
            ) : null}
            {!ready && imageUri ? (
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
