import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import PdfAnnotations, { type Annotation, PdfAnnotationsRef } from './pdf-annotations';
import PdfSkeletonLoader from './pdf-skeleton-loader';
import { getCoverPdfForExport } from '@/utils/coverPdfMapping';
import { getCoverImageUris } from '@/utils/coverImagesLoader';
import { getAlbumTemplateById } from '@/albums';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CoverViewerProps {
  albumId: string | null;
  category?: string;
  coverType?: string;
  annotations: Annotation[];
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
  isEditing: boolean;
  currentTool: 'text' | 'image' | 'drawing' | null;
  onToolReset: () => void;
  onTextEditingStateChange?: (isEditing: boolean, annotationId: string | null) => void;
  annotationsRef?: React.RefObject<PdfAnnotationsRef>;
}

export default function CoverViewer({
  albumId,
  category,
  coverType,
  annotations,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  isEditing,
  currentTool,
  onToolReset,
  onTextEditingStateChange,
  annotationsRef: externalAnnotationsRef,
}: CoverViewerProps) {
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const internalAnnotationsRef = useRef<PdfAnnotationsRef | null>(null);
  const annotationsRef = externalAnnotationsRef || internalAnnotationsRef;
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const loadCoverImages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!albumId) {
          setError('ID альбома не указан');
          setIsLoading(false);
          return;
        }

        // Определяем тип обложки (hard/soft) на основе coverType
        // Если coverType содержит 'soft' или 'пружина', используем 'soft', иначе 'hard'
        let coverTypeForPdf: 'hard' | 'soft' = 'hard';
        if (coverType) {
          const coverTypeLower = coverType.toLowerCase();
          if (coverTypeLower.includes('soft') || coverTypeLower.includes('пружина') || coverTypeLower.includes('a5')) {
            coverTypeForPdf = 'soft';
          }
        }

        // Получаем название папки развертки обложки
        const folderName = getCoverPdfForExport(albumId, category, coverTypeForPdf);
        
        if (!folderName) {
          // Если не найдена развертка, пытаемся получить через шаблон альбома
          const albumTemplate = getAlbumTemplateById(albumId);
          if (albumTemplate && albumTemplate.category) {
            const fallbackFolderName = getCoverPdfForExport(albumId, albumTemplate.category, coverTypeForPdf);
            if (fallbackFolderName) {
              const images = await getCoverImageUris(fallbackFolderName);
              if (images && images.length > 0) {
                setCoverImages(images);
                setIsLoading(false);
                return;
              }
            }
          }
          setError('Развертка обложки не найдена');
          setIsLoading(false);
          return;
        }

        // Загружаем изображения из папки
        const images = await getCoverImageUris(folderName);
        if (images && images.length > 0) {
          setCoverImages(images);
          setCurrentPage(0);
        } else {
          setError('Изображения развертки обложки не найдены');
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading cover images:', err);
        setError('Ошибка загрузки развертки обложки');
        setIsLoading(false);
      }
    };

    loadCoverImages();
  }, [albumId, category, coverType]);

  const handleEditingStateChange = (isEditing: boolean, annotationId: string | null) => {
    setIsTextEditing(isEditing);
    setEditingAnnotationId(annotationId);
    // Передаем состояние редактирования в родительский компонент
    onTextEditingStateChange?.(isEditing, annotationId);
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
          x: x - 100,
          y: y - 100,
          width: 200,
          height: 200,
          imageUri: result.assets[0].uri,
          zIndex: maxZIndex + 1,
          page: 'cover',
        };
        onAnnotationAdd(newAnnotation);
        // Сбрасываем инструмент после добавления изображения
        if (onToolReset) {
          onToolReset();
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleImagePress = (event: any) => {
    // Если редактируется текст, закрываем редактирование и сбрасываем инструмент
    if (isTextEditing && annotationsRef.current) {
      annotationsRef.current?.closeEditing?.();
      setIsTextEditing(false);
      setEditingAnnotationId(null);
      if (onToolReset) {
        onToolReset();
      }
      return;
    }

    if (!isEditing || !currentTool) return;

    const { locationX, locationY } = event.nativeEvent || event;
    
    if (currentTool === 'text' && onAnnotationAdd) {
      const maxZIndex = annotations.length > 0 
        ? Math.max(...annotations.map(ann => ann.zIndex), 0)
        : 0;
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'text',
        x: locationX - 100,
        y: locationY - 20,
        width: 200,
        height: 40,
        content: 'Новый текст',
        color: '#000000',
        fontSize: 16,
        zIndex: maxZIndex + 1,
        page: 'cover',
      };
      onAnnotationAdd(newAnnotation);
      // Сбрасываем инструмент после добавления текста
      if (onToolReset) {
        onToolReset();
      }
    } else if (currentTool === 'image' && onAnnotationAdd) {
      // Открываем выбор изображения
      handlePickImage(locationX, locationY);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <PdfSkeletonLoader />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconContainer}>
          <Ionicons name="book-outline" size={64} color="#D4C4B5" />
        </View>
        <Text style={styles.errorTitle}>Развертка обложки не найдена</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (coverImages.length === 0 && !isLoading) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconContainer}>
          <Ionicons name="book-outline" size={64} color="#D4C4B5" />
        </View>
        <Text style={styles.errorTitle}>Развертка обложки недоступна</Text>
        <Text style={styles.errorText}>
          Для выбранной обложки нет доступной развертки
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const pageIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentPage(pageIndex);
        }}
        style={styles.scrollView}
      >
        {coverImages.map((imageUri, index) => (
          <View key={index} style={styles.imageContainer}>
            <TouchableOpacity
              style={styles.imageWrapper}
              activeOpacity={1}
              onPress={handleImagePress}
            >
              <Image
                source={{ uri: imageUri }}
                style={styles.coverImage}
                contentFit="contain"
                transition={200}
              />
              
              {/* Аннотации поверх изображения */}
              <PdfAnnotations
                ref={editingAnnotationId && annotations.some(ann => ann.id === editingAnnotationId && ann.page === 'cover') ? annotationsRef : null}
                annotations={annotations.filter(ann => ann.page === 'cover')}
                onAnnotationAdd={onAnnotationAdd}
                onAnnotationUpdate={onAnnotationUpdate}
                onAnnotationDelete={onAnnotationDelete}
                isEditing={isEditing}
                currentTool={currentTool}
                onEditingStateChange={handleEditingStateChange}
              />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      
      {/* Индикатор страниц */}
      {coverImages.length > 1 && (
        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>
            {currentPage + 1} / {coverImages.length}
          </Text>
        </View>
      )}
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
  imageContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    position: 'relative',
  },
  imageWrapper: {
    flex: 1,
    position: 'relative',
    margin: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F0EB',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(139, 111, 95, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pageIndicatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
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
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
});

