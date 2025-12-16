import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SIDEBAR_WIDTH = 200;
const CONTENT_WIDTH = SCREEN_WIDTH - SIDEBAR_WIDTH - 48;

interface Section {
  id: string;
  title: string;
  pages: Page[];
  expanded: boolean;
  visible: boolean;
}

interface Page {
  id: string;
  blocks: Block[];
}

interface Block {
  id: string;
  type: 'text' | 'image';
  content: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

export default function EditProjectScreen() {
  const params = useLocalSearchParams();
  const projectId = params.id as string;
  
  const [sections, setSections] = useState<Section[]>([
    {
      id: '1',
      title: 'Первое УЗИ',
      expanded: true,
      visible: true,
      pages: [{ id: '1', blocks: [] }],
    },
    {
      id: '2',
      title: 'Шевеления',
      expanded: false,
      visible: true,
      pages: [{ id: '2', blocks: [] }],
    },
    {
      id: '3',
      title: 'Подготовка к родам',
      expanded: false,
      visible: true,
      pages: [{ id: '3', blocks: [] }],
    },
  ]);
  
  const [selectedSection, setSelectedSection] = useState(sections[0]);
  const [selectedPage, setSelectedPage] = useState(sections[0]?.pages[0]);
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialArrow, setTutorialArrow] = useState(true);
  const arrowOpacity = useSharedValue(1);
  const arrowY = useSharedValue(0);

