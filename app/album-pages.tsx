import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageListItem } from '@/components/album/page-list-item';
import { AppHeader, AppScreen, AppText } from '@/components/ui';
import { colors, createShadow, radii, sansFont, spacing } from '@/constants/design-tokens';
import { useAlbumProject } from '@/hooks/use-album-project';
import type { PageStatus } from '@/types/album-page-schema';
import { computePageStatus } from '@/utils/pageStatus';

type FilterTab = 'all' | 'filled' | 'draft';

export default function AlbumPagesScreen() {
  const { id, celebration, coverType, interiorType, eventDate } = useLocalSearchParams<{
    id?: string;
    celebration?: string;
    coverType?: string;
    interiorType?: string;
    eventDate?: string;
  }>();

  const [filter, setFilter] = useState<FilterTab>('all');
  const insets = useSafeAreaInsets();

  const project = useAlbumProject({
    projectId: id,
    celebration,
    coverType,
    interiorType,
    eventDate,
  });

  useFocusEffect(
    useCallback(() => {
      if (project.projectId && !project.isLoading) {
        void project.reloadProjectData();
      }
    }, [project.projectId, project.isLoading, project.reloadProjectData])
  );

  const filteredInstances = useMemo(() => {
    return project.instances.filter((instance) => {
      const schema = project.getSchemaForInstance(instance);
      const values = project.pageValuesMap[instance.instanceId];
      const status: PageStatus = schema
        ? computePageStatus(schema, values)
        : values?.status ?? 'empty';

      if (filter === 'all') return true;
      if (filter === 'filled') return status === 'filled';
      if (filter === 'draft') return status === 'draft';
      return true;
    });
  }, [project.instances, project.pageValuesMap, filter, project]);

  const emptyState = useMemo(() => {
    if (filteredInstances.length > 0) return null;

    switch (filter) {
      case 'filled':
        return {
          title: 'Пока нет заполненных страниц',
          subtitle: 'Когда все поля будут заполнены, страница появится в этом списке',
        };
      case 'draft':
        return {
          title: 'Черновиков пока нет',
          subtitle: 'Начните заполнять страницу — прогресс сохранится автоматически',
        };
      default:
        return {
          title: 'Страниц пока нет',
          subtitle: 'Добавьте первую страницу кнопкой внизу экрана',
        };
    }
  }, [filteredInstances.length, filter]);

  const openPage = (instanceId: string) => {
    router.push({
      pathname: '/album-page-preview',
      params: {
        id: project.projectId,
        instanceId,
        celebration,
        coverType,
        interiorType,
      },
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
    <AppScreen edges={['top']} style={styles.screen}>
      <AppHeader
        showBack
        right={
          project.projectId ? (
            <Pressable
              style={({ pressed }) => [styles.getBookButton, pressed && styles.getBookButtonPressed]}
              onPress={() =>
                router.push({
                  pathname: '/export-pdf',
                  params: { id: project.projectId },
                })
              }
              hitSlop={4}
            >
              <Ionicons name="book-outline" size={16} color={colors.white} />
              <AppText variant="caption" style={styles.getBookButtonText}>
                Получить книгу
              </AppText>
            </Pressable>
          ) : null
        }
      />

      <View style={styles.tabs}>
        {(
          [
            ['all', 'Все страницы'],
            ['filled', 'Заполненные'],
            ['draft', 'Черновики'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.tab, filter === key && styles.tabActive]}
          >
            <AppText
              variant="caption"
              style={[styles.tabText, filter === key && styles.tabTextActive]}
            >
              {label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={[
          styles.listContent,
          emptyState && styles.listContentEmpty,
          { paddingBottom: spacing.lg + insets.bottom + 72 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {emptyState ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={
                filter === 'filled'
                  ? 'checkmark-circle-outline'
                  : filter === 'draft'
                    ? 'create-outline'
                    : 'document-text-outline'
              }
              size={40}
              color={colors.border}
            />
            <AppText variant="bodySm" style={styles.emptyStateTitle}>
              {emptyState.title}
            </AppText>
            <AppText variant="caption" style={styles.emptyStateSubtitle}>
              {emptyState.subtitle}
            </AppText>
          </View>
        ) : (
          filteredInstances.map((instance) => {
            const schema = project.getSchemaForInstance(instance);
            const values = project.pageValuesMap[instance.instanceId];
            const status = schema ? computePageStatus(schema, values) : 'empty';
            return (
              <PageListItem
                key={instance.instanceId}
                title={project.getInstanceTitle(instance)}
                status={status}
                thumbnailUri={project.images[instance.imageIndex]}
                onPress={() => openPage(instance.instanceId)}
              />
            );
          })
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={() =>
            router.push({
              pathname: '/album-add-page',
              params: {
                id: project.projectId,
                celebration,
                coverType,
                interiorType,
              },
            } as unknown as Href)
          }
        >
          <Ionicons name="add" size={24} color={colors.white} />
          <AppText variant="button" style={styles.addButtonText}>
            Добавить страницу
          </AppText>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  getBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...createShadow('sm'),
  },
  getBookButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  getBookButtonText: {
    color: colors.white,
    fontFamily: sansFont('semibold'),
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.primarySurface,
  },
  tabText: {
    color: colors.textSecondary,
    fontFamily: sansFont('regular'),
    fontSize: 14,
  },
  tabTextActive: {
    color: colors.primary,
    fontFamily: sansFont('semibold'),
    fontWeight: '600',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyStateTitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: sansFont('medium'),
    fontWeight: '500',
  },
  emptyStateSubtitle: {
    color: colors.placeholder,
    textAlign: 'center',
    maxWidth: 280,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 16,
    minHeight: 56,
    ...createShadow('sm'),
  },
  addButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  addButtonText: {
    color: colors.white,
  },
});
