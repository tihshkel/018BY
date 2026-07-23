import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  AlbumPageFormEditor,
  type AlbumPageFormEditorHandle,
} from '@/components/album/album-page-form-editor';
import { AppButton, AppHeader, AppScreen } from '@/components/ui';
import { colors, surfaces, spacing } from '@/constants/design-tokens';
import { AlbumProjectActionsProvider } from '@/hooks/album-project-actions-context';
import { useAlbumFormLayout } from '@/hooks/use-album-editor-layout';
import { useAlbumProject } from '@/hooks/use-album-project';
import { useDevRenderCount } from '@/hooks/use-dev-render-count';
import { useStableAlbumProjectActions } from '@/hooks/use-stable-album-project-actions';
import { navigateToAlbumPages, type AlbumFlowParams } from '@/utils/albumNavigation';
import { usesUnifiedPhotoEditor } from '@/utils/albumPageNavigation';
import { openFinalPagePreview } from '@/utils/openFinalPagePreview';
import { isBlankTemplateLineGuide } from '@/utils/photoPageTemplateManifest';
import { createEmptyPageValues } from '@/utils/pageStorage';
import { FORM_MODAL_MAX_WIDTH } from '@/utils/responsive';

export default function AlbumPageFormScreen() {
  useDevRenderCount('AlbumPageFormScreen');

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
  const editorRef = useRef<AlbumPageFormEditorHandle>(null);

  const albumFlowParams: AlbumFlowParams = {
    id,
    celebration,
    coverType,
    interiorType,
  };

  const instance = instanceId
    ? project.instances.find((i) => i.instanceId === instanceId)
    : undefined;
  const schema = instance ? project.getSchemaForInstance(instance) : undefined;

  const pageValues = instanceId
    ? (project.pageValuesMap[instanceId] ?? createEmptyPageValues())
    : createEmptyPageValues();

  const projectActions = useStableAlbumProjectActions(project);
  const isBlankTemplatePage =
    Boolean(schema?.templateLibraryId) &&
    isBlankTemplateLineGuide(schema?.lineGuideId ?? project.lineGuideId);
  const { layout, shellStyle } = useAlbumFormLayout({
    preferWideTabletLandscape: isBlankTemplatePage,
  });
  const unifiedEditor = schema ? usesUnifiedPhotoEditor(schema) : false;

  const [isNavigating, setIsNavigating] = useState(false);

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
        prepare: () => editorRef.current?.flushDrafts(),
        getValues: () =>
          editorRef.current?.getEditorPageValues() ?? { ...pageValues },
        save: (values) =>
          projectActions.saveNow(instanceId, values, { awaitPersist: false }),
      });
    } finally {
      // Экран уходит в preview; сброс на случай отмены/ошибки push.
      setIsNavigating(false);
    }
  };

  if (project.isLoading || !instance || !schema || !instanceId) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  return (
    <AlbumProjectActionsProvider actions={projectActions}>
      <View style={styles.root}>
        <AppScreen
          scroll
          keyboardAware
          keyboardFooterOffset={128}
          tabletShell
          contentMaxWidth={layout.contentMaxWidth ?? FORM_MODAL_MAX_WIDTH}
          style={styles.screen}
          contentContainerStyle={[styles.container, shellStyle]}
        >
          <AppHeader
            title="Заполните страницу"
            onBack={() => navigateToAlbumPages(albumFlowParams)}
          />

          <AlbumPageFormEditor
            ref={editorRef}
            instance={instance}
            schema={schema}
            pageValues={pageValues}
            instanceId={instanceId}
            lineGuideId={project.lineGuideId}
            projectId={project.projectId}
            projectActions={projectActions}
            layout={layout}
            getInstanceTitle={project.getInstanceTitle}
          />

          <AppButton
            testID={unifiedEditor ? 'unified-editor-save' : 'form-save'}
            title="Просмотр страницы"
            loadingTitle="Открываем…"
            onPress={handleSave}
            disabled={isNavigating || project.isSaving}
            loading={isNavigating || project.isSaving}
          />
        </AppScreen>

        {isNavigating ? (
          <View style={styles.navOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}
      </View>
    </AlbumProjectActionsProvider>
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
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
});
