import { ProjectCard } from '@/components/project-card';
import { getProjectCoverImageSource } from '@/utils/projectCoverImage';
import {
  formatProjectsCountLabel,
  HOME_PROJECTS_PREVIEW_LIMIT,
  loadUserProjects,
  type UserProject,
} from '@/utils/userProjects';
import { getAccountSyncId } from '@/utils/account-identity';
import { ensureSyncReady, pullLatestFromCloud, pushAccountDataToCloud, scheduleSyncToCloud, setOnSyncComplete } from '@/utils/account-sync';
import { removeRemindersAndScheduledNotificationsForProject } from '@/utils/project-reminders-cleanup';
import { deleteProjectInSupabase, isSupabaseConfigured } from '@/utils/supabase-account';
import { fixMissingProjectsInList, runFullVerifyReport, verifyProjectInStorage } from '@/utils/verify-project-save';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
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

export default function HomeScreen() {
  const layout = useResponsiveLayout(HOME_CONTENT_MAX_WIDTH);
  const contentShellStyle = getTabletContentShell(layout);
  const sectionWrap = getTabletSectionWrap(layout, {
    phonePadding: 24,
    tabletPadding: 0,
  });
  const gridListStyle = getGridListStyle(layout);
  const gridColumnWrapper = getGridColumnWrapperStyle(16);

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
      ensureSyncReady().catch(() => {});

      // Фоновая подгрузка из облака — если там появились новые проекты, обновляем список
      const pullFromCloud = async () => {
        try {
          const changed = await pullLatestFromCloud();
          if (changed) {
            loadProjects();
            loadUserData();
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

  const handleProjectPress = (project: UserProject) => {
    // Если это готовый альбом с PDF, переходим к edit-album
    // Иначе переходим к обычному edit-project
    if (project.isReadyMadeAlbum || project.hasPdfTemplate) {
      router.push(`/edit-album?id=${project.id}`);
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
    setShowActionModal(true);
  };

  const handleEditProject = () => {
    if (selectedProjectForAction) {
      setShowActionModal(false);
      // Если это готовый альбом с PDF, переходим к edit-album
      // Иначе переходим к обычному edit-project
      if (selectedProjectForAction.isReadyMadeAlbum || selectedProjectForAction.hasPdfTemplate) {
        router.push(`/edit-album?id=${selectedProjectForAction.id}`);
      } else {
        router.push(`/edit-project?id=${selectedProjectForAction.id}`);
      }
    }
  };

  const handleDeleteProject = () => {
    const project = selectedProjectForAction;
    if (!project) return;
    const projectId = String(project.id);
    const title = project.title;
    Alert.alert(
      'Удалить проект',
      `Вы уверены, что хотите удалить проект "${title}"? Это действие нельзя отменить.`,
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => setTimeout(() => confirmDeleteProject(project), 0),
        },
      ]
    );
  };

  const confirmDeleteProject = async (projectArg?: UserProject | null) => {
    const project = projectArg ?? selectedProjectForAction;
    if (!project) return;

    const projectId = String(project.id);
    try {
      await removeRemindersAndScheduledNotificationsForProject(projectId, {
        category: project.category,
        reminderDate: project.reminderDate ?? null,
      });

      // Удаляем все данные проекта из AsyncStorage (метаданные, изображения, аннотации и т.д.)
      const projectKeys = [
        `@project_${projectId}`,
        `@project_images_${projectId}`,
        `@project_annotations_${projectId}`,
        `@project_cover_annotations_${projectId}`,
        `@project_viewport_${projectId}`,
        `@project_cover_viewport_${projectId}`,
        `@project_pdf_${projectId}`,
        `@project_last_text_style_${projectId}`,
      ];
      await AsyncStorage.multiRemove(projectKeys);

      // Удаляем проект из списка @user_projects (сравниваем id как строки)
      const existingProjects = await AsyncStorage.getItem('@user_projects');
      if (existingProjects) {
        const projectsList = JSON.parse(existingProjects);
        const updatedProjects = projectsList.filter(
          (p: any) => String(p.id) !== projectId
        );
        const updatedJson = JSON.stringify(updatedProjects);
        await AsyncStorage.setItem('@user_projects', updatedJson);

        // Удаляем проект в Supabase + обновляем облачный @user_projects,
        // иначе pullLatestFromCloud подтянет проект обратно.
        try {
          const syncId = await getAccountSyncId();
          if (syncId && isSupabaseConfigured()) {
            const delRes = await deleteProjectInSupabase({
              accessCode: syncId,
              projectId,
              updatedUserProjectsJson: updatedJson,
            });
            if (!delRes.success) {
              console.warn('[Supabase] deleteProjectInSupabase failed:', delRes.error);
            }
          }
        } catch (e) {
          console.warn('[Supabase] deleteProjectInSupabase exception:', e);
        }

        // Пушим core; напоминания без merge с облаком — иначе mergeReminders вернёт удалённые записи в БД.
        await pushAccountDataToCloud({ remindersAuthoritativeLocal: true });
        scheduleSyncToCloud();
      }

      // Всегда обновляем UI и закрываем модалку
      await loadProjects();
      setShowActionModal(false);
      setSelectedProjectForAction(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error deleting project:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedProjectForAction(null);
  };

  const handleDevVerifyStorage = async () => {
    try {
      const report = await runFullVerifyReport();
      Alert.alert('Проверка сохранения проектов', report, [{ text: 'OK' }]);
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
      const res = await verifyProjectInStorage(selectedProject.id);
      if (res.ok) {
        Alert.alert('Проверка', `Проект ${selectedProject.id} в порядке.`);
      } else {
        const fix = await fixMissingProjectsInList();
        Alert.alert(
          'Проверка',
          `Ошибки: ${res.errors?.join('\n') ?? ''}\n\nИсправление: ${fix.fixed ? `добавлено ${fix.added}` : fix.reason ?? '—'}`,
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      Alert.alert('Ошибка', (e as Error).message);
    }
  };

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
          {/* Приветствие: показываем имя только если оно задано и не дефолтное «Пользователь». В __DEV__ долгое нажатие — проверка сохранения проектов. */}
          <Pressable
            style={[styles.header, sectionWrap]}
            onLongPress={__DEV__ ? handleDevVerifyStorage : undefined}
            delayLongPress={800}
          >
            <Text
              style={[
                styles.greeting,
                layout.isTablet && styles.greetingTablet,
              ]}
            >
              Привет{(userName && userName.trim() && userName !== 'Пользователь') ? `, ${userName.trim()}` : ''}!
            </Text>
          </Pressable>

          {/* Основной проект или список проектов */}
          {projects.length === 0 ? (
            <View style={[styles.emptyState, sectionWrap]}>
              <Ionicons name="book-outline" size={64} color="#D4C4B5" />
              <Text style={styles.emptyStateTitle}>У вас пока нет альбомов</Text>
              <Text style={styles.emptyStateText}>
                Создайте первый альбом, чтобы начать сохранять воспоминания
              </Text>
              <TouchableOpacity
                style={styles.newProjectButton}
                onPress={handleMyStories}
                activeOpacity={0.7}
              >
                <Ionicons name="book-outline" size={24} color="#FFFFFF" />
                <Text style={styles.newProjectButtonText}>Мои истории</Text>
              </TouchableOpacity>
              <Text style={styles.buyPaperVersionText}>Купить бумажную версию</Text>
            </View>
          ) : projects.length === 1 ? (
            <View style={[styles.singleProject, sectionWrap]}>
              <Pressable
                style={({ pressed }) => [
                  styles.projectCover,
                  singleProjectCardWidth != null && {
                    width: singleProjectCardWidth,
                    alignSelf: 'center',
                  },
                  pressed && styles.projectCardPressed,
                ]}
                onPress={() => selectedProject && handleProjectPress(selectedProject)}
                onLongPress={() => selectedProject && handleLongPress(selectedProject)}
              >
                <View style={styles.projectImagePlaceholder}>
                  {selectedProject && (
                    getProjectCoverImageSource(selectedProject) ? (
                      <Image
                        source={getProjectCoverImageSource(selectedProject)}
                        style={styles.projectImage}
                        contentFit="cover"
                        priority="high"
                        cachePolicy="disk"
                        transition={0}
                        fadeDuration={0}
                        recyclingKey={selectedProject.id}
                      />
                    ) : (
                      <Ionicons name="book" size={48} color="#C9A89A" />
                    )
                  )}
                </View>
                <Text style={styles.projectTitle}>{selectedProject?.title}</Text>
                {selectedProject?.category !== 'diary' && (
                  <Text style={styles.projectCategory}>{selectedProject?.category}</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={sectionWrap}>
              {isTabletLayout ? (
                <FlatList
                  key={`home-projects-cols-${projectsColumnCount}`}
                  data={previewProjects}
                  keyExtractor={(item) => item.id}
                  renderItem={renderTabletProjectItem}
                  numColumns={projectsColumnCount}
                  scrollEnabled={false}
                  style={gridListStyle}
                  columnWrapperStyle={
                    projectsColumnCount > 1 ? gridColumnWrapper : undefined
                  }
                  contentContainerStyle={styles.projectsGridList}
                />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.projectsScroll}
                  snapToInterval={phoneCardWidth + 16}
                  decelerationRate="fast"
                >
                  {previewProjects.map((project, index) => (
                    <React.Fragment key={project.id}>
                      {renderProjectCard(project, phoneCardWidth, false, index)}
                    </React.Fragment>
                  ))}
                </ScrollView>
              )}
              {showAllStoriesLink && (
                <TouchableOpacity
                  style={styles.allStoriesLink}
                  onPress={handleAllStories}
                  activeOpacity={0.7}
                >
                  <Text style={styles.allStoriesLinkText}>Все истории</Text>
                  <Text style={styles.allStoriesLinkCount}>
                    {formatProjectsCountLabel(projects.length)}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#C9A89A" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Кнопка "Мои истории" */}
          {projects.length > 0 && (
            <View style={[styles.createMoreContainer, sectionWrap]}>
              <TouchableOpacity
                style={styles.createMoreButton}
                onPress={handleMyStories}
                activeOpacity={0.8}
              >
                <View style={styles.createMoreIconWrapper}>
                  <Ionicons name="book-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.createMoreContent}>
                  <Text style={styles.createMoreTitle}>Мои истории</Text>
                  <Text style={styles.createMoreText}>
                    Создавайте альбомы и дневники для важных моментов жизни
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C9A89A" />
              </TouchableOpacity>
            </View>
          )}

          {/* Кнопка помощника заполнения с напоминаниями */}
          <View style={[styles.catalogContainer, sectionWrap]}>
            <TouchableOpacity
              style={styles.paperAlbumButton}
              onPress={() => router.push('/paper-album-notifications')}
              activeOpacity={0.85}
            >
              <View style={styles.catalogButtonIconWrapper}>
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.catalogButtonContent}>
                <Text style={styles.catalogButtonTitle}>Помощник заполнения с напоминаниями</Text>
                <Text style={styles.catalogButtonText}>Настроить уведомления для бумажных альбомов</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C9A89A" />
            </TouchableOpacity>
          </View>

          {/* Кнопка каталога товаров */}
          <View style={[styles.catalogContainer, sectionWrap]}>
            <TouchableOpacity
              style={styles.catalogButton}
              onPress={() => router.push('/paper-catalog')}
              activeOpacity={0.85}
            >
              <View style={styles.catalogButtonIconWrapper}>
                <Ionicons name="gift-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.catalogButtonContent}>
                <Text style={styles.catalogButtonTitle}>Каталог товаров</Text>
                <Text style={styles.catalogButtonText}>Купить бумажную версию альбомов</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C9A89A" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Модальное окно с опциями действий */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeActionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedProjectForAction?.title}
            </Text>
            <Text style={styles.modalSubtitle}>
              Выберите действие
            </Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={handleEditProject}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Редактировать</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDeleteProject}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Удалить</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={closeActionModal}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 36,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    letterSpacing: 0.3,
    lineHeight: 44,
  },
  greetingTablet: {
    fontSize: 40,
    lineHeight: 48,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 100,
  },
  emptyStateTitle: {
    fontSize: 24,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginTop: 28,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 17,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  newProjectButton: {
    backgroundColor: '#C9A89A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    minWidth: 200,
  },
  newProjectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  buyPaperVersionText: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    marginTop: 16,
  },
  singleProject: {},
  projectCover: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F0EB',
  },
  projectImagePlaceholder: {
    width: 120,
    height: 160,
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  projectImage: {
    width: '100%',
    height: '100%',
  },
  projectTitle: {
    fontSize: 24,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 8,
    textAlign: 'center',
  },
  projectCategory: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
  projectStats: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    justifyContent: 'space-around',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F0EB',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F0E8E0',
  },
  projectsScroll: {
    gap: 16,
  },
  projectsGridList: {
    paddingVertical: 8,
  },
  allStoriesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0E8E0',
    gap: 8,
  },
  allStoriesLinkText: {
    flex: 1,
    fontSize: 17,
    color: '#8B6F5F',
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  allStoriesLinkCount: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginRight: 16,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F0EB',
  },
  projectCardGrid: {
    flex: 1,
    marginRight: 0,
    padding: 18,
    minWidth: 0,
  },
  cardImageGrid: {
    height: 160,
    marginBottom: 14,
  },
  projectCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageContent: {
    width: '100%',
    height: '100%',
  },
  cardTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    marginBottom: 12,
  },
  cardStats: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
  },
  cardStatText: {
    fontSize: 13,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
  createMoreContainer: {
    marginTop: 28,
    marginBottom: 20,
  },
  createMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#C9A89A',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    gap: 16,
  },
  createMoreIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#C9A89A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createMoreContent: {
    flex: 1,
    flexShrink: 1,
    gap: 4,
    minWidth: 0,
  },
  createMoreTitle: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  createMoreText: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 20,
    flexShrink: 1,
  },
  catalogContainer: {
    marginTop: 4,
    marginBottom: 20,
  },
  paperAlbumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: '#C9A89A',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  catalogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  catalogButtonIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#C9A89A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  catalogButtonContent: {
    flex: 1,
    gap: 4,
  },
  catalogButtonTitle: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  catalogButtonText: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
  // Стили для модального окна
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  editButton: {
    backgroundColor: '#C9A89A',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E8E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#9B8E7F',
    fontSize: 16,
    fontWeight: '400',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
});
