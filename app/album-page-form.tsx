import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AlbumPageFillForm } from '@/components/album/album-page-fill-form';
import { AlbumPageUnifiedEditor } from '@/components/album/album-page-unified-editor';
import { BlankPageEditPreview } from '@/components/album/blank-page-edit-preview';
import { AppButton, AppHeader, AppScreen, AppText } from '@/components/ui';
import { useMediaLibraryPermission } from '@/components/media-library-permission-provider';
import { colors, spacing, surfaces } from '@/constants/design-tokens';
import { useAlbumFormLayout } from '@/hooks/use-album-editor-layout';
import { useAlbumPagePhotoEditor } from '@/hooks/use-album-page-photo-editor';
import { useAlbumProject } from '@/hooks/use-album-project';
import { navigateToAlbumPages, type AlbumFlowParams } from '@/utils/albumNavigation';
import { usesUnifiedPhotoEditor } from '@/utils/albumPageNavigation';
import { isBlankTemplateLineGuide } from '@/utils/photoPageTemplateManifest';
import { createEmptyPageValues } from '@/utils/pageStorage';
import { resolveInstancePageImageUri } from '@/utils/resolveInstancePageImage';

export default function AlbumPageFormScreen() {
  const { id, instanceId, celebration, coverType, interiorType } =
    useLocalSearchParams<{
      id?: string;
      instanceId?: string;
      celebration?: string;
      coverType?: string;
      interiorType?: string;
    }>();

  const project = useAlbumProject({
    projectId: id,
    celebration,
    coverType,
    interiorType,
  });
  const { layout, shellStyle } = useAlbumFormLayout();

  const albumFlowParams: AlbumFlowParams = {
    id,
    celebration,
    coverType,
    interiorType,
  };

  const instance = useMemo(
    () => project.instances.find((i) => i.instanceId === instanceId),
    [project.instances, instanceId],
  );
  const schema = instance ? project.getSchemaForInstance(instance) : undefined;

  const pageValues = instanceId
    ? (project.pageValuesMap[instanceId] ?? createEmptyPageValues())
    : createEmptyPageValues();

  const photoEditor = useAlbumPagePhotoEditor({
    instanceId,
    schema,
    pageValues,
    project,
  });
  const { ensureMediaLibraryPermission } = useMediaLibraryPermission();

  const handleFieldChange = useCallback(
    (fieldId: string, value: string) => {
      if (!instanceId) return;
      project.updatePageValues(instanceId, (prev) => ({
        ...prev,
        fields: { ...prev.fields, [fieldId]: value },
      }));
    },
    [instanceId, project],
  );

  const handleSave = async () => {
    if (!instanceId) return;
    const current = project.pageValuesMap[instanceId] ?? pageValues;
    await project.savePageValuesNow(instanceId, current);
    router.push({
      pathname: '/album-page-preview',
      params: {
        id,
        instanceId,
        celebration,
        coverType,
        interiorType,
        mode: 'final',
      },
    } as unknown as Href);
  };

  if (project.isLoading || !instance || !schema) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  const fields = schema.fields ?? [];
  const unifiedEditor = usesUnifiedPhotoEditor(schema);
  const isBlankTemplatePage = isBlankTemplateLineGuide(schema.lineGuideId);
  const useSplitLayout = isBlankTemplatePage && layout.isTablet && layout.isLandscape;
  const pageImageUri = resolveInstancePageImageUri(project.images, instance);
  const previewMaxWidth = useSplitLayout
    ? Math.min(460, layout.contentMaxWidth * 0.46)
    : Math.min(420, layout.contentMaxWidth);

  const editorBlock = unifiedEditor ? (
    <AlbumPageUnifiedEditor
      schema={schema}
      pageValues={pageValues}
      lineGuideId={project.lineGuideId}
      projectId={project.projectId}
      instanceId={instanceId}
      onFieldChange={handleFieldChange}
      onCaptionChange={(text) =>
        photoEditor.updatePageValues((prev) => ({ ...prev, caption: text }))
      }
      onPhotoCaptionChange={(slotIndex, text) =>
        photoEditor.updatePageValues((prev) => {
          const next = [...(prev.photoCaptions ?? [])];
          next[slotIndex] = text;
          return { ...prev, photoCaptions: next };
        })
      }
      onSelectVariant={photoEditor.handleSelectVariant}
      onPickPhoto={photoEditor.handlePickPhoto}
      onSlotTransformChange={photoEditor.handleSlotTransformChange}
      onGroupTransformChange={photoEditor.handleGroupTransformChange}
      onRemovePhoto={photoEditor.handleRemovePhoto}
      onInitPhotoBlock={photoEditor.handleInitPhotoBlock}
      onFreeElementsChange={(elements) =>
        photoEditor.updatePageValues((prev) => ({ ...prev, freeElements: elements }))
      }
      onCustomFieldsChange={(fields) =>
        photoEditor.updatePageValues((prev) => ({ ...prev, customFields: fields }))
      }
      allowCustomFieldCrud={
        Boolean(instance.addedByUser) &&
        schema.pageType === 'birthday_free_page' &&
        schema.sourcePageNumber >= 7
      }
      ensureMediaLibraryPermission={ensureMediaLibraryPermission}
      showCaption={photoEditor.showCaption}
      showPerPhotoCaptions={photoEditor.showPerPhotoCaptions}
    />
  ) : (
    <AlbumPageFillForm
      schema={schema}
      pageValues={pageValues}
      lineGuideId={project.lineGuideId}
      onFieldChange={handleFieldChange}
      onCaptionChange={(text) =>
        photoEditor.updatePageValues((prev) => ({ ...prev, caption: text }))
      }
      onPhotoCaptionChange={(slotIndex, text) =>
        photoEditor.updatePageValues((prev) => {
          const next = [...(prev.photoCaptions ?? [])];
          next[slotIndex] = text;
          return { ...prev, photoCaptions: next };
        })
      }
      onSelectVariant={photoEditor.handleSelectVariant}
      onAddPhoto={photoEditor.handlePickPhoto}
      onReplacePhoto={photoEditor.handlePickPhoto}
      onRemovePhoto={photoEditor.handleRemovePhoto}
      onMapMarkersChange={(markers) =>
        photoEditor.updatePageValues((prev) => ({ ...prev, mapMarkers: markers }))
      }
      showCaption={photoEditor.showCaption}
      showPerPhotoCaptions={photoEditor.showPerPhotoCaptions}
    />
  );

  return (
    <AppScreen
      scroll
      keyboardAware
      style={styles.screen}
      contentContainerStyle={[styles.container, shellStyle]}
    >
      <AppHeader
        title="Заполните страницу"
        onBack={() => navigateToAlbumPages(albumFlowParams)}
      />

      <AppText variant="titleSm" style={styles.pageTitle}>
        {project.getInstanceTitle(instance)}
      </AppText>

      <AppText variant="bodySm" style={styles.editHint}>
        {schema.formHint ??
          'Заполните нужные поля и добавьте фото. Можно оставить часть пустой — результат увидите на следующем шаге.'}
      </AppText>

      {isBlankTemplatePage ? (
        <View style={[styles.editorShell, useSplitLayout && styles.editorShellSplit]}>
          <View style={useSplitLayout ? styles.previewPane : undefined}>
            <BlankPageEditPreview
              schema={schema}
              pageValues={pageValues}
              imageUri={pageImageUri}
              maxWidth={previewMaxWidth}
            />
          </View>
          <View style={useSplitLayout ? styles.formPane : undefined}>{editorBlock}</View>
        </View>
      ) : (
        editorBlock
      )}

      {fields.length === 0 && !unifiedEditor ? (
        <AppText variant="bodySm" style={styles.emptyHint}>
          На этой странице нет полей для заполнения.
        </AppText>
      ) : null}

      <AppButton
        testID={unifiedEditor ? 'unified-editor-save' : 'form-save'}
        title="Просмотр страницы"
        onPress={handleSave}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: surfaces.muted,
  },
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    color: colors.textSecondary,
  },
  editHint: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  editorShell: {
    gap: spacing.md,
  },
  editorShellSplit: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  previewPane: {
    flexShrink: 0,
  },
  formPane: {
    flex: 1,
    minWidth: 0,
  },
  emptyHint: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
