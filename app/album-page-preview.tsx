import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';

import { NonEditableBanner } from '@/components/album/non-editable-banner';
import PageRenderer, { type PageRendererRef } from '@/components/page-renderer';
import { AppButton, AppHeader, AppScreen, AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';
import { useAlbumProject } from '@/hooks/use-album-project';
import { computePageStatus } from '@/utils/pageStatus';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_HEIGHT = SCREEN_WIDTH * 1.35;

export default function AlbumPagePreviewScreen() {
  const { id, instanceId, celebration, coverType, interiorType, mode } = useLocalSearchParams<{
    id?: string;
    instanceId?: string;
    celebration?: string;
    coverType?: string;
    interiorType?: string;
    mode?: string;
  }>();

  const isFinalPreview = mode === 'final';
  const rendererRef = useRef<PageRendererRef>(null);
  const [ready, setReady] = useState(false);

  const project = useAlbumProject({
    projectId: id,
    celebration,
    coverType,
    interiorType,
  });

  const instance = useMemo(
    () => project.instances.find((i) => i.instanceId === instanceId),
    [project.instances, instanceId]
  );

  const schema = instance ? project.getSchemaForInstance(instance) : undefined;
  const values = instanceId ? project.pageValuesMap[instanceId] : undefined;
  const status = schema ? computePageStatus(schema, values) : 'empty';
  const imageUri = instance ? project.images[instance.imageIndex] : undefined;
  const annotations = instanceId ? project.getPageAnnotations(instanceId) : [];

  useEffect(() => {
    setReady(false);
  }, [instanceId, annotations.length]);

  if (project.isLoading || !instance || !schema) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  const isLocked = schema.pageType === 'non_editable' || status === 'locked';
  const hasContent = status === 'filled' || status === 'draft';
  const pageLabel = `Страница ${instance.order} из ${project.instances.length}`;

  const handleFill = () => {
    if (schema.pageType === 'photo' || (schema.photoBlocks?.length && !schema.fields?.length)) {
      router.push({
        pathname: '/album-page-photos',
        params: { id, instanceId, celebration, coverType, interiorType },
      } as unknown as Href);
      return;
    }
    router.push({
      pathname: '/album-page-form',
      params: { id, instanceId, celebration, coverType, interiorType },
    } as unknown as Href);
  };

  const handleSave = async () => {
    if (instanceId && values) {
      await project.savePageValuesNow(instanceId, values);
    }
    router.replace({
      pathname: '/album-pages',
      params: { id, celebration, coverType, interiorType },
    } as unknown as Href);
  };

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <AppHeader
        title={isFinalPreview ? 'Предпросмотр страницы' : pageLabel}
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

      <View style={styles.previewWrap}>
        {imageUri ? (
          <PageRenderer
            ref={rendererRef}
            imageUri={imageUri}
            annotations={annotations}
            width={SCREEN_WIDTH - spacing.md * 2}
            height={PREVIEW_HEIGHT}
            lineGuideId={project.lineGuideId}
            onReady={() => setReady(true)}
          />
        ) : null}
        {!ready && imageUri ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
      </View>

      {isLocked ? (
        <AppButton title="Назад к списку" variant="outline" onPress={() => router.back()} />
      ) : isFinalPreview ? (
        <View style={styles.actions}>
          <AppButton title="Сохранить страницу" onPress={handleSave} />
          <AppButton
            title="Изменить"
            variant="outline"
            onPress={handleFill}
          />
          <AppButton
            title="Далее →"
            variant="ghost"
            onPress={() => {
              const next = project.instances.find((i) => i.order === instance.order + 1);
              if (next) {
                router.replace({
                  pathname: '/album-page-preview',
                  params: {
                    id,
                    instanceId: next.instanceId,
                    celebration,
                    coverType,
                    interiorType,
                  },
                } as unknown as Href);
              } else {
                router.replace({
                  pathname: '/album-pages',
                  params: { id, celebration, coverType, interiorType },
                } as unknown as Href);
              }
            }}
          />
        </View>
      ) : (
        <View style={styles.actions}>
          <AppButton
            title={hasContent ? 'Редактировать данные' : 'Заполнить страницу'}
            onPress={handleFill}
          />
          <AppButton title="Редактировать позже" variant="outline" onPress={() => router.back()} />
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editLink: {
    color: colors.primary,
  },
  previewWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.primarySurface,
    minHeight: PREVIEW_HEIGHT,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  actions: {
    gap: spacing.sm,
  },
});
