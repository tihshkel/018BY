import { colors, spacing, surfaces } from '@/constants/design-tokens';
import { HomeActionRow } from '@/components/home/home-action-row';
import { HomeSectionHeader } from '@/components/home/home-section-header';
import { ProjectActionSheet } from '@/components/modals/project-action-sheet';
import { ProjectCard } from '@/components/project-card';
import { AppButton, AppCard, AppText } from '@/components/ui';
import { deleteUserProjectLocally } from '@/utils/delete-user-project';
import {
  formatProjectsCountLabel,
  HOME_PROJECTS_PREVIEW_LIMIT,
  loadUserProjects,
  type UserProject,
} from '@/utils/userProjects';
import { getAccountSyncId } from '@/utils/account-identity';
import { ensureSyncReady, pullLatestFromCloud, setOnSyncComplete } from '@/utils/account-sync';
import { refreshAllAlbumNotifications } from '@/utils/albumNotificationCoordinator';
import { fixMissingProjectsInList, runFullVerifyReport, verifyProjectInStorage } from '@/utils/verify-project-save';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { resolveAlbumEntryPath } from '@/utils/albumIntro';
import { buildAlbumIntroHref, buildAlbumPagesHref } from '@/utils/albumNavigation';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getGridColumnCount,
  getGridItemWidth,
  getTabletContentShell,
  getGridColumnWrapperStyle,
  getGridListStyle,
  getTabletSectionWrap,
  HOME_CONTENT_MAX_WIDTH,
  useResponsiveLayout,
} from '@/utils/responsive';
import { syncWidgetSnapshot } from '@/utils/widgetSnapshot';

