import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader, AppScreen, AppText } from '@/components/ui';
import { TemplateWireframePreview } from '@/components/album/template-wireframe-preview';
import { colors, radii, spacing, surfaces } from '@/constants/design-tokens';
import { useAlbumPageListLayout } from '@/hooks/use-album-editor-layout';
import { useAlbumProject } from '@/hooks/use-album-project';
import { navigateToAlbumPages, type AlbumFlowParams } from '@/utils/albumNavigation';
import {
  getPageFormatForLineGuide,
  listTemplatesForFormat,
} from '@/utils/photoPageTemplateManifest';
import { getGridColumnCount, PICKER_CONTENT_MAX_WIDTH } from '@/utils/responsive';

const GRID_GAP = spacing.sm;
const HORIZONTAL_PAD = spacing.md;

function getTemplateBadge(template: {
  maxPhotos: number;
  layout: { pageType?: string };
}): string {
  if (template.layout.pageType === 'timeline_page') {
    return `${template.maxPhotos} фото · текст`;
  }
  if (template.maxPhotos > 0) {
    return `${template.maxPhotos} фото`;
  }
  return 'Текст';
}

export default function AlbumTemplateLibraryScreen() {
  const { id, celebration, coverType, interiorType, afterIndex, instanceId, mode } = useLocalSearchParams<{
    id?: string;
    celebration?: string;
    coverType?: string;
    interiorType?: string;
    afterIndex?: string;
    instanceId?: string;
    mode?: string;
  }>();

  const project = useAlbumProject({
    projectId: id,
    celebration,
    coverType,
    interiorType,
  });

  const { layout } = useAlbumPageListLayout();
  const columnCount = useMemo(
    () =>
      layout.isTablet
        ? getGridColumnCount(layout, { tabletColumns: 3, wideColumns: 4 })
        : 2,
    [layout],
  );
  const gridInnerWidth = useMemo(() => {
    if (layout.isTablet) {
      return layout.contentMaxWidth;
    }
    return layout.width - HORIZONTAL_PAD * 2;
  }, [layout.contentMaxWidth, layout.isTablet, layout.width]);
  const cardWidth = useMemo(
    () => (gridInnerWidth - GRID_GAP * (columnCount - 1)) / columnCount,
    [columnCount, gridInnerWidth],
  );
  const previewHeight = layout.isTablet ? 128 : 112;

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
    if (mode === 'replace' && instanceId) {
      Alert.alert(
        'Сменить шаблон?',
        'Фото и текст на этой странице будут сброшены, чтобы новый макет не потерял данные неожиданно.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Сменить',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                const changed = await project.changePageTemplate(instanceId, templateId, title);
                if (!changed) return;
                router.replace({
                  pathname: '/album-page-form',
                  params: {
                    id: project.projectId,
                    instanceId,
                    celebration,
                    coverType,
                    interiorType,
                  },
                } as unknown as Href);
              })();
            },
          },
        ],
      );
      return;
    }

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
    <AppScreen
      scroll
      tabletShell
      contentMaxWidth={PICKER_CONTENT_MAX_WIDTH}
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      <AppHeader
        title={mode === 'replace' ? 'Сменить шаблон' : 'Выберите шаблон'}
        onBack={() => navigateToAlbumPages(albumFlowParams)}
      />

      <View style={styles.intro}>
        <AppText variant="bodySm" style={styles.introText}>
          Формат {pageFormat === '21x21' ? '21×21' : '18×24'}
        </AppText>
        <View style={styles.countPill}>
          <AppText variant="caption" style={styles.countPillText}>
            {templates.length} шаблонов
          </AppText>
        </View>
      </View>

      <View style={[styles.grid, { width: gridInnerWidth, gap: GRID_GAP }]}>
        {templates.map((template) => (
          <Pressable
            key={template.id}
            onPress={() => handleSelect(template.id, template.title)}
            style={({ pressed }) => [
              styles.card,
              { width: cardWidth },
              pressed && styles.cardPressed,
            ]}
          >
            <View style={[styles.preview, { height: previewHeight }]}>
              <TemplateWireframePreview templateId={template.id} format={pageFormat} />
              <View style={styles.previewBadge}>
                <AppText variant="caption" style={styles.previewBadgeText}>
                  {getTemplateBadge(template)}
                </AppText>
              </View>
            </View>
            <View style={styles.cardBody}>
              <AppText variant="bodySm" numberOfLines={2} style={styles.cardTitle}>
                {template.title}
              </AppText>
              <AppText variant="caption" numberOfLines={2} style={styles.cardDescription}>
                {template.description}
              </AppText>
            </View>
          </Pressable>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: surfaces.muted,
  },
  container: {
    alignItems: 'stretch',
    gap: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: HORIZONTAL_PAD,
    width: '100%',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
    width: '100%',
  },
  introText: {
    color: colors.textSecondary,
  },
  countPill: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  countPillText: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  grid: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardPressed: {
    borderColor: '#CFCFCF',
    opacity: 0.96,
  },
  preview: {
    backgroundColor: surfaces.muted,
    overflow: 'hidden',
    position: 'relative',
  },
  previewBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: colors.border,
    borderRadius: radii.xs,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: spacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: 'absolute',
    right: spacing.xs,
  },
  previewBadgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
  },
  cardBody: {
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  cardDescription: {
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
