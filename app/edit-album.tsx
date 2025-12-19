import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageViewer from '@/components/image-viewer';
import CoverViewer from '@/components/cover-viewer';
import PdfSkeletonLoader from '@/components/pdf-skeleton-loader';
import { getAlbumTemplateById } from '@/albums';
import { getAlbumImageUris, getAlbumPageCount } from '@/utils/albumImages';
import { Annotation, PdfAnnotationsRef } from '@/components/pdf-annotations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function EditAlbumScreen() {
  const { id, celebration, coverType, interiorType, eventDate } = useLocalSearchParams<{ 
    id?: string;
    celebration?: string;
    coverType?: string;
    interiorType?: string;
    eventDate?: string;
  }>();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(60);
  const [images, setImages] = useState<string[]>([]);
  const [albumName, setAlbumName] = useState<string>('');
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'text' | 'image' | 'drawing' | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [viewMode, setViewMode] = useState<'pages' | 'cover'>('pages');
  const [coverAnnotations, setCoverAnnotations] = useState<Annotation[]>([]);
  const [isAddingText, setIsAddingText] = useState(false);
  const [editingTextAnnotationId, setEditingTextAnnotationId] = useState<string | null>(null);
  const [currentTextAnnotation, setCurrentTextAnnotation] = useState<Annotation | null>(null);
  const annotationsRef = React.useRef<PdfAnnotationsRef | null>(null);
  const containerOpacity = useSharedValue(0);

  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
    loadImagesData();
  }, [id, coverType, interiorType]);

  const loadImagesData = async () => {
    try {
      setIsLoading(true);
      let foundAlbumId: string | null = null;
      let foundAlbumName = '';
      
      if (id) {
        // Загружаем данные проекта из AsyncStorage
        const projectData = await AsyncStorage.getItem(`@project_${id}`);
        
        if (projectData) {
          const project = JSON.parse(projectData);
          foundAlbumName = project.title || 'Альбом';
          
          // Получаем ID альбома
          if (project.isReadyMadeAlbum) {
            const originalAlbumId = project.albumId || id;
            // Для детских альбомов используем единый ID для загрузки изображений
            if (project.category === 'kids') {
              foundAlbumId = 'kids_48';
            } else {
              foundAlbumId = originalAlbumId;
            }
          } else {
            foundAlbumId = project.albumId || null;
          }
        }
      } else if (interiorType) {
        // Если передан interiorType, используем соответствующий альбом
        foundAlbumId = interiorType;
        if (coverType) {
          const albumTemplate = getAlbumTemplateById(coverType);
          if (albumTemplate) {
            foundAlbumName = albumTemplate.name;
          }
        }
      } else if (coverType) {
        // Если передан coverType, ищем альбом в шаблонах
        const albumTemplate = getAlbumTemplateById(coverType);
        if (albumTemplate) {
          foundAlbumName = albumTemplate.name;
          // Для детских альбомов используем единый ID для загрузки изображений
          if (albumTemplate.category === 'kids') {
            foundAlbumId = 'kids_48';
          } else {
            foundAlbumId = coverType;
          }
        }
      }
      
      // Если альбом не найден, используем дефолтный
      if (!foundAlbumId) {
        // Если это категория kids, используем kids_48
        if (celebration === 'kids') {
          foundAlbumId = 'kids_48';
        } else {
          foundAlbumId = 'pregnancy_60';
        }
      }
      
      setAlbumId(foundAlbumId);
      setAlbumName(foundAlbumName);
      
      // Загружаем изображения для альбома
      let imageUris: string[] = [];
      
      if (id) {
        // Проверяем, есть ли сохраненные изменения в изображениях
        const savedImages = await AsyncStorage.getItem(`@project_images_${id}`);
        if (savedImages) {
          imageUris = JSON.parse(savedImages);
        } else {
          imageUris = await getAlbumImageUris(foundAlbumId);
        }
      } else {
        imageUris = await getAlbumImageUris(foundAlbumId);
      }
      
      setImages(imageUris);
      setTotalPages(imageUris.length);
      
      // Загружаем сохраненные аннотации
      if (id) {
        const savedAnnotations = await AsyncStorage.getItem(`@project_annotations_${id}`);
        if (savedAnnotations) {
          setAnnotations(JSON.parse(savedAnnotations));
        }
        
        // Загружаем аннотации обложки
        const savedCoverAnnotations = await AsyncStorage.getItem(`@project_cover_annotations_${id}`);
        if (savedCoverAnnotations) {
          setCoverAnnotations(JSON.parse(savedCoverAnnotations));
        }
      }
      
      // Если проекта нет, создаем его при первом открытии
      if (!id && (coverType || interiorType) && celebration) {
        const newProjectId = Date.now().toString();
        const albumTemplate = coverType ? getAlbumTemplateById(coverType) : null;
        
        const projectData: any = {
          id: newProjectId,
          title: albumTemplate?.name || foundAlbumName || getCelebrationTitle(celebration),
          category: celebration,
          albumId: foundAlbumId,
          createdAt: new Date().toISOString(),
          isReadyMadeAlbum: true,
        };
        
        // Сохраняем дату события, если она передана
        if (eventDate) {
          projectData.reminderDate = eventDate;
        }
        
        // Сохраняем информацию о проекте
        await AsyncStorage.setItem(`@project_${newProjectId}`, JSON.stringify(projectData));
        
        // Сохраняем в список проектов
        const existingProjects = await AsyncStorage.getItem('@user_projects');
        const projects = existingProjects ? JSON.parse(existingProjects) : [];
        projects.push(projectData);
        await AsyncStorage.setItem('@user_projects', JSON.stringify(projects));
        
        // Обновляем URL с новым ID проекта
        router.replace({
          pathname: '/edit-album',
          params: {
            id: newProjectId,
            celebration,
            coverType,
            interiorType,
            eventDate,
          }
        });
      } else if (id && eventDate) {
        // Если проект существует и передана новая дата, обновляем её
        const projectData = await AsyncStorage.getItem(`@project_${id}`);
        if (projectData) {
          const project = JSON.parse(projectData);
          project.reminderDate = eventDate;
          await AsyncStorage.setItem(`@project_${id}`, JSON.stringify(project));
          
          // Обновляем в списке проектов
          const existingProjects = await AsyncStorage.getItem('@user_projects');
          if (existingProjects) {
            const projects = JSON.parse(existingProjects);
            const projectIndex = projects.findIndex((p: any) => p.id === id);
            if (projectIndex !== -1) {
              projects[projectIndex].reminderDate = eventDate;
              await AsyncStorage.setItem('@user_projects', JSON.stringify(projects));
            }
          }
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading images data:', error);
      setImages([]);
      setIsLoading(false);
    }
  };

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
    };
  });

  const getCelebrationTitle = (celebrationId: string) => {
    const celebrationMap: { [key: string]: string } = {
      pregnancy: 'Беременность',
      kids: 'Детство',
      family: 'Семья',
      wedding: 'Свадьба',
      travel: 'Путешествия',
    };
    return celebrationMap[celebrationId] || 'Праздник';
  };

  const handleExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Убеждаемся, что проект сохранен перед экспортом
    if (!id) {
      // Создаем временный проект для экспорта
      const tempProjectId = Date.now().toString();
      const projectData = {
        id: tempProjectId,
        title: albumName || getCelebrationTitle(celebration || ''),
        albumId: albumId || 'pregnancy_60',
        createdAt: new Date().toISOString(),
        isReadyMadeAlbum: true,
      };
      
      await AsyncStorage.setItem(`@project_${tempProjectId}`, JSON.stringify(projectData));
      
      // Сохраняем текущие изображения и аннотации
      await AsyncStorage.setItem(`@project_images_${tempProjectId}`, JSON.stringify(images));
      await AsyncStorage.setItem(`@project_annotations_${tempProjectId}`, JSON.stringify(annotations));
      await AsyncStorage.setItem(`@project_cover_annotations_${tempProjectId}`, JSON.stringify(coverAnnotations));
      
      router.push(`/export-pdf?id=${tempProjectId}`);
    } else {
      // Сохраняем текущие данные перед экспортом
      await AsyncStorage.setItem(`@project_images_${id}`, JSON.stringify(images));
      await AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(annotations));
      await AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(coverAnnotations));
      
      router.push(`/export-pdf?id=${id}`);
    }
  };

  const handlePageChange = (page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
  };

  const handleError = (error: any) => {
    console.error('Images Error:', error);
    Alert.alert(
      'Ошибка загрузки',
      'Не удалось загрузить изображения. Попробуйте позже.',
      [{ text: 'OK' }]
    );
  };

  const handleAnnotationAdd = (annotation: Annotation) => {
    const newAnnotation = { ...annotation, page: currentPage };
    const updatedAnnotations = [...annotations, newAnnotation];
    setAnnotations(updatedAnnotations);
    
    // Сохраняем аннотации
    if (id) {
      AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(updatedAnnotations));
    }
  };

  const handleAnnotationUpdate = (annotationId: string, updates: Partial<Annotation>) => {
    const updatedAnnotations = annotations.map(ann =>
      ann.id === annotationId ? { ...ann, ...updates } : ann
    );
    setAnnotations(updatedAnnotations);
    
    // Сохраняем аннотации
    if (id) {
      AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(updatedAnnotations));
    }
  };

  const handleAnnotationDelete = (annotationId: string) => {
    const updatedAnnotations = annotations.filter(ann => ann.id !== annotationId);
    setAnnotations(updatedAnnotations);
    
    // Сохраняем аннотации
    if (id) {
      AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(updatedAnnotations));
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleZoomIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleToolSelect = (tool: 'text' | 'image' | 'drawing' | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentTool(tool);
    setIsEditing(true);
  };

  const handleToolReset = () => {
    setCurrentTool(null);
    setIsAddingText(false);
    setEditingTextAnnotationId(null);
    setCurrentTextAnnotation(null);
  };

  const handleTextEditingStateChange = (isEditing: boolean, annotationId: string | null) => {
    setIsAddingText(isEditing);
    setEditingTextAnnotationId(annotationId);
    
    if (annotationId) {
      // Находим текущую аннотацию для отображения в верхней панели
      const annotation = viewMode === 'cover' 
        ? coverAnnotations.find(ann => ann.id === annotationId)
        : annotations.find(ann => ann.id === annotationId);
      setCurrentTextAnnotation(annotation || null);
    } else {
      setCurrentTextAnnotation(null);
    }
  };

  const handleColorButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    annotationsRef.current?.openColorPicker?.();
  };

  const handleFontSizeButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    annotationsRef.current?.openFontSizePicker?.();
  };

  const handleFontButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    annotationsRef.current?.openFontPicker?.();
  };

  const handleToggleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsEditing(prev => !prev);
    if (isEditing) {
      setCurrentTool(null);
      // При выходе из режима редактирования сохраняем аннотации обложки
      if (viewMode === 'cover' && id) {
        AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(coverAnnotations));
      }
    }
  };

  const handleViewModeToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (viewMode === 'pages') {
      // Переключаемся на обложку - сохраняем аннотации страниц
      if (id) {
        AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(annotations));
      }
      setViewMode('cover');
    } else {
      // Переключаемся на страницы - сохраняем аннотации обложки
      if (id) {
        AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(coverAnnotations));
      }
      setViewMode('pages');
    }
    // Сбрасываем инструмент при переключении режимов
    setCurrentTool(null);
  };

  const handleCoverAnnotationAdd = (annotation: Annotation) => {
    const newAnnotation = { ...annotation, page: 'cover' };
    const updatedAnnotations = [...coverAnnotations, newAnnotation];
    setCoverAnnotations(updatedAnnotations);
    
    // Сохраняем аннотации обложки
    if (id) {
      AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(updatedAnnotations));
    }
  };

  const handleCoverAnnotationUpdate = (annotationId: string, updates: Partial<Annotation>) => {
    const updatedAnnotations = coverAnnotations.map(ann =>
      ann.id === annotationId ? { ...ann, ...updates } : ann
    );
    setCoverAnnotations(updatedAnnotations);
    
    // Сохраняем аннотации обложки
    if (id) {
      AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(updatedAnnotations));
    }
  };

  const handleCoverAnnotationDelete = (annotationId: string) => {
    const updatedAnnotations = coverAnnotations.filter(ann => ann.id !== annotationId);
    setCoverAnnotations(updatedAnnotations);
    
    // Сохраняем аннотации обложки
    if (id) {
      AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(updatedAnnotations));
    }
  };

  const handlePageDuplicate = (pageIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (pageIndex < 0 || pageIndex >= images.length) return;
    
    const duplicatedImage = images[pageIndex];
    const newImages = [...images];
    newImages.splice(pageIndex + 1, 0, duplicatedImage);
    
    setImages(newImages);
    setTotalPages(newImages.length);
    
    // Обновляем аннотации - копируем аннотации для дублированной страницы
    const pageAnnotations = annotations.filter(ann => (ann.page || 1) === pageIndex + 1);
    const newAnnotations = pageAnnotations.map(ann => ({
      ...ann,
      id: Date.now().toString() + Math.random(),
      page: pageIndex + 2, // Новая страница будет следующей
    }));
    
    // Обновляем номера страниц для всех аннотаций после вставленной страницы
    const updatedAnnotations = annotations.map(ann => {
      const annPage = ann.page || 1;
      if (annPage > pageIndex + 1) {
        return { ...ann, page: annPage + 1 };
      }
      return ann;
    });
    
    const finalAnnotations = [...updatedAnnotations, ...newAnnotations];
    setAnnotations(finalAnnotations);
    
    // Сохраняем изменения
    if (id) {
      AsyncStorage.setItem(`@project_images_${id}`, JSON.stringify(newImages));
      AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(finalAnnotations));
    }
    
    // Прокручиваем к новой странице
    setTimeout(() => {
      setCurrentPage(pageIndex + 2);
    }, 100);
  };

  const handlePageDelete = (pageIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (images.length <= 1) {
      Alert.alert('Невозможно удалить', 'Нельзя удалить последнюю страницу альбома');
      return;
    }
    
    if (pageIndex < 0 || pageIndex >= images.length) return;
    
    const newImages = images.filter((_, index) => index !== pageIndex);
    setImages(newImages);
    setTotalPages(newImages.length);
    
    // Удаляем аннотации для удаленной страницы и обновляем номера страниц
    const updatedAnnotations = annotations
      .filter(ann => {
        const annPage = ann.page || 1;
        return annPage !== pageIndex + 1;
      })
      .map(ann => {
        const annPage = ann.page || 1;
        if (annPage > pageIndex + 1) {
          return { ...ann, page: annPage - 1 };
        }
        return ann;
      });
    
    setAnnotations(updatedAnnotations);
    
    // Сохраняем изменения
    if (id) {
      AsyncStorage.setItem(`@project_images_${id}`, JSON.stringify(newImages));
      AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(updatedAnnotations));
    }
    
    // Обновляем текущую страницу
    if (currentPage > newImages.length) {
      setCurrentPage(newImages.length);
    } else if (currentPage > pageIndex + 1) {
      setCurrentPage(currentPage - 1);
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, containerAnimatedStyle]}>
        {/* Верхняя панель с градиентом */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Назад"
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="chevron-back" size={22} color="#8B6F5F" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.albumTitle} numberOfLines={1}>
              {viewMode === 'cover' ? 'Развертка обложки' : (albumName || getCelebrationTitle(celebration || ''))}
            </Text>
            {!isLoading && images.length > 0 && viewMode === 'pages' && (
              <Text style={styles.pageInfo}>
                Страница {currentPage} из {totalPages}
              </Text>
            )}
            {viewMode === 'cover' && (
              <Text style={styles.pageInfo}>
                Редактирование развертки
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExport}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Экспорт PDF"
          >
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>Экспорт</Text>
          </TouchableOpacity>
        </View>

        {/* Панель масштабирования - показывается только когда не добавляется текст */}
        {!isLoading && images.length > 0 && viewMode === 'pages' && !isAddingText && (
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomOut}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Уменьшить"
            >
              <Ionicons name="remove" size={20} color="#8B6F5F" />
            </TouchableOpacity>
            
            <View style={styles.zoomLevel}>
              <Text style={styles.zoomLevelText}>{Math.round(zoomLevel * 100)}%</Text>
            </View>
            
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomIn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Увеличить"
            >
              <Ionicons name="add" size={20} color="#8B6F5F" />
            </TouchableOpacity>
            
            {/* Счетчик страниц */}
            <View style={styles.pageCounter}>
              <Text style={styles.pageCounterText}>
                {currentPage} / {totalPages}
              </Text>
            </View>
          </View>
        )}

        {/* Панель редактирования текста - показывается только когда добавляется текст */}
        {!isLoading && ((viewMode === 'pages' && images.length > 0) || viewMode === 'cover') && isAddingText && currentTextAnnotation && (
          <View style={styles.textEditControlsPanel}>
            {/* Кнопка цвета */}
            <TouchableOpacity
              style={styles.textEditControlButton}
              onPress={handleColorButtonPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Изменить цвет текста"
            >
              <View style={[styles.textColorPreview, { backgroundColor: currentTextAnnotation.color || '#000000' }]} />
              <Text style={styles.textEditControlButtonText}>Цвет</Text>
            </TouchableOpacity>
            
            {/* Кнопка размера */}
            <TouchableOpacity
              style={styles.textEditControlButton}
              onPress={handleFontSizeButtonPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Изменить размер шрифта"
            >
              <Ionicons name="text-outline" size={18} color="#8B6F5F" />
              <Text style={styles.textEditControlButtonText}>{currentTextAnnotation.fontSize || 16}px</Text>
            </TouchableOpacity>
            
            {/* Кнопка шрифта */}
            <TouchableOpacity
              style={styles.textEditControlButton}
              onPress={handleFontButtonPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Изменить шрифт"
            >
              <Ionicons name="brush-outline" size={18} color="#8B6F5F" />
              <Text style={styles.textEditControlButtonText} numberOfLines={1}>
                {currentTextAnnotation.fontFamily ? 
                  (currentTextAnnotation.fontFamily === 'default' ? 'Системный' : currentTextAnnotation.fontFamily) : 
                  'Системный'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Image Viewer или Cover Viewer */}
        <View style={styles.pdfContainer}>
          {viewMode === 'cover' ? (
            <CoverViewer
              albumId={coverType || albumId}
              category={celebration}
              coverType={coverType}
              annotations={coverAnnotations}
              onAnnotationAdd={handleCoverAnnotationAdd}
              onAnnotationUpdate={handleCoverAnnotationUpdate}
              onAnnotationDelete={handleCoverAnnotationDelete}
              isEditing={isEditing}
              currentTool={currentTool}
              onToolReset={handleToolReset}
              onTextEditingStateChange={handleTextEditingStateChange}
              annotationsRef={annotationsRef}
            />
          ) : isLoading ? (
            <PdfSkeletonLoader />
          ) : images.length > 0 ? (
            <ImageViewer
              images={images}
              albumName={albumName || getCelebrationTitle(celebration || '')}
              onPageChange={handlePageChange}
              onError={handleError}
              annotations={annotations}
              onAnnotationAdd={handleAnnotationAdd}
              onAnnotationUpdate={handleAnnotationUpdate}
              onAnnotationDelete={handleAnnotationDelete}
              isEditing={isEditing}
              currentTool={currentTool}
              onPageDuplicate={handlePageDuplicate}
              onPageDelete={handlePageDelete}
              onToolReset={handleToolReset}
              onTextEditingStateChange={handleTextEditingStateChange}
              annotationsRef={annotationsRef}
              zoomLevel={zoomLevel}
            />
          ) : (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconContainer}>
                <Ionicons name="image-outline" size={64} color="#D4C4B5" />
              </View>
              <Text style={styles.errorTitle}>Изображения не найдены</Text>
              <Text style={styles.errorText}>
                Не удалось загрузить изображения. Проверьте подключение и попробуйте снова.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadImagesData}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Попробовать снова</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Нижняя панель инструментов */}
        <View style={styles.bottomPanel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolsContainer}
            style={styles.toolsScrollView}
          >
            <TouchableOpacity
              style={[
                styles.toolButton,
                isEditing && styles.toolButtonActive,
                !isEditing && styles.toolButtonPrimary
              ]}
              onPress={handleToggleEdit}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isEditing ? "Завершить редактирование" : "Начать редактирование"}
            >
              <View style={styles.toolIconContainer}>
                <Ionicons 
                  name={isEditing ? "checkmark-circle" : "create-outline"} 
                  size={22} 
                  color={isEditing ? '#FFFFFF' : '#C9A89A'} 
                />
              </View>
              <Text 
                style={[styles.toolButtonText, isEditing && styles.toolButtonTextActive]}
                numberOfLines={1}
              >
                {isEditing ? 'Готово' : 'Редактировать'}
              </Text>
            </TouchableOpacity>

            {isEditing && (
              <>
                <TouchableOpacity
                  style={[
                    styles.toolButton,
                    viewMode === 'cover' && styles.toolButtonActive
                  ]}
                  onPress={handleViewModeToggle}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={viewMode === 'cover' ? "Переключить на страницы" : "Переключить на обложку"}
                >
                  <View style={styles.toolIconContainer}>
                    <Ionicons 
                      name={viewMode === 'cover' ? "book-outline" : "book"} 
                      size={22} 
                      color={viewMode === 'cover' ? '#FFFFFF' : '#8B6F5F'} 
                    />
                  </View>
                  <Text 
                    style={[styles.toolButtonText, viewMode === 'cover' && styles.toolButtonTextActive]}
                    numberOfLines={1}
                  >
                    Обложка
                  </Text>
                </TouchableOpacity>

                {viewMode === 'pages' && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.toolButton,
                        currentTool === 'text' && styles.toolButtonActive
                      ]}
                      onPress={() => handleToolSelect('text')}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Добавить текст"
                    >
                      <View style={styles.toolIconContainer}>
                        <Ionicons 
                          name="text-outline" 
                          size={22} 
                          color={currentTool === 'text' ? '#FFFFFF' : '#8B6F5F'} 
                        />
                      </View>
                      <Text 
                        style={[styles.toolButtonText, currentTool === 'text' && styles.toolButtonTextActive]}
                        numberOfLines={1}
                      >
                        Текст
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.toolButton,
                        currentTool === 'image' && styles.toolButtonActive
                      ]}
                      onPress={() => handleToolSelect('image')}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Добавить фото"
                    >
                      <View style={styles.toolIconContainer}>
                        <Ionicons 
                          name="image-outline" 
                          size={22} 
                          color={currentTool === 'image' ? '#FFFFFF' : '#8B6F5F'} 
                        />
                      </View>
                      <Text 
                        style={[styles.toolButtonText, currentTool === 'image' && styles.toolButtonTextActive]}
                        numberOfLines={1}
                      >
                        Фото
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {viewMode === 'cover' && (
                  <TouchableOpacity
                    style={[
                      styles.toolButton,
                      currentTool === 'text' && styles.toolButtonActive
                    ]}
                    onPress={() => handleToolSelect('text')}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Добавить текст"
                  >
                    <View style={styles.toolIconContainer}>
                      <Ionicons 
                        name="text-outline" 
                        size={22} 
                        color={currentTool === 'text' ? '#FFFFFF' : '#8B6F5F'} 
                      />
                    </View>
                    <Text 
                      style={[styles.toolButtonText, currentTool === 'text' && styles.toolButtonTextActive]}
                      numberOfLines={1}
                    >
                      Текст
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Animated.View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0EB',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  albumTitle: {
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
  },
  pageInfo: {
    fontSize: 12,
    color: '#9B8E7F',
    marginTop: 4,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C9A89A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0EB',
    gap: 20,
  },
  pageCounter: {
    marginLeft: 'auto',
    backgroundColor: '#C9A89A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  pageCounterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  zoomButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  zoomLevel: {
    backgroundColor: '#C9A89A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  zoomLevelText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  textEditControlsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0EB',
    gap: 20,
  },
  textEditControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
    minWidth: 80,
  },
  textColorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8D5C7',
  },
  textEditControlButtonText: {
    fontSize: 14,
    color: '#8B6F5F',
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  textEditControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flex: 1,
  },
  textControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  colorPreviewButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8D5C7',
  },
  textControlButtonText: {
    fontSize: 12,
    color: '#8B6F5F',
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 40,
    margin: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F5F0EB',
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  errorTitle: {
    fontSize: 22,
    color: '#8B6F5F',
    marginBottom: 12,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#9B8E7F',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#C9A89A',
    borderRadius: 20,
    gap: 8,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  bottomPanel: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F5F0EB',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingHorizontal: 20,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  toolsScrollView: {
    flexGrow: 0,
  },
  toolsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 12,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    minHeight: 52,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toolButtonPrimary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9A89A',
    borderWidth: 2,
  },
  toolButtonActive: {
    backgroundColor: '#C9A89A',
    borderColor: '#C9A89A',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toolIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolButtonText: {
    fontSize: 14,
    color: '#8B6F5F',
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  toolButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});