export default function HomeScreen() {
  const layout = useResponsiveLayout(HOME_CONTENT_MAX_WIDTH);
  const contentShellStyle = getTabletContentShell(layout);
  const sectionWrap = getTabletSectionWrap(layout, {
    phonePadding: 24,
    tabletPadding: 0,
  });
  const gridListStyle = getGridListStyle(layout);
  const gridColumnWrapper = getGridColumnWrapperStyle(spacing.md);

  const isTabletLayout = layout.isTablet;
  const projectsColumnCount = getGridColumnCount(layout);
  const phoneCardWidth = getGridItemWidth(layout, 1);
  const singleProjectCardWidth = layout.isTablet
    ? Math.min(400, layout.contentMaxWidth * 0.5)
    : undefined;

  const [userName, setUserName] = useState('');
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<UserProject | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedProjectForAction, setSelectedProjectForAction] = useState<UserProject | null>(null);
  const [actionModalStep, setActionModalStep] = useState<'menu' | 'confirmDelete'>('menu');

  const previewProjects =
    projects.length > HOME_PROJECTS_PREVIEW_LIMIT
      ? projects.slice(0, HOME_PROJECTS_PREVIEW_LIMIT)
      : projects;
  const showAllStoriesLink = projects.length > HOME_PROJECTS_PREVIEW_LIMIT;
  const opacity = useSharedValue(0);

  useEffect(() => {
    loadUserData();
    loadProjects();
    opacity.value = withTiming(1, { duration: 400 });
    setOnSyncComplete(loadProjects);
    return () => {
      setOnSyncComplete(null);
    };
  }, []);

  useEffect(() => {
    const t2 = setTimeout(loadUserData, 2000);
    const t5 = setTimeout(loadUserData, 5000);
    return () => {
      clearTimeout(t2);
      clearTimeout(t5);
    };
  }, []);

  // При фокусе обновляем имя и проекты; гарантируем строку profiles в Supabase для сохранения проектов.
  // Также подтягиваем последние данные из облака (Supabase), чтобы проекты, сохранённые на другом устройстве, появились в списке.
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
      loadProjects();
      void syncWidgetSnapshot();
      ensureSyncReady().catch(() => {});

      // Фоновая подгрузка из облака — если там появились новые проекты, обновляем список
      const pullFromCloud = async () => {
        try {
          const changed = await pullLatestFromCloud();
          if (changed) {
            loadProjects();
            loadUserData();
            void refreshAllAlbumNotifications({ skipCloudSync: true }).catch(() => {});
          } else {
            // Если pullLatestFromCloud не обнаружил изменений, но проектов локально 0 —
            // повторная попытка через 3 сек (облачная синхронизация после входа могла ещё не завершиться)
            const localRaw = await AsyncStorage.getItem('@user_projects');
            const localList: any[] = (() => { try { return localRaw ? JSON.parse(localRaw) : []; } catch { return []; } })();
            if (localList.length === 0) {
              const syncId = await getAccountSyncId();
              if (syncId) {
                setTimeout(async () => {
                  try {
                    const retryChanged = await pullLatestFromCloud();
                    if (retryChanged) {
                      loadProjects();
                      loadUserData();
                    } else {
                      loadProjects();
                    }
                  } catch {}
                }, 3000);
              }
            }
          }
        } catch {}
      };
      pullFromCloud();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem('@user_name');
      if (name) setUserName(name);
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const formattedProjects = await loadUserProjects();
      setProjects(formattedProjects);
      setSelectedProject((prev) => {
        if (prev) {
          const stillExists = formattedProjects.find((x) => x.id === prev.id);
          if (stillExists) return stillExists;
        }
        return formattedProjects[0] ?? null;
      });
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
      setSelectedProject(null);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleAllStories = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/all-stories');
  };

  const navigateToPdfAlbum = async (project: UserProject) => {
    const entry = await resolveAlbumEntryPath(project.id);
    const href =
      entry === 'album-intro'
        ? buildAlbumIntroHref({ id: project.id })
        : buildAlbumPagesHref({ id: project.id });
    router.push(href);
  };

  const handleProjectPress = (project: UserProject) => {
    if (project.isReadyMadeAlbum || project.hasPdfTemplate) {
      void navigateToPdfAlbum(project);
    } else {
      router.push(`/edit-project?id=${project.id}`);
    }
  };

  const handleMyStories = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Переходим на экран "Мои истории" (projects)
    router.push('/projects');
  };

  const handleLongPress = (project: UserProject) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedProjectForAction(project);
    setActionModalStep('menu');
    setShowActionModal(true);
  };

  const handleEditProject = () => {
    if (selectedProjectForAction) {
      setShowActionModal(false);
      if (selectedProjectForAction.isReadyMadeAlbum || selectedProjectForAction.hasPdfTemplate) {
        void navigateToPdfAlbum(selectedProjectForAction);
      } else {
        router.push(`/edit-project?id=${selectedProjectForAction.id}`);
      }
    }
  };

  const handleDeleteProject = () => {
    if (!selectedProjectForAction) return;
    setActionModalStep('confirmDelete');
  };

  const handleDeleteConfirmCancel = () => {
    setActionModalStep('menu');
  };

  const handleDeleteConfirm = async () => {
    const project = selectedProjectForAction;
    if (!project) return;

    const projectId = project.id;
    closeActionModal();
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setSelectedProject((prev) => (prev?.id === projectId ? null : prev));

    try {
      await deleteUserProjectLocally(project);
      await loadProjects();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error deleting project:', error);
      await loadProjects();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Ошибка', 'Не удалось удалить проект. Попробуйте снова.');
    }
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedProjectForAction(null);
    setActionModalStep('menu');
  };

  const handleActionModalRequestClose = () => {
    if (actionModalStep === 'confirmDelete') {
      setActionModalStep('menu');
      return;
    }
    closeActionModal();
  };

  const handleDevVerifyStorage = async () => {
    try {
      const report = await runFullVerifyReport();
      const lines = [
        `Всего проектов: ${report.totalProjects}`,
        `Валидных: ${report.validProjects}`,
      ];
      if (report.invalidProjects.length > 0) {
        lines.push(`Повреждённые: ${report.invalidProjects.join(', ')}`);
      }
      if (report.orphanedProjects.length > 0) {
        lines.push(`В списке без файла: ${report.orphanedProjects.join(', ')}`);
      }
      Alert.alert('Проверка сохранения проектов', lines.join('\n'), [{ text: 'OK' }]);
    } catch (e) {
      Alert.alert('Ошибка проверки', (e as Error).message);
    }
  };

  const handleDevVerifyCurrentProject = async () => {
    if (!selectedProject?.id) {
      Alert.alert('Нет выбранного проекта');
      return;
    }
    try {
      const isValid = await verifyProjectInStorage(selectedProject.id);
      if (isValid) {
        Alert.alert('Проверка', `Проект ${selectedProject.id} в порядке.`);
        return;
      }

      await fixMissingProjectsInList();
      await loadProjects();
      Alert.alert(
        'Проверка',
        `Проект ${selectedProject.id} не найден или повреждён. Список проектов обновлён.`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      Alert.alert('Ошибка', (e as Error).message);
    }
  };

  const displayName =
    userName && userName.trim() && userName !== 'Пользователь' ? userName.trim() : null;

  const renderProjectCard = useCallback(
    (project: UserProject, cardWidth: number, isGrid: boolean, index: number) => (
      <ProjectCard
        project={project}
        cardWidth={cardWidth}
        isGrid={isGrid}
        imagePriority={index < 3 ? 'high' : 'normal'}
        onPress={() => handleProjectPress(project)}
        onLongPress={() => handleLongPress(project)}
      />
    ),
    [handleProjectPress, handleLongPress]
  );

  const renderTabletProjectItem = useCallback(
    ({ item, index }: { item: UserProject; index: number }) =>
      renderProjectCard(item, 0, true, index),
    [renderProjectCard]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, contentShellStyle, animatedStyle]}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Pressable
            style={[styles.header, sectionWrap]}
            onLongPress={__DEV__ ? handleDevVerifyStorage : undefined}
            delayLongPress={800}
          >
            <AppText variant="stepLabel">ГЛАВНАЯ</AppText>
            <AppText variant="display" style={styles.greeting} testID="home-greeting">
              {displayName ? `Привет, ${displayName}` : 'Привет!'}
            </AppText>
            {projects.length > 0 ? (
              <AppText variant="bodySm" style={styles.headerSubtitle}>
                {formatProjectsCountLabel(projects.length)} в вашей коллекции
              </AppText>
            ) : (
              <AppText variant="bodySm" style={styles.headerSubtitle}>
                Создавайте альбомы и сохраняйте важные моменты
              </AppText>
            )}
          </Pressable>

          {projects.length === 0 ? (
            <View style={[styles.section, sectionWrap]}>
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="book-outline" size={40} color={colors.primary} />
                </View>
                <AppText variant="titleSm" style={styles.emptyTitle}>
                  Пока нет альбомов
                </AppText>
                <AppText variant="bodySm" style={styles.emptyText}>
                  Создайте первый альбом, чтобы начать сохранять воспоминания
                </AppText>
                <AppButton
                  testID="home-go-projects"
                  title="Мои истории"
                  onPress={handleMyStories}
                  style={styles.emptyButton}
                />
              </View>
            </View>
          ) : projects.length === 1 && selectedProject ? (
            <View style={[styles.section, sectionWrap]}>
              <HomeSectionHeader title="Ваш альбом" />
              <ProjectCard
                project={selectedProject}
                cardWidth={singleProjectCardWidth ?? 0}
                isGrid={false}
                imagePriority="high"
                onPress={() => handleProjectPress(selectedProject)}
                onLongPress={() => handleLongPress(selectedProject)}
                style={[
                  styles.singleProjectCard,
                  singleProjectCardWidth != null && styles.singleProjectCardCentered,
                ]}
              />
            </View>
          ) : (
            <View style={[styles.section, sectionWrap]}>
              <HomeSectionHeader
                title="Альбомы"
                actionLabel={showAllStoriesLink ? 'Все' : undefined}
                onActionPress={showAllStoriesLink ? handleAllStories : undefined}
              />
              {isTabletLayout ? (
                <FlatList
                  key={`home-projects-cols-${projectsColumnCount}`}
                  data={previewProjects}
                  keyExtractor={(item) => item.id}
                  renderItem={renderTabletProjectItem}
                  numColumns={projectsColumnCount}
                  scrollEnabled={false}
                  style={gridListStyle}
                  columnWrapperStyle={projectsColumnCount > 1 ? gridColumnWrapper : undefined}
                  contentContainerStyle={styles.projectsGridList}
                />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.projectsScroll}
                  snapToInterval={phoneCardWidth + spacing.md}
                  decelerationRate="fast"
                >
                  {previewProjects.map((project, index) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      cardWidth={phoneCardWidth}
                      isGrid={false}
                      imagePriority={index < 3 ? 'high' : 'normal'}
                      onPress={() => handleProjectPress(project)}
                      onLongPress={() => handleLongPress(project)}
                      style={index === previewProjects.length - 1 ? styles.lastCarouselCard : undefined}
                    />
                  ))}
                </ScrollView>
              )}
              {showAllStoriesLink ? (
                <Pressable style={styles.allStoriesMeta} onPress={handleAllStories}>
                  <AppText variant="bodySm">
                    Показаны последние {HOME_PROJECTS_PREVIEW_LIMIT} из {projects.length}
                  </AppText>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>
          )}

          <View style={[styles.section, sectionWrap]}>
            <HomeSectionHeader title="Быстрые действия" />
            <AppCard style={styles.actionsCard}>
              <HomeActionRow
                icon="book-outline"
                title="Мои истории"
                subtitle="Создавать альбомы и дневники"
                onPress={handleMyStories}
                accent
              />
              <HomeActionRow
                icon="notifications-outline"
                title="Помощник заполнения"
                subtitle="Напоминания для бумажных альбомов"
                onPress={() => router.push('/paper-album-notifications')}
              />
              <HomeActionRow
                icon="gift-outline"
                title="Каталог товаров"
                subtitle="Бумажные версии альбомов"
                onPress={() => router.push('/paper-catalog')}
                showDivider={false}
              />
            </AppCard>
          </View>

          {projects.length === 0 ? (
            <Pressable
              style={[styles.catalogLink, sectionWrap]}
              onPress={() => router.push('/paper-catalog')}
            >
              <AppText variant="bodySm" style={styles.catalogLinkText}>
                Купить бумажную версию
              </AppText>
            </Pressable>
          ) : null}
        </ScrollView>
      </Animated.View>

      <ProjectActionSheet
        visible={showActionModal}
        projectTitle={selectedProjectForAction?.title ?? 'Проект'}
        step={actionModalStep}
        onRequestClose={handleActionModalRequestClose}
        onEdit={handleEditProject}
        onDelete={handleDeleteProject}
        onDeleteConfirm={handleDeleteConfirm}
        onDeleteConfirmCancel={handleDeleteConfirmCancel}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.muted,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 112,
  },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: 6,
  },
  greeting: {
    marginTop: 4,
  },
  headerSubtitle: {
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  emptyButton: {
    minWidth: 220,
  },
  singleProjectCard: {
    marginRight: 0,
  },
  singleProjectCardCentered: {
    alignSelf: 'center',
  },
  projectsScroll: {
    paddingVertical: 4,
  },
  projectsGridList: {
    paddingVertical: 4,
  },
  lastCarouselCard: {
    marginRight: 0,
  },
  allStoriesMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: 4,
  },
  actionsCard: {
    backgroundColor: colors.white,
  },
  catalogLink: {
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  catalogLinkText: {
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
