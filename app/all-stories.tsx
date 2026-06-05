import { ProjectCard } from '@/components/project-card';
import { deleteUserProjectLocally } from '@/utils/delete-user-project';
import {
  formatProjectsCountLabel,
  loadUserProjects,
  type UserProject,
} from '@/utils/userProjects';
import {
  getTabletContentShell,
  getTabletSectionWrap,
  HOME_CONTENT_MAX_WIDTH,
  useResponsiveLayout,
} from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';

const ALL_STORIES_GRID_COLUMNS = 2;
const ALL_STORIES_GRID_GAP = 12;
const PHONE_HORIZONTAL_PAD = 20;
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
    phonePadding: PHONE_HORIZONTAL_PAD,
    tabletPadding: 0,
  });
  const horizontalPad = layout.isTablet ? 0 : PHONE_HORIZONTAL_PAD;
  const gridContentWidth = layout.isTablet
    ? layout.contentMaxWidth
    : layout.width - horizontalPad * 2;
  const gridCardWidth = Math.floor(
    (gridContentWidth - ALL_STORIES_GRID_GAP) / ALL_STORIES_GRID_COLUMNS
  );

  const [projects, setProjects] = useState<UserProject[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<UserProject | null>(null);
  const [actionModalStep, setActionModalStep] = useState<'menu' | 'confirmDelete'>('menu');

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
    setActionModalStep('menu');
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedProject(null);
    setActionModalStep('menu');
  };

  const handleActionModalRequestClose = () => {
    if (actionModalStep === 'confirmDelete') {
      setActionModalStep('menu');
      return;
    }
    closeActionModal();
  };

  const handleEdit = () => {
    if (!selectedProject) return;
    closeActionModal();
    openProject(selectedProject);
  };

  const handleDelete = () => {
    if (!selectedProject) return;
    setActionModalStep('confirmDelete');
  };

  const handleDeleteConfirmCancel = () => {
    setActionModalStep('menu');
  };

  const handleDeleteConfirm = async () => {
    const project = selectedProject;
    if (!project) return;

    const projectId = project.id;
    closeActionModal();
    setProjects((prev) => prev.filter((p) => p.id !== projectId));

    try {
      await deleteUserProjectLocally(project);
      await refreshProjects();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[AllStories] delete error:', error);
      await refreshProjects();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Ошибка', 'Не удалось удалить проект. Попробуйте снова.');
    }
  };

  const renderItem = useCallback(
    ({ item, index }: { item: UserProject; index: number }) => (
      <View style={[styles.gridCell, { width: gridCardWidth }]}>
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
            style={styles.gridList}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingHorizontal: horizontalPad,
                maxWidth: layout.isTablet ? layout.contentMaxWidth : undefined,
                alignSelf: 'center',
                width: layout.isTablet ? layout.contentMaxWidth : '100%',
              },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {showActionModal ? (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={handleActionModalRequestClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {actionModalStep === 'menu' ? (
              <>
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
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Удалить проект?</Text>
                <Text style={styles.modalSubtitle}>
                  {`Проект «${selectedProject?.title ?? ''}» будет удалён без возможности восстановления.`}
                </Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={handleDeleteConfirm}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Удалить</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleDeleteConfirmCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Отмена</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      ) : null}
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
    flex: 1,
  },
  gridRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: ALL_STORIES_GRID_GAP,
  },
  gridCell: {
    flexGrow: 0,
    flexShrink: 0,
  },
  listContent: {
    paddingBottom: 40,
    width: '100%',
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
