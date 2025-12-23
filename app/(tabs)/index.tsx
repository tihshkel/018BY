import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { getAlbumTemplateById } from '@/albums';
import { generateAccessCode } from '@/utils/accessCodeGenerator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.75;

// Функция для получения изображения по категории
const getCategoryImage = (category: string) => {
  switch (category) {
    case 'pregnancy':
      return require('@/assets/images/albums/DB1_0.png');
    case 'kids':
      return require('@/assets/images/albums/DB2_0.png');
    case 'family':
      return require('@/assets/images/albums/DB3_0.png');
    case 'wedding':
      return require('@/assets/images/albums/DB4_0.png');
    case 'travel':
      return require('@/assets/images/albums/DB5_0.png');
    default:
      return null;
  }
};

interface Project {
  id: string;
  title: string;
  category: string;
  coverImage?: string;
  pagesCount: number;
  photosCount: number;
  remindersCount: number;
  dateStarted: string;
  isReadyMadeAlbum?: boolean;
  hasPdfTemplate?: boolean;
  thumbnailPath?: any;
}

const ACCESS_CODE_KEY = '@user_access_code';
const HAS_SEEN_ACCESS_CODE_KEY = '@has_seen_access_code';

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedProjectForAction, setSelectedProjectForAction] = useState<Project | null>(null);
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [showAccessCodeInfoModal, setShowAccessCodeInfoModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const opacity = useSharedValue(0);

  useEffect(() => {
    loadUserData();
    loadProjects();
    checkFirstTimeAccess();
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  // Загружаем проекты при фокусе экрана (когда пользователь возвращается на главную)
  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
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

  const checkFirstTimeAccess = async () => {
    try {
      // Проверяем, что пользователь активирован
      const isActivated = await AsyncStorage.getItem('@is_activated');
      if (isActivated !== 'true') {
        return;
      }

      const hasSeenCode = await AsyncStorage.getItem(HAS_SEEN_ACCESS_CODE_KEY);
      const existingCode = await AsyncStorage.getItem(ACCESS_CODE_KEY);
      
      console.log('Check first time access:', { hasSeenCode, existingCode, isActivated });
      
      // Если код уже был показан, не показываем модальное окно
      if (hasSeenCode === 'true') {
        console.log('Access code already shown, skipping modal');
        return;
      }
      
      // Если кода нет, генерируем новый
      let code = existingCode;
      if (!code) {
        code = generateAccessCode();
        await AsyncStorage.setItem(ACCESS_CODE_KEY, code);
        console.log('Generated new access code:', code);
      } else {
        console.log('Using existing access code:', code);
      }
      
      // Показываем модальное окно с кодом
      if (code) {
        setAccessCode(code);
        // Небольшая задержка для плавного появления после загрузки страницы
        setTimeout(() => {
          console.log('Showing access code modal with code:', code);
          setShowAccessCodeModal(true);
        }, 800);
      } else {
        console.error('No access code to show');
      }
    } catch (error) {
      console.error('Error checking first time access:', error);
    }
  };

  const handleCopyAccessCode = async () => {
    try {
      await Clipboard.setStringAsync(accessCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Код скопирован', 'Код доступа скопирован в буфер обмена');
    } catch (error) {
      console.error('Error copying access code:', error);
      Alert.alert('Ошибка', 'Не удалось скопировать код');
    }
  };

  const handleCloseAccessCodeModal = async () => {
    try {
      await AsyncStorage.setItem(HAS_SEEN_ACCESS_CODE_KEY, 'true');
      setShowAccessCodeModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving access code seen status:', error);
      setShowAccessCodeModal(false);
    }
  };

  const loadProjects = async () => {
    try {
      const savedProjects = await AsyncStorage.getItem('@user_projects');
      if (savedProjects) {
        const parsedProjects = JSON.parse(savedProjects);
        const formattedProjects: Project[] = parsedProjects.map((p: any) => ({
          id: p.id,
          title: p.title,
          category: p.category,
          pagesCount: 0, // Можно добавить подсчёт из сохранённых данных
          photosCount: 0,
          remindersCount: p.reminderDate || p.date ? 1 : 0,
          dateStarted: p.createdAt || new Date().toISOString(),
          isReadyMadeAlbum: p.isReadyMadeAlbum || false,
          hasPdfTemplate: p.hasPdfTemplate || false,
          thumbnailPath: p.thumbnailPath || null,
        }));
        setProjects(formattedProjects);
        if (formattedProjects.length > 0) {
          setSelectedProject(formattedProjects[0]);
        }
      } else {
        // Если проектов нет, показываем пустое состояние
        setProjects([]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleProjectPress = (project: Project) => {
    // Если это готовый альбом с PDF, переходим к edit-album
    // Иначе переходим к обычному edit-project
    if (project.isReadyMadeAlbum || project.hasPdfTemplate) {
      router.push(`/edit-album?id=${project.id}`);
    } else {
      router.push(`/edit-project?id=${project.id}`);
    }
  };

  const handleNewProject = () => {
    router.push('/projects');
  };

  const handleLongPress = (project: Project) => {
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
    if (selectedProjectForAction) {
      Alert.alert(
        'Удалить проект',
        `Вы уверены, что хотите удалить проект "${selectedProjectForAction.title}"? Это действие нельзя отменить.`,
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: confirmDeleteProject,
          },
        ]
      );
    }
  };

  const confirmDeleteProject = async () => {
    if (!selectedProjectForAction) return;

    try {
      // Удаляем проект из AsyncStorage
      const existingProjects = await AsyncStorage.getItem('@user_projects');
      if (existingProjects) {
        const projectsList = JSON.parse(existingProjects);
        const updatedProjects = projectsList.filter(
          (p: Project) => p.id !== selectedProjectForAction.id
        );
        await AsyncStorage.setItem('@user_projects', JSON.stringify(updatedProjects));
        
        // Обновляем состояние
        setProjects(updatedProjects);
        setSelectedProject(updatedProjects.length > 0 ? updatedProjects[0] : null);
      }
      
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Приветствие */}
          <View style={styles.header}>
            <Text style={styles.greeting}>
              Привет{userName ? `, ${userName}` : ''}!
            </Text>
          </View>

          {/* Основной проект или список проектов */}
          {projects.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={64} color="#D4C4B5" />
              <Text style={styles.emptyStateTitle}>У вас пока нет альбомов</Text>
              <Text style={styles.emptyStateText}>
                Создайте первый альбом, чтобы начать сохранять воспоминания
              </Text>
              <TouchableOpacity
                style={styles.newProjectButton}
                onPress={handleNewProject}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
                <Text style={styles.newProjectButtonText}>Создать альбом</Text>
              </TouchableOpacity>
              <Text style={styles.buyPaperVersionText}>Купить бумажную версию</Text>
            </View>
          ) : projects.length === 1 ? (
            <View style={styles.singleProject}>
              <Pressable
                style={({ pressed }) => [
                  styles.projectCover,
                  pressed && styles.projectCardPressed,
                ]}
                onPress={() => selectedProject && handleProjectPress(selectedProject)}
                onLongPress={() => selectedProject && handleLongPress(selectedProject)}
              >
                <View style={styles.projectImagePlaceholder}>
                  {selectedProject && (
                    selectedProject.thumbnailPath ? (
                      <Image
                        source={selectedProject.thumbnailPath}
                        style={styles.projectImage}
                        contentFit="cover"
                        priority="high"
                        cachePolicy="disk"
                        transition={0}
                        fadeDuration={0}
                        recyclingKey={selectedProject.id}
                      />
                    ) : getCategoryImage(selectedProject.category) ? (
                      <Image
                        source={getCategoryImage(selectedProject.category)}
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
                <Text style={styles.projectCategory}>{selectedProject?.category}</Text>
              </Pressable>
              <View style={styles.projectStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{selectedProject?.pagesCount}</Text>
                  <Text style={styles.statLabel}>страниц</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{selectedProject?.photosCount}</Text>
                  <Text style={styles.statLabel}>фото</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{selectedProject?.remindersCount}</Text>
                  <Text style={styles.statLabel}>напоминаний</Text>
                </View>
              </View>
            </View>
          ) : (
            <>
              {/* Горизонтальный скролл проектов */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.projectsScroll}
                snapToInterval={CARD_WIDTH + 16}
                decelerationRate="fast"
              >
                {projects.map((project) => (
                  <Pressable
                    key={project.id}
                    style={({ pressed }) => [
                      styles.projectCard,
                      pressed && styles.projectCardPressed,
                    ]}
                    onPress={() => handleProjectPress(project)}
                    onLongPress={() => handleLongPress(project)}
                  >
                    <View style={styles.cardImage}>
                      {project.thumbnailPath ? (
                        <Image
                          source={project.thumbnailPath}
                          style={styles.cardImageContent}
                          contentFit="contain"
                          priority={projects.indexOf(project) < 3 ? "high" : "normal"}
                          cachePolicy="disk"
                          transition={0}
                          fadeDuration={0}
                          recyclingKey={project.id}
                          placeholderContentFit="contain"
                        />
                      ) : getCategoryImage(project.category) ? (
                        <Image
                          source={getCategoryImage(project.category)}
                          style={styles.cardImageContent}
                          contentFit="contain"
                          priority={projects.indexOf(project) < 3 ? "high" : "normal"}
                          cachePolicy="disk"
                          transition={0}
                          fadeDuration={0}
                          recyclingKey={project.id}
                          placeholderContentFit="contain"
                        />
                      ) : (
                        <Ionicons name="book" size={40} color="#C9A89A" />
                      )}
                    </View>
                    <Text style={styles.cardTitle}>{project.title}</Text>
                    <Text style={styles.cardCategory}>{project.category}</Text>
                    <View style={styles.cardStats}>
                      <Text style={styles.cardStatText}>
                        {project.pagesCount} стр. • {project.photosCount} фото
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          {/* Предложение создать еще альбом */}
          {projects.length > 0 && (
            <View style={styles.createMoreContainer}>
              <TouchableOpacity
                style={styles.createMoreButton}
                onPress={handleNewProject}
                activeOpacity={0.8}
              >
                <View style={styles.createMoreIconWrapper}>
                  <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.createMoreContent}>
                  <Text style={styles.createMoreTitle}>Создать ещё альбом</Text>
                  <Text style={styles.createMoreText}>
                    Сохраняйте все важные моменты в красивых альбомах
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C9A89A" />
              </TouchableOpacity>
              <Text style={styles.buyPaperVersionText}>Купить бумажную версию</Text>
            </View>
          )}

          {/* Кнопка каталога */}
          <View style={styles.catalogContainer}>
            <TouchableOpacity
              style={styles.catalogButton}
              onPress={() => router.push('/paper-catalog')}
              activeOpacity={0.85}
            >
              <View style={styles.catalogButtonIconWrapper}>
                <Ionicons name="gift-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.catalogButtonContent}>
                <Text style={styles.catalogButtonTitle}>Каталог</Text>
                <Text style={styles.catalogButtonText}>Купить бумажную версию</Text>
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

      {/* Модальное окно с кодом доступа */}
      <Modal
        visible={showAccessCodeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseAccessCodeModal}
      >
        <View style={styles.accessCodeModalOverlay}>
          <View style={styles.accessCodeModalContent}>
            {/* Иконка */}
            <View style={styles.accessCodeIconContainer}>
              <Ionicons name="key-outline" size={40} color="#C9A89A" />
            </View>
            
            <Text style={styles.accessCodeModalTitle}>
              Ваш код доступа
            </Text>
            
            <Text style={styles.accessCodeModalSubtitle}>
              Сохраните этот код в безопасном месте. Он понадобится вам для входа в аккаунт при смене телефона или окончании сессии.
            </Text>
            
            {/* Код доступа */}
            <TouchableOpacity
              style={styles.accessCodeContainer}
              onPress={handleCopyAccessCode}
              activeOpacity={0.8}
            >
              <Text style={styles.accessCodeText}>{accessCode}</Text>
              <View style={styles.copyIconContainer}>
                <Ionicons name="copy-outline" size={18} color="#C9A89A" />
              </View>
            </TouchableOpacity>
            <Text style={styles.copyHintText}>Нажмите на код, чтобы скопировать</Text>
            
            <TouchableOpacity
              style={styles.accessCodeWarningContainer}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Закрываем основное модальное окно и открываем информационное
                setShowAccessCodeModal(false);
                setTimeout(() => {
                  setShowAccessCodeInfoModal(true);
                }, 300);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={18} color="#8B6F5F" />
              <Text style={styles.accessCodeWarningText}>
                Обязательно запомните этот код!
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.accessCodeButton}
              onPress={handleCloseAccessCodeModal}
              activeOpacity={0.7}
            >
              <Text style={styles.accessCodeButtonText}>Понятно</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Модальное окно с информацией о коде доступа */}
      <Modal
        visible={showAccessCodeInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAccessCodeInfoModal(false)}
      >
        <View style={styles.accessCodeModalOverlay}>
          <View style={styles.accessCodeInfoModalContent}>
            <View style={styles.accessCodeInfoHeader}>
              <Text style={styles.accessCodeInfoTitle}>
                Зачем нужен код доступа?
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAccessCodeInfoModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#9B8E7F" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.accessCodeInfoScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Раздел о важности кода */}
              <View style={styles.infoSection}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="key" size={24} color="#C9A89A" />
                </View>
                <Text style={styles.infoSectionTitle}>
                  Вход в приложение
                </Text>
                <Text style={styles.infoSectionText}>
                  Код доступа необходим для входа в приложение. По нему вы сможете войти в свой аккаунт при смене телефона или окончании сессии. Без него вы не сможете получить доступ к своим альбомам и проектам.
                </Text>
              </View>

              {/* Раздел о забытом коде */}
              <View style={styles.infoSection}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="help-circle" size={24} color="#C9A89A" />
                </View>
                <Text style={styles.infoSectionTitle}>
                  Забыли код?
                </Text>
                <Text style={styles.infoSectionText}>
                  Если вы забыли свой код доступа, обратитесь в техническую поддержку. Наши специалисты помогут вам восстановить доступ к аккаунту.
                </Text>
              </View>

              {/* Раздел о QR-коде */}
              <View style={styles.infoSection}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="qr-code" size={24} color="#C9A89A" />
                </View>
                <Text style={styles.infoSectionTitle}>
                  Альтернативный способ входа
                </Text>
                <Text style={styles.infoSectionText}>
                  Если вам нужно войти в аккаунт на новом устройстве, но вы забыли код, вы можете отсканировать QR-код на старом телефоне. Для этого откройте приложение на старом устройстве, перейдите в раздел "Профиль" и найдите пункт "Отсканировать QR-код" под разделом "Оценить приложение".
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.accessCodeButton}
              onPress={() => setShowAccessCodeInfoModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.accessCodeButtonText}>Понятно</Text>
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
    paddingHorizontal: 24,
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
  singleProject: {
    paddingHorizontal: 24,
  },
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
    paddingHorizontal: 24,
    gap: 16,
  },
  projectCard: {
    width: CARD_WIDTH,
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
    paddingHorizontal: 24,
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
    gap: 4,
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
  },
  catalogContainer: {
    paddingHorizontal: 24,
    marginTop: 4,
    marginBottom: 20,
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
  // Стили для модального окна с кодом доступа
  accessCodeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  accessCodeModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F5F0EB',
    alignItems: 'center',
  },
  accessCodeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  accessCodeModalTitle: {
    fontSize: 22,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 12,
  },
  accessCodeModalSubtitle: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  accessCodeContainer: {
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#F0E8E0',
    marginBottom: 8,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  accessCodeText: {
    fontSize: 28,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'monospace',
      default: 'monospace',
    }),
    fontWeight: '600',
    letterSpacing: 3,
  },
  copyIconContainer: {
    position: 'absolute',
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  copyHintText: {
    fontSize: 12,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    marginBottom: 20,
    textAlign: 'center',
  },
  accessCodeWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    width: '100%',
    gap: 10,
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  accessCodeWarningText: {
    fontSize: 13,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
    flex: 1,
  },
  accessCodeButton: {
    backgroundColor: '#C9A89A',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  accessCodeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  // Стили для модального окна с информацией о коде
  accessCodeInfoModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F5F0EB',
  },
  accessCodeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  accessCodeInfoTitle: {
    fontSize: 22,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  accessCodeInfoScroll: {
    maxHeight: 400,
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8E0',
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  infoSectionTitle: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 8,
  },
  infoSectionText: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 20,
  },
});