  useEffect(() => {
    checkTutorialShown();
    startTutorialAnimation();
    
    // Скрыть туториал через 5 секунд
    const timer = setTimeout(async () => {
      setTutorialArrow(false);
      setTimeout(() => {
        setShowTutorial(false);
        // Сохранить, что туториал был показан
        AsyncStorage.setItem(`@tutorial_shown_${projectId}`, 'true').catch(
          (err) => console.error('Error saving tutorial status:', err)
        );
      }, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [projectId]);

  const checkTutorialShown = async () => {
    try {
      const shown = await AsyncStorage.getItem(`@tutorial_shown_${projectId}`);
      if (shown === 'true') {
        setShowTutorial(false);
      }
    } catch (error) {
      console.error('Error checking tutorial:', error);
    }
  };

  const startTutorialAnimation = () => {
    arrowY.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 800 }),
        withTiming(0, { duration: 800 })
      ),
      -1,
      false
    );
    arrowOpacity.value = withDelay(
      3000,
      withTiming(0, { duration: 500 })
    );
  };

  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: arrowOpacity.value,
    transform: [{ translateY: arrowY.value }],
  }));

  const handleToggleSection = (sectionId: string) => {
    setSections(sections.map(section =>
      section.id === sectionId
        ? { ...section, expanded: !section.expanded }
        : section
    ));
  };

  const handleToggleVisibility = (sectionId: string) => {
    setSections(sections.map(section =>
      section.id === sectionId
        ? { ...section, visible: !section.visible }
        : section
    ));
  };

  const handleSelectSection = (section: Section) => {
    setSelectedSection(section);
    setSelectedPage(section.pages[0]);
  };

  const handleAddPage = () => {
    const newPage: Page = { id: Date.now().toString(), blocks: [] };
    setSections(sections.map(section =>
      section.id === selectedSection.id
        ? { ...section, pages: [...section.pages, newPage] }
        : section
    ));
    setSelectedPage(newPage);
  };

  const handleAddPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Доступ к галерее запрещён');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && selectedPage) {
      const newBlock: Block = {
        id: Date.now().toString(),
        type: 'image',
        content: result.assets[0].uri,
        width: 200,
        height: 150,
      };
      
      const updatedPages = selectedSection.pages.map(page =>
        page.id === selectedPage.id
          ? { ...page, blocks: [...page.blocks, newBlock] }
          : page
      );

      setSections(sections.map(section =>
        section.id === selectedSection.id
          ? { ...section, pages: updatedPages }
          : section
      ));

      setSelectedPage(updatedPages.find(p => p.id === selectedPage.id));
    }
  };

  const handleAddText = () => {
    if (!selectedPage) return;
    
    const newBlock: Block = {
      id: Date.now().toString(),
      type: 'text',
      content: '',
    };

    const updatedPages = selectedSection.pages.map(page =>
      page.id === selectedPage.id
        ? { ...page, blocks: [...page.blocks, newBlock] }
        : page
    );

    setSections(sections.map(section =>
      section.id === selectedSection.id
        ? { ...section, pages: updatedPages }
        : section
    ));

    setSelectedPage(updatedPages.find(p => p.id === selectedPage.id));
  };

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(`@project_${projectId}`, JSON.stringify(sections));
      Alert.alert('Сохранено', 'Изменения успешно сохранены');
    } catch (error) {
      console.error('Error saving project:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить изменения');
    }
  };

  const handleExport = () => {
    router.push(`/export-pdf?id=${projectId}`);
  };

  const handleReminders = () => {
    router.push('/reminders-list');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.layout}>
        {/* Боковая панель с оглавлением */}
        <View style={styles.sidebar}>
          <ScrollView style={styles.sidebarScroll}>
            {sections.map((section) => (
              <View key={section.id} style={styles.sectionItem}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => handleSelectSection(section)}
                  activeOpacity={0.7}
                >
                  <TouchableOpacity
                    onPress={() => handleToggleSection(section.id)}
                    style={styles.expandButton}
                  >
                    <Ionicons
                      name={section.expanded ? 'chevron-down' : 'chevron-forward'}
                      size={16}
                      color="#8B6F5F"
                    />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.sectionTitle,
                      selectedSection.id === section.id && styles.sectionTitleActive,
                      !section.visible && styles.sectionTitleHidden,
                    ]}
                  >
                    {section.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleToggleVisibility(section.id)}
                    style={styles.visibilityButton}
                  >
                    <Ionicons
                      name={section.visible ? 'eye' : 'eye-off'}
                      size={18}
                      color={section.visible ? '#9B8E7F' : '#D4C4B5'}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>

                {section.expanded && (
                  <View style={styles.pagesList}>
                    {section.pages.map((page, index) => (
                      <TouchableOpacity
                        key={page.id}
                        style={[
                          styles.pageItem,
                          selectedPage?.id === page.id && styles.pageItemActive,
                        ]}
                        onPress={() => setSelectedPage(page)}
                      >
                        <Text style={styles.pageNumber}>Стр. {index + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Кнопка добавления страницы */}
          <TouchableOpacity
            style={styles.addPageButton}
            onPress={handleAddPage}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={24} color="#C9A89A" />
            <Text style={styles.addPageText}>Добавить страницу</Text>
          </TouchableOpacity>
        </View>

        {/* Основная рабочая область */}
        <View style={styles.contentArea}>
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollContent}
          >
            {selectedPage?.blocks.map((block) => (
              <View key={block.id} style={styles.block}>
                {block.type === 'image' ? (
                  <View style={styles.imageBlock}>
                    <Image
                      source={{ uri: block.content }}
                      style={[styles.image, { width: block.width, height: block.height }]}
                      contentFit="cover"
                      priority="high"
                      cachePolicy="disk"
                      transition={0}
                      fadeDuration={0}
                    />
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        const updatedPages = selectedSection.pages.map(page =>
                          page.id === selectedPage?.id
                            ? {
                                ...page,
                                blocks: page.blocks.filter(b => b.id !== block.id),
                              }
                            : page
                        );
                        setSections(sections.map(section =>
                          section.id === selectedSection.id
                            ? { ...section, pages: updatedPages }
                            : section
                        ));
                        setSelectedPage(updatedPages.find(p => p.id === selectedPage?.id));
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color="#D9776C" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.textBlockContainer}>
                    <TextInput
                      style={styles.textBlock}
                      placeholder="Введите заметку..."
                      placeholderTextColor="#B8A89A"
                      multiline
                      value={block.content}
                      onChangeText={(text) => {
                        const updatedPages = selectedSection.pages.map(page =>
                          page.id === selectedPage?.id
                            ? {
                                ...page,
                                blocks: page.blocks.map(b =>
                                  b.id === block.id ? { ...b, content: text } : b
                                ),
                              }
                            : page
                        );
                        setSections(sections.map(section =>
                          section.id === selectedSection.id
                            ? { ...section, pages: updatedPages }
                            : section
                        ));
                        setSelectedPage(updatedPages.find(p => p.id === selectedPage?.id));
                      }}
                    />
                    <TouchableOpacity
                      style={styles.deleteTextButton}
                      onPress={() => {
                        const updatedPages = selectedSection.pages.map(page =>
                          page.id === selectedPage?.id
                            ? {
                                ...page,
                                blocks: page.blocks.filter(b => b.id !== block.id),
                              }
                            : page
                        );
                        setSections(sections.map(section =>
                          section.id === selectedSection.id
                            ? { ...section, pages: updatedPages }
                            : section
                        ));
                        setSelectedPage(updatedPages.find(p => p.id === selectedPage?.id));
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#D9776C" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            {/* Пустая страница */}
            {selectedPage && selectedPage.blocks.length === 0 && (
              <View style={styles.emptyPage}>
                <Ionicons name="image-outline" size={48} color="#D4C4B5" />
                <Text style={styles.emptyPageText}>
                  Нажмите на кнопки ниже, чтобы добавить контент
                </Text>
              </View>
            )}

            {/* Туториал */}
            {showTutorial && selectedPage && selectedPage.blocks.length === 0 && (
              <View style={styles.tutorial}>
                <Text style={styles.tutorialText}>
                  Нажмите сюда, чтобы добавить фото с первого УЗИ
                </Text>
                {tutorialArrow && (
                  <Animated.View style={[styles.tutorialArrow, arrowAnimatedStyle]}>
                    <Ionicons name="arrow-down" size={32} color="#C9A89A" />
                  </Animated.View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Нижняя панель действий */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAddPhoto}
          activeOpacity={0.7}
        >
          <Ionicons name="image-outline" size={24} color="#C9A89A" />
          <Text style={styles.actionButtonText}>Фото</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAddText}
          activeOpacity={0.7}
        >
          <Ionicons name="text-outline" size={24} color="#C9A89A" />
          <Text style={styles.actionButtonText}>Текст</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSave}
          activeOpacity={0.7}
        >
          <Ionicons name="save-outline" size={24} color="#C9A89A" />
          <Text style={styles.actionButtonText}>Сохранить</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleExport}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={24} color="#C9A89A" />
          <Text style={styles.actionButtonText}>Экспорт</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleReminders}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color="#C9A89A" />
          <Text style={styles.actionButtonText}>Напоминания</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sidebarScroll: {
    flex: 1,
  },
  sectionItem: {
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  expandButton: {
    marginRight: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
  },
  sectionTitleActive: {
    color: '#C9A89A',
    fontWeight: '600',
  },
  sectionTitleHidden: {
    opacity: 0.4,
    textDecorationLine: 'line-through',
  },
  visibilityButton: {
    padding: 4,
  },
  pagesList: {
    paddingLeft: 24,
    paddingBottom: 8,
  },
  pageItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  pageItemActive: {
    backgroundColor: '#FAF8F5',
  },
  pageNumber: {
    fontSize: 12,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
  addPageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
    gap: 8,
  },
  addPageText: {
    fontSize: 14,
    color: '#C9A89A',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContent: {
    padding: 24,
    minHeight: '100%',
  },
  block: {
    marginBottom: 24,
  },
  imageBlock: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  image: {
    borderRadius: 12,
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  textBlockContainer: {
    position: 'relative',
  },
  textBlock: {
    fontSize: 16,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 24,
    minHeight: 100,
    padding: 16,
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  deleteTextButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  emptyPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 140,
  },
  emptyPageText: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    marginTop: 16,
    textAlign: 'center',
  },
  tutorial: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: '#FFF9F5',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  tutorialText: {
    fontSize: 15,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 12,
  },
  tutorialArrow: {
    alignItems: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  actionButton: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: 70,
  },
  actionButtonText: {
    fontSize: 11,
    color: '#C9A89A',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
});

