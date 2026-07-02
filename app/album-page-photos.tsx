import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AlbumPageUnifiedEditor } from '@/components/album/album-page-unified-editor';
import { AppButton, AppHeader, AppScreen, AppText } from '@/components/ui';
import { colors, spacing, surfaces } from '@/constants/design-tokens';
import { useAlbumFormLayout } from '@/hooks/use-album-editor-layout';
import { useAlbumPagePhotoEditor } from '@/hooks/use-album-page-photo-editor';
import { useAlbumProject } from '@/hooks/use-album-project';
import { navigateToAlbumPages, type AlbumFlowParams } from '@/utils/albumNavigation';
import { hasFormTextInput } from '@/utils/albumPageNavigation';
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

  useEffect(() => {
    if (!schema || !instanceId || !id) return;
    if (!hasFormTextInput(schema)) return;
    router.replace({
      pathname: '/album-page-form',
      params: { id, instanceId, celebration, coverType, interiorType },
    } as unknown as Href);
  }, [schema, instanceId, id, celebration, coverType, interiorType]);

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
      <AppScreen style={[styles.centered, styles.screen]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scroll
      keyboardAware
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
        onCustomFieldsChange={(fields) =>
          photoEditor.updatePageValues((prev) => ({ ...prev, customFields: fields }))
        }
        showCaption={photoEditor.showCaption}
        showPerPhotoCaptions={photoEditor.showPerPhotoCaptions}
      />

      <View style={styles.footer}>
        <AppButton testID="unified-editor-save" title="Просмотр страницы" onPress={handleSave} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
});
