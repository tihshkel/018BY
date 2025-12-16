import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import PdfAnnotations, { Annotation } from './pdf-annotations';
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
}: ImageViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [containerHeight, setContainerHeight] = useState(SCREEN_HEIGHT);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const annotationsRef = React.useRef<PdfAnnotationsRef | null>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage, images.length);
    }
  }, [currentPage, images.length]);


  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
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

    if (!isEditing || !currentTool) return;

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
    setIsTextEditing(isEditing);
    setEditingAnnotationId(annotationId);
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      >
        {images.map((imageUri, index) => {
          const pageNumber = index + 1;
          // Фильтруем аннотации для текущей страницы
          const pageAnnotations = annotations.filter(
            (ann) => (ann.page || 1) === pageNumber
          );

          return (
            <View 
              key={`page-${index}`} 
              style={[
                styles.pageContainer,
                { height: containerHeight },
                index === images.length - 1 && styles.lastPageContainer
              ]}
            >
              <TouchableOpacity
                style={styles.imageContainer}
                activeOpacity={1}
                onPress={(e) => {
                  const { locationX, locationY } = e.nativeEvent;
                  handleImagePress(locationX, locationY);
                }}
                onLongPress={() => handleImageLongPress(index)}
                delayLongPress={500}
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
              </TouchableOpacity>

              {/* Аннотации для этой страницы */}
              {pageAnnotations.length > 0 && (
                <PdfAnnotations
                  ref={annotationsRef}
                  annotations={pageAnnotations}
                  onAnnotationAdd={onAnnotationAdd || (() => {})}
                  onAnnotationUpdate={onAnnotationUpdate || (() => {})}
                  onAnnotationDelete={onAnnotationDelete || (() => {})}
                  isEditing={isEditing}
                  currentTool={currentTool}
                  onEditingStateChange={handleEditingStateChange}
                />
              )}
            </View>
          );
        })}
      </ScrollView>

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

