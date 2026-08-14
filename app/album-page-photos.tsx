import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AlbumPageUnifiedEditor } from '@/components/album/album-page-unified-editor';
import { AppButton, AppHeader, AppScreen, AppText } from '@/components/ui';
import { colors, spacing, surfaces } from '@/constants/design-tokens';
import { useAlbumFormLayout } from '@/hooks/use-album-editor-layout';
import { useAlbumPagePhotoEditor } from '@/hooks/use-album-page-photo-editor';
import { useAlbumProject } from '@/hooks/use-album-project';
import { navigateToAlbumPages, type AlbumFlowParams } from '@/utils/albumNavigation';
import { releaseAndroidImageMemory } from '@/utils/androidSessionRelief';
import { openFinalPagePreview } from '@/utils/openFinalPagePreview';
import { createEmptyPageValues } from '@/utils/pageStorage';

export default function AlbumPagePhotosScreen() {
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
    activeInstanceId: instanceId,
  });
  const { shellStyle } = useAlbumFormLayout();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    return () => {
      releaseAndroidImageMemory(60);
    };
  }, []);

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
    projectId: project.projectId,
    commitPagePatch: project.updatePageValues,
  });

  const handleSave = async () => {
    if (!instanceId || isNavigating) return;
    setIsNavigating(true);
    try {
      await openFinalPagePreview({
        params: {
          id,
          instanceId,
          celebration,
          coverType,
          interiorType,
        },
        getValues: () => project.pageValuesMap[instanceId] ?? pageValues,
        save: (values) =>
          project.savePageValuesNow(instanceId, values, { awaitPersist: false }),
      });
    } finally {
      setIsNavigating(false);
    }
  };

  if (project.isLoading || !instance || !schema) {
    return (
      <AppScreen style={[styles.centered, styles.screen]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  return (
    <View style={styles.root}>
      <AppScreen
        scroll
        keyboardAware
        keyboardFooterOffset={120}
        style={styles.screen}
        contentContainerStyle={[styles.container, shellStyle]}
      >
        <AppHeader
          title="Добавьте фото"
          onBack={() => navigateToAlbumPages(albumFlowParams)}
        />

        <View style={styles.intro}>
          <AppText variant="stepLabel">СТРАНИЦА АЛЬБОМА</AppText>
          <AppText variant="bodySm" style={styles.pageTitle}>
            {project.getInstanceTitle(instance)}
          </AppText>
        </View>

        <AlbumPageUnifiedEditor
          schema={schema}
          pageValues={pageValues}
          lineGuideId={project.lineGuideId}
          onFieldChange={() => {}}
          onCaptionChange={(text) =>
            photoEditor.updatePageValues((prev) => ({
              ...prev,
              caption:
                photoEditor.captionMaxLength != null
                  ? text.slice(0, photoEditor.captionMaxLength)
                  : text,
            }))
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
          onCustomFieldsChange={(fields) =>
            photoEditor.updatePageValues((prev) => ({ ...prev, customFields: fields }))
          }
          showCaption={photoEditor.showCaption}
          showPerPhotoCaptions={photoEditor.showPerPhotoCaptions}
        />

        <View style={styles.footer}>
          <AppButton
            testID="unified-editor-save"
            title="Просмотр страницы"
            loadingTitle="Открываем…"
            onPress={handleSave}
            disabled={isNavigating || project.isSaving}
            loading={isNavigating || project.isSaving}
          />
        </View>
      </AppScreen>

      {isNavigating ? (
        <View style={styles.navOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screen: {
    backgroundColor: surfaces.muted,
  },
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: {
    gap: 6,
    paddingTop: spacing.xs,
  },
  pageTitle: {
    color: colors.textSecondary,
  },
  footer: {
    paddingTop: spacing.sm,
  },
  navOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
});
