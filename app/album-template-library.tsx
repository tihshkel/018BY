import { router, useLocalSearchParams, type Href } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader, AppScreen, AppText } from '@/components/ui';
import { TemplateWireframePreview } from '@/components/album/template-wireframe-preview';
import { colors, createShadow, radii, spacing } from '@/constants/design-tokens';
import { useAlbumProject } from '@/hooks/use-album-project';
import { navigateToAlbumPages, type AlbumFlowParams } from '@/utils/albumNavigation';
import {
  getPageFormatForLineGuide,
  listTemplatesForFormat,
} from '@/utils/photoPageTemplateManifest';

export default function AlbumTemplateLibraryScreen() {
  const { id, celebration, coverType, interiorType, afterIndex } = useLocalSearchParams<{
    id?: string;
    celebration?: string;
    coverType?: string;
    interiorType?: string;
    afterIndex?: string;
  }>();

  const project = useAlbumProject({
    projectId: id,
    celebration,
    coverType,
    interiorType,
  });

  const insertAfter = afterIndex ? Number(afterIndex) : project.instances.length - 1;
  const pageFormat = getPageFormatForLineGuide(project.lineGuideId);
  const templates = listTemplatesForFormat(pageFormat);

  const albumFlowParams: AlbumFlowParams = {
    id,
    celebration,
    coverType,
    interiorType,
  };

  const handleSelect = async (templateId: string, title: string) => {
    const sourcePageIndex = 0;
    await project.addPage({
      insertAfterIndex: insertAfter,
      sourcePageIndex,
      templateLibraryId: templateId,
      titleOverride: title,
    });
    router.replace({
      pathname: '/album-pages',
      params: { id: project.projectId, celebration, coverType, interiorType },
    } as unknown as Href);
  };

  if (project.isLoading) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <AppHeader
        title="Выберите шаблон"
        onBack={() => navigateToAlbumPages(albumFlowParams)}
      />

      <AppText variant="caption" style={styles.sectionLabel}>
        Формат {pageFormat === '21x21' ? '21×21' : '18×24'} — {templates.length} шаблонов
      </AppText>

      <View style={styles.grid}>
        {templates.map((template) => (
          <Pressable
            key={template.id}
            onPress={() => handleSelect(template.id, template.title)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.preview}>
              <TemplateWireframePreview templateId={template.id} format={pageFormat} />
              <AppText variant="caption" style={styles.previewBadge}>
                {template.maxPhotos > 0 ? `${template.maxPhotos} фото` : 'Текст'}
              </AppText>
            </View>
            <AppText variant="bodySm" numberOfLines={2} style={styles.cardTitle}>
              {template.title}
            </AppText>
            <AppText variant="caption" numberOfLines={2} style={styles.cardDescription}>
              {template.description}
            </AppText>
          </Pressable>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...createShadow('md'),
  },
  pressed: {
    opacity: 0.9,
  },
  preview: {
    height: 100,
    backgroundColor: colors.primarySurface,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
    overflow: 'hidden',
    position: 'relative',
  },
  previewBadge: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    color: colors.primary,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
  },
  cardDescription: {
    color: colors.textSecondary,
    marginTop: 2,
  },
});
