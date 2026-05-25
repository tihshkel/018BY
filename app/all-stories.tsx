import { ProjectCard } from '@/components/project-card';
import { getAccountSyncId } from '@/utils/account-identity';
import { pushAccountDataToCloud, scheduleSyncToCloud } from '@/utils/account-sync';
import { removeRemindersAndScheduledNotificationsForProject } from '@/utils/project-reminders-cleanup';
import { deleteProjectInSupabase, isSupabaseConfigured } from '@/utils/supabase-account';
import {
  formatProjectsCountLabel,
  loadUserProjects,
  type UserProject,
} from '@/utils/userProjects';
import {
  getGridColumnWrapperStyle,
  getTabletContentShell,
  getTabletSectionWrap,
  HOME_CONTENT_MAX_WIDTH,
  useResponsiveLayout,
} from '@/utils/responsive';

const ALL_STORIES_GRID_COLUMNS = 2;
const ALL_STORIES_GRID_GAP = 16;
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AllStoriesScreen() {
  const layout = useResponsiveLayout(HOME_CONTENT_MAX_WIDTH);
  const contentShellStyle = getTabletContentShell(layout);
  const sectionWrap = getTabletSectionWrap(layout, {
    phonePadding: 24,
    tabletPadding: 0,
  });
  const gridColumnWrapper = getGridColumnWrapperStyle(ALL_STORIES_GRID_GAP);
  const phoneSectionPad = 24;
  const gridListWidth = layout.isTablet
    ? layout.contentMaxWidth
    : layout.width - phoneSectionPad * 2;
  const gridCardWidth =
    (gridListWidth - ALL_STORIES_GRID_GAP * (ALL_STORIES_GRID_COLUMNS - 1)) /
    ALL_STORIES_GRID_COLUMNS;

  const [projects, setProjects] = useState<UserProject[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<UserProject | null>(null);

  const refreshProjects = useCallback(async () => {
    try {
      const list = await loadUserProjects();
      setProjects(list);
    } catch (e) {
      console.error('[AllStories] load error:', e);
      setProjects([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshProjects();
    }, [refreshProjects])
  );

  const openProject = (project: UserProject) => {
    if (project.isReadyMadeAlbum || project.hasPdfTemplate) {
      router.push(`/edit-album?id=${project.id}`);
    } else {
      router.push(`/edit-project?id=${project.id}`);
    }
  };

  const handleLongPress = (project: UserProject) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedProject(project);
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedProject(null);
  };

  const handleEdit = () => {
    if (!selectedProject) return;
    closeActionModal();
    openProject(selectedProject);
  };

  const handleDelete = () => {
    if (!selectedProject) return;
    const project = selectedProject;
    Alert.alert(
      'Удалить проект',
      `Вы уверены, что хотите удалить проект "${project.title}"? Это действие нельзя отменить.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => confirmDelete(project),
        },
      ]
    );
  };

  const confirmDelete = async (project: UserProject) => {
    const projectId = String(project.id);
    try {
      await removeRemindersAndScheduledNotificationsForProject(projectId, {
        category: project.category,
        reminderDate: project.reminderDate ?? null,
      });

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

      const existingProjects = await AsyncStorage.getItem('@user_projects');
      if (existingProjects) {
        const projectsList = JSON.parse(existingProjects);
        const updatedProjects = projectsList.filter(
          (p: { id?: string }) => String(p.id) !== projectId
        );
        const updatedJson = JSON.stringify(updatedProjects);
        await AsyncStorage.setItem('@user_projects', updatedJson);

        try {
          const syncId = await getAccountSyncId();
          if (syncId && isSupabaseConfigured()) {
            await deleteProjectInSupabase({
              accessCode: syncId,
              projectId,
              updatedUserProjectsJson: updatedJson,
            });
          }
        } catch (e) {
          console.warn('[AllStories] Supabase delete failed:', e);
        }

        await pushAccountDataToCloud({ remindersAuthoritativeLocal: true });
        scheduleSyncToCloud();
      }

      await refreshProjects();
      closeActionModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[AllStories] delete error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const renderItem = useCallback(
    ({ item, index }: { item: UserProject; index: number }) => (
      <View style={{ width: gridCardWidth }}>
        <ProjectCard
          project={item}
          cardWidth={gridCardWidth}
          isGrid
          imagePriority={index < 4 ? 'high' : 'normal'}
          onPress={() => openProject(item)}
          onLongPress={() => handleLongPress(item)}
        />
      </View>
    ),
    [gridCardWidth]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.content, contentShellStyle]}>
        <View style={[styles.header, sectionWrap]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#8B6F5F" />
          </TouchableOpacity>
          <Text style={styles.title}>Все истории</Text>
          <Text style={styles.subtitle}>
            {projects.length > 0
              ? formatProjectsCountLabel(projects.length)
              : 'Пока нет проектов'}
          </Text>
        </View>

        {projects.length === 0 ? (
          <View style={[styles.empty, sectionWrap]}>
            <Ionicons name="book-outline" size={56} color="#D4C4B5" />
            <Text style={styles.emptyText}>Создайте альбом в разделе «Мои истории»</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/projects')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>Мои истории</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={projects}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={ALL_STORIES_GRID_COLUMNS}
            style={[
              styles.gridList,
              { width: gridListWidth },
              sectionWrap,
            ]}
            columnWrapperStyle={gridColumnWrapper}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={closeActionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedProject?.title}</Text>
            <Text style={styles.modalSubtitle}>Выберите действие</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={handleEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Редактировать</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
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
  header: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    padding: 4,
  },
  title: {
    fontSize: 32,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#9B8E7F',
  },
  gridList: {
    alignSelf: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#9B8E7F',
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 8,
    backgroundColor: '#C9A89A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9B8E7F',
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
  },
  editButton: {
    backgroundColor: '#C9A89A',
  },
  deleteButton: {
    backgroundColor: '#C45C5C',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#9B8E7F',
  },
});
