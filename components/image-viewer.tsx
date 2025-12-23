import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  TouchableOpacity,
  Modal,
  Alert,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import PdfAnnotations, { Annotation, PdfAnnotationsRef } from './pdf-annotations';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerProps {
  images: string[]; // Массив URI изображений
  albumName: string;
  onPageChange?: (page: number, total: number) => void;
  onError?: (error: any) => void;
  annotations?: Annotation[];
  onAnnotationAdd?: (annotation: Annotation) => void;
  onAnnotationUpdate?: (id: string, annotation: Partial<Annotation>) => void;
  onAnnotationDelete?: (id: string) => void;
  isEditing?: boolean;
  currentTool?: 'text' | 'image' | 'drawing' | null;
  onPageDuplicate?: (pageIndex: number) => void;
  onPageDelete?: (pageIndex: number) => void;
  onToolReset?: () => void; // Callback для сброса инструмента
  onTextEditingStateChange?: (isEditing: boolean, annotationId: string | null) => void; // Callback для отслеживания состояния редактирования текста
  annotationsRef?: React.RefObject<PdfAnnotationsRef>; // Ref для доступа к методам PdfAnnotations
  zoomLevel?: number; // Уровень масштабирования
}

export default function ImageViewer({
  images,
  albumName,
  onPageChange,
  onError,
  annotations = [],
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  isEditing = false,
  currentTool = null,
  onPageDuplicate,
  onPageDelete,
  onToolReset,
  onTextEditingStateChange,
  annotationsRef: externalAnnotationsRef,
  zoomLevel = 1,
}: ImageViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [containerHeight, setContainerHeight] = useState(SCREEN_HEIGHT);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const internalAnnotationsRef = React.useRef<PdfAnnotationsRef | null>(null);
  const annotationsRef = externalAnnotationsRef || internalAnnotationsRef;
  const scrollViewRef = React.useRef<ScrollView>(null);
  const savedScrollPosition = useRef<number | null>(null);
  const keyboardHeight = useRef<number>(0);
  const currentScrollY = useRef<number>(0);

  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage, images.length);
    }
  }, [currentPage, images.length]);

  // Отслеживаем изменения клавиатуры
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        keyboardHeight.current = event.endCoordinates.height;
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        keyboardHeight.current = 0;
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Автоматическая прокрутка при открытии редактирования текста
  useEffect(() => {
    if (isTextEditing && editingAnnotationId && scrollViewRef.current) {
      // Находим аннотацию, которая редактируется
      const editingAnnotation = annotations.find(ann => ann.id === editingAnnotationId);
      
      if (editingAnnotation && editingAnnotation.page) {
        const pageNumber = typeof editingAnnotation.page === 'number' 
          ? editingAnnotation.page 
          : parseInt(editingAnnotation.page.toString()) || 1;
        
        // Вычисляем позицию аннотации относительно страницы
        const annotationY = editingAnnotation.y;
        const annotationHeight = editingAnnotation.height || 100;
        const annotationBottom = annotationY + annotationHeight;
        
        // Вычисляем, находится ли аннотация в нижней части экрана (где может перекрыть клавиатура)
        // Клавиатура обычно занимает около 250-350px внизу экрана
        const screenBottom = containerHeight;
        
        // Если аннотация находится в нижней части экрана (ниже 60% высоты), прокручиваем
        const threshold = screenBottom * 0.6;
        
        if (annotationBottom > threshold) {
          // Вычисляем нужную позицию прокрутки, чтобы аннотация была видна над клавиатурой
          // Прокручиваем так, чтобы аннотация была в верхней части видимой области
          const pageOffset = (pageNumber - 1) * containerHeight;
          // Прокручиваем так, чтобы аннотация была на 150px от верха видимой области
          const targetScrollY = pageOffset + Math.max(0, annotationY - 150);
          
          // Прокручиваем с небольшой задержкой, чтобы клавиатура успела открыться
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              y: targetScrollY,
              animated: true,
            });
          }, Platform.OS === 'ios' ? 200 : 400);
        }
      }
    } else if (!isTextEditing && savedScrollPosition.current !== null && scrollViewRef.current) {
      // Возвращаемся в исходное положение при закрытии редактирования
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: savedScrollPosition.current!,
          animated: true,
        });
        savedScrollPosition.current = null;
      }, Platform.OS === 'ios' ? 100 : 200);
    }
  }, [isTextEditing, editingAnnotationId, annotations, containerHeight]);


  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    currentScrollY.current = offsetY;
    setScrollY(offsetY); // Обновляем состояние для перерисовки отдельного слоя
    const page = Math.round(offsetY / containerHeight) + 1;
    const clampedPage = Math.max(1, Math.min(page, images.length));
    if (clampedPage !== currentPage && clampedPage >= 1 && clampedPage <= images.length) {
      setCurrentPage(clampedPage);
    }
  };

  const handleContainerLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && height !== containerHeight) {
      setContainerHeight(height);
    }
  };

  const handleImagePress = (x: number, y: number) => {
    // Если редактируется текст, закрываем редактирование и сбрасываем инструмент
    if (isTextEditing && annotationsRef.current) {
      annotationsRef.current?.closeEditing?.();
      setIsTextEditing(false);
      setEditingAnnotationId(null);
      // Сбрасываем инструмент после закрытия редактирования
      if (onToolReset) {
        onToolReset();
      }
      return;
    }

    // Если не в режиме редактирования или инструмент не выбран, ничего не делаем
    if (!isEditing || !currentTool) {
      return;
    }

    if (currentTool === 'text' && onAnnotationAdd) {
      const maxZIndex = annotations.length > 0 
        ? Math.max(...annotations.map(ann => ann.zIndex), 0)
        : 0;
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'text',
        x,
        y,
        width: 200,
        height: 40,
        content: 'Новый текст',
        color: '#000000',
        fontSize: 16,
        zIndex: maxZIndex + 1,
        page: currentPage,
      };
      onAnnotationAdd(newAnnotation);
      // Сбрасываем инструмент после добавления текста
      if (onToolReset) {
        onToolReset();
      }
    } else if (currentTool === 'image' && onAnnotationAdd) {
      // Открываем выбор изображения
      handlePickImage(x, y);
    }
  };

  const handleEditingStateChange = (isEditing: boolean, annotationId: string | null) => {
    // Сохраняем позицию прокрутки перед началом редактирования
    if (isEditing && !isTextEditing) {
      savedScrollPosition.current = currentScrollY.current;
    }
    
    setIsTextEditing(isEditing);
    setEditingAnnotationId(annotationId);
    // Передаем состояние редактирования в родительский компонент
    onTextEditingStateChange?.(isEditing, annotationId);
  };

  const handleImageLongPress = (pageIndex: number) => {
    setSelectedPageIndex(pageIndex);
    setShowPageMenu(true);
  };

  const handleDuplicatePage = () => {
    if (selectedPageIndex !== null && onPageDuplicate) {
      onPageDuplicate(selectedPageIndex);
      setShowPageMenu(false);
      setSelectedPageIndex(null);
    }
  };

  const handleDeletePage = () => {
    if (selectedPageIndex !== null && onPageDelete) {
      if (images.length <= 1) {
        Alert.alert(
          'Невозможно удалить',
          'Нельзя удалить последнюю страницу альбома',
          [{ text: 'OK' }]
        );
        setShowPageMenu(false);
        setSelectedPageIndex(null);
        return;
      }

      Alert.alert(
        'Удалить страницу?',
        'Вы уверены, что хотите удалить эту страницу? Это действие нельзя отменить.',
        [
          { text: 'Отмена', style: 'cancel', onPress: () => {
            setShowPageMenu(false);
            setSelectedPageIndex(null);
          }},
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: () => {
              onPageDelete(selectedPageIndex);
              setShowPageMenu(false);
              setSelectedPageIndex(null);
            },
          },
        ]
      );
    }
  };

  const handlePickImage = async (x: number, y: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && onAnnotationAdd) {
        const maxZIndex = annotations.length > 0 
          ? Math.max(...annotations.map(ann => ann.zIndex), 0)
          : 0;
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: 'image',
          x,
          y,
          width: 150,
          height: 150,
          imageUri: result.assets[0].uri,
          zIndex: maxZIndex + 1,
          page: currentPage,
        };
        onAnnotationAdd(newAnnotation);
        // Сбрасываем инструмент после добавления изображения
        if (onToolReset) {
          onToolReset();
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      if (onError) {
        onError(error);
      }
    }
  };

  const scrollToPage = (page: number) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: (page - 1) * containerHeight,
        animated: true,
      });
    }
  };

  if (images.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="image-outline" size={64} color="#D4C4B5" />
        <Text style={styles.errorText}>Изображения не найдены</Text>
      </View>
    );
  }

  return (
    <View 
      style={styles.container}
      onLayout={handleContainerLayout}
    >
      <ScrollView
        ref={scrollViewRef}
        pagingEnabled
        showsVerticalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={containerHeight}
        contentInsetAdjustmentBehavior="never"
        snapToAlignment="start"
        bounces={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {images.map((imageUri, index) => {
          const pageNumber = index + 1;
          // Фильтруем аннотации для текущей страницы
          // Исключаем редактируемый текст, так как он рендерится в отдельном слое
          const pageAnnotations = annotations.filter(
            (ann) => (ann.page || 1) === pageNumber && ann.id !== editingAnnotationId
          );
          
          // Определяем, редактируется ли текст на этой странице
          const isEditingOnThisPage = editingAnnotationId 
            ? annotations.some(ann => ann.id === editingAnnotationId && (ann.page || 1) === pageNumber)
            : false;

          return (
            <View 
              key={`page-${index}`} 
              style={[
                styles.pageContainer,
                { height: containerHeight },
                index === images.length - 1 && styles.lastPageContainer,
                // Используем очень высокий z-index для страницы с редактируемым текстом
                isEditingOnThisPage && {
                  zIndex: 10000,
                  elevation: 10000, // Для Android
                }
              ]}
            >
              <View style={styles.zoomContainer}>
                <TouchableOpacity
                  style={styles.imageContainer}
                  activeOpacity={1}
                  onPress={(e) => {
                    // Корректируем координаты с учетом масштаба
                    const { locationX, locationY } = e.nativeEvent;
                    handleImagePress(locationX / zoomLevel, locationY / zoomLevel);
                  }}
                  onLongPress={() => handleImageLongPress(index)}
                  delayLongPress={500}
                >
                  <View
                    style={{
                      width: SCREEN_WIDTH,
                      height: containerHeight,
                      justifyContent: 'center',
                      alignItems: 'center',
                      transform: [{ scale: zoomLevel }],
                    }}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.image}
                      contentFit="contain"
                      contentPosition="center"
                      transition={200}
                      cachePolicy="disk"
                      priority={index < 3 ? 'high' : 'normal'}
                    />
                  </View>
                </TouchableOpacity>

                {/* Аннотации для этой страницы */}
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: SCREEN_WIDTH,
                    height: containerHeight,
                    justifyContent: 'center',
                    alignItems: 'center',
                    transform: [{ scale: zoomLevel }],
                    pointerEvents: 'box-none', // Пропускаем события через этот контейнер
                    // Используем очень высокий z-index для страницы с редактируемым текстом
                    zIndex: isEditingOnThisPage ? 10000 : 1,
                    elevation: isEditingOnThisPage ? 10000 : 1, // Для Android
                  }}
                >
                  <PdfAnnotations
                    ref={pageNumber === currentPage && isEditing ? annotationsRef : null}
                    annotations={pageAnnotations}
                    onAnnotationAdd={onAnnotationAdd || (() => {})}
                    onAnnotationUpdate={onAnnotationUpdate || (() => {})}
                    onAnnotationDelete={onAnnotationDelete || (() => {})}
                    isEditing={isEditing}
                    currentTool={currentTool}
                    onEditingStateChange={handleEditingStateChange}
                    zoomLevel={zoomLevel}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Отдельный слой для редактируемого текста и кнопок поверх всех страниц */}
      {isTextEditing && editingAnnotationId && (() => {
        const editingAnnotation = annotations.find(ann => ann.id === editingAnnotationId);
        if (!editingAnnotation || editingAnnotation.type !== 'text' || !editingAnnotation.page) {
          return null;
        }

        const pageNumber = typeof editingAnnotation.page === 'number' 
          ? editingAnnotation.page 
          : parseInt(editingAnnotation.page.toString()) || 1;
        
        // Вычисляем позицию с учетом прокрутки
        const pageOffset = (pageNumber - 1) * containerHeight;
        const scrollOffset = scrollY;
        const relativeY = pageOffset - scrollOffset;

        return (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999999,
              elevation: 999999, // Для Android
              pointerEvents: 'box-none', // Пропускаем события, кроме редактируемого текста
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: relativeY,
                left: 0,
                width: SCREEN_WIDTH,
                height: containerHeight,
                transform: [{ scale: zoomLevel }],
                pointerEvents: 'box-none',
              }}
            >
              <PdfAnnotations
                ref={annotationsRef}
                annotations={[editingAnnotation]}
                onAnnotationAdd={() => {}}
                onAnnotationUpdate={onAnnotationUpdate || (() => {})}
                onAnnotationDelete={onAnnotationDelete || (() => {})}
                isEditing={isEditing}
                currentTool={currentTool}
                onEditingStateChange={handleEditingStateChange}
                zoomLevel={zoomLevel}
              />
            </View>
          </View>
        );
      })()}

      {/* Модальное окно с опциями страницы */}
      <Modal
        visible={showPageMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPageMenu(false);
          setSelectedPageIndex(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowPageMenu(false);
            setSelectedPageIndex(null);
          }}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Действия со страницей</Text>
            <Text style={styles.modalSubtitle}>
              Страница {selectedPageIndex !== null ? selectedPageIndex + 1 : ''}
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.duplicateButton]}
                onPress={handleDuplicatePage}
                activeOpacity={0.7}
              >
                <Ionicons name="copy-outline" size={24} color="#FFFFFF" />
                <Text style={styles.modalActionButtonText}>Дублировать</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalActionButton, styles.deleteButton]}
                onPress={handleDeletePage}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
                <Text style={styles.modalActionButtonText}>Удалить</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowPageMenu(false);
                setSelectedPageIndex(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingVertical: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  zoomContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  zoomWrapper: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lastPageContainer: {
    paddingBottom: 0,
    marginBottom: 0,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    maxWidth: SCREEN_WIDTH,
  },
  pageIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  pageIndicatorText: {
    backgroundColor: 'rgba(201, 168, 154, 0.95)',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    minWidth: 80,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
  },
  errorText: {
    fontSize: 16,
    color: '#9B8E7F',
    marginTop: 16,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
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
  modalActions: {
    gap: 12,
    marginBottom: 20,
  },
  modalActionButton: {
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
  duplicateButton: {
    backgroundColor: '#C9A89A',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
  },
  modalActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#9B8E7F',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
});

