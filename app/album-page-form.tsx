import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { AlbumPageFillForm } from '@/components/album/album-page-fill-form';
import { AlbumPageUnifiedEditor } from '@/components/album/album-page-unified-editor';
import { AppButton, AppHeader, AppScreen, AppText } from '@/components/ui';
import { useMediaLibraryPermission } from '@/components/media-library-permission-provider';
import { colors, spacing, surfaces } from '@/constants/design-tokens';
import { useAlbumFormLayout } from '@/hooks/use-album-editor-layout';
import { useAlbumPagePhotoEditor } from '@/hooks/use-album-page-photo-editor';
import { useAlbumProject } from '@/hooks/use-album-project';
import type { PageValues } from '@/types/album-page-schema';
import { navigateToAlbumPages, type AlbumFlowParams } from '@/utils/albumNavigation';
import { usesUnifiedPhotoEditor } from '@/utils/albumPageNavigation';
import { createEmptyPageValues } from '@/utils/pageStorage';

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
    subscribeSnapshots: false,
  });
  const { shellStyle } = useAlbumFormLayout();

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

  const [localFields, setLocalFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!instanceId || project.isLoading) return;
    setLocalFields(project.pageValuesMap[instanceId]?.fields ?? {});
  }, [instanceId, project.isLoading]);

  const storedPageValues = instanceId
    ? (project.pageValuesMap[instanceId] ?? createEmptyPageValues())
    : createEmptyPageValues();

  const pageValues = useMemo(
    () => ({
      ...storedPageValues,
      fields: localFields,
    }),
    [storedPageValues, localFields],
  );

  const photoEditor = useAlbumPagePhotoEditor({
    instanceId,
    schema,
    pageValues,
    project,
  });
  const { ensureMediaLibraryPermission } = useMediaLibraryPermission();

  const updateDraftPageValues = useCallback(
    (updater: (prev: PageValues) => PageValues) => {
      if (!instanceId) return;
      setLocalFields((prevFields) => {
        const current = {
          ...(project.pageValuesMap[instanceId] ?? createEmptyPageValues()),
          fields: prevFields,
        };
        const next = updater(current);
        project.updatePageValues(instanceId, () => next);
        return next.fields;
      });
    },
    [instanceId, project],
  );

  const handleFieldChange = useCallback(
    (fieldId: string, value: string) => {
      if (!instanceId) return;
      setLocalFields((prev) => {
        const nextFields = { ...prev, [fieldId]: value };
        project.updatePageValues(instanceId, (current) => ({
          ...current,
          fields: nextFields,
        }));
        return nextFields;
      });
    },
    [instanceId, project],
  );

  const handleSave = async () => {
    if (!instanceId) return;
    const current = { ...storedPageValues, fields: localFields };
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
        Заполните нужные поля и добавьте фото. Можно оставить часть пустой — результат увидите на следующем шаге.
      </AppText>

      {unifiedEditor ? (
        <AlbumPageUnifiedEditor
          schema={schema}
          pageValues={pageValues}
          lineGuideId={project.lineGuideId}
          onFieldChange={handleFieldChange}
          onCaptionChange={(text) =>
            updateDraftPageValues((prev) => ({ ...prev, caption: text }))
          }
          onPhotoCaptionChange={(slotIndex, text) =>
            updateDraftPageValues((prev) => {
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
            updateDraftPageValues((prev) => ({ ...prev, freeElements: elements }))
          }
          onCustomFieldsChange={(fields) =>
            updateDraftPageValues((prev) => ({ ...prev, customFields: fields }))
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
            updateDraftPageValues((prev) => ({ ...prev, caption: text }))
          }
          onPhotoCaptionChange={(slotIndex, text) =>
            updateDraftPageValues((prev) => {
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
            updateDraftPageValues((prev) => ({ ...prev, mapMarkers: markers }))
          }
          showCaption={photoEditor.showCaption}
          showPerPhotoCaptions={photoEditor.showPerPhotoCaptions}
        />
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
  emptyHint: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
