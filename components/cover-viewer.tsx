import { getAlbumTemplateById } from '@/albums';
import { useMediaLibraryPermission } from '@/components/media-library-permission-provider';
import { getCoverImageUris } from '@/utils/coverImagesLoader';
import { getCoverPdfForExport } from '@/utils/coverPdfMapping';
import { createId } from '@/utils/id';
import { getImagePickerImagesMediaTypes } from '@/utils/image-picker-media-types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Keyboard,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import PdfAnnotations, { type Annotation, PdfAnnotationsRef } from './pdf-annotations';
import PdfSkeletonLoader from './pdf-skeleton-loader';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TEXT_ANNOTATION_DEFAULT_WIDTH = 200;
const TEXT_ANNOTATION_DEFAULT_HEIGHT = 40;
const TEXT_EDITING_MIN_HEIGHT = 50;
const TEXT_EDITING_ACTIONS_HEIGHT = 36;
const TEXT_EDITING_ACTIONS_MARGIN_TOP = 8;
const TEXT_EDITING_EXTRA_VERTICAL_PADDING = 16;
const TEXT_EDITING_ESTIMATED_HEIGHT =
  TEXT_EDITING_MIN_HEIGHT +
  TEXT_EDITING_ACTIONS_MARGIN_TOP +
  TEXT_EDITING_ACTIONS_HEIGHT +
  TEXT_EDITING_EXTRA_VERTICAL_PADDING;

const KEYBOARD_AVOID_MARGIN = 12;

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

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
  onToolDeactivate?: () => void; // Мягкий сброс (только выключить выбранный инструмент)
  onTextEditingStateChange?: (isEditing: boolean, annotationId: string | null) => void;
  annotationsRef?: React.RefObject<PdfAnnotationsRef>;
  onViewportChange?: (viewport: { width: number; height: number }) => void; // Для точного экспорта
  defaultTextStyle?: { color?: string; fontSize?: number; fontFamily?: string };
  firstPageImage?: string; // Первое изображение из массива images для категорий pregnancy, kids, diary
  getLastFontFamily?: () => string | undefined; // Мгновенный доступ к последнему шрифту
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
  onToolDeactivate,
  onTextEditingStateChange,
  annotationsRef: externalAnnotationsRef,
  onViewportChange,
  defaultTextStyle,
  firstPageImage,
  getLastFontFamily,
}: CoverViewerProps) {
  const [lastTextStyle, setLastTextStyle] = useState<{ color?: string; fontSize?: number; fontFamily?: string } | null>(null);

  // Загружаем последние настройки текста при монтировании (шрифт — из отдельного ключа)
  useEffect(() => {
    const loadLastTextStyle = async () => {
      try {
        const [saved, fontRaw] = await Promise.all([
          AsyncStorage.getItem('@last_text_style'),
          AsyncStorage.getItem('@last_text_font_family'),
        ]);
        if (saved) {
          const parsed = JSON.parse(saved) as { color?: string; fontSize?: number; fontFamily?: string };
          const savedFont = typeof fontRaw === 'string' && fontRaw ? fontRaw : undefined;
          setLastTextStyle({
            ...parsed,
            fontFamily: parsed.fontFamily ?? savedFont,
          });
        }
      } catch (error) {
        console.error('Error loading last text style:', error);
      }
    };
    loadLastTextStyle();
  }, []);

  // Сохраняем настройки текста при их изменении (сохраняем fontFamily из storage, если не задан явно)
  useEffect(() => {
    const saveLastTextStyle = async () => {
      if (defaultTextStyle && (defaultTextStyle.color || defaultTextStyle.fontSize || defaultTextStyle.fontFamily)) {
        let existingFont: string | undefined;
        try {
          const raw = await AsyncStorage.getItem('@last_text_style');
          if (raw) existingFont = (JSON.parse(raw) as { fontFamily?: string }).fontFamily;
        } catch (_) {}
        const newStyle = {
          color: defaultTextStyle.color,
          fontSize: defaultTextStyle.fontSize,
          fontFamily: defaultTextStyle.fontFamily ?? existingFont,
        };
        setLastTextStyle(newStyle);
        if (newStyle.fontFamily) {
          await AsyncStorage.setItem('@last_text_font_family', newStyle.fontFamily);
        }
        try {
          await AsyncStorage.setItem('@last_text_style', JSON.stringify(newStyle));
        } catch (error) {
          console.error('Error saving last text style:', error);
        }
      }
    };
    saveLastTextStyle();
  }, [defaultTextStyle]);
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const internalAnnotationsRef = useRef<PdfAnnotationsRef | null>(null);
  const annotationsRef = externalAnnotationsRef || internalAnnotationsRef;
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  });
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const pageShiftY = useRef(new Animated.Value(0)).current;
  const { ensureMediaLibraryPermission } = useMediaLibraryPermission();

  useEffect(() => {
    const loadCoverImages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Если передано изображение первой страницы обложки, используем его напрямую
        if (firstPageImage) {
          setCoverImages([firstPageImage]);
          setCurrentPage(0);
          setIsLoading(false);
          return;
        }

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
  }, [albumId, category, coverType, firstPageImage]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event: any) => {
      const height = event?.endCoordinates?.height ?? 0;
      setKeyboardHeight(typeof height === 'number' ? height : 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isTextEditing || !editingAnnotationId || keyboardHeight <= 0) {
      Animated.timing(pageShiftY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }

    const activeAnnotation = annotations.find(
      ann => ann.id === editingAnnotationId && ann.page === 'cover'
    );
    if (!activeAnnotation) return;

    const editorBottomY = activeAnnotation.y + TEXT_EDITING_ESTIMATED_HEIGHT;
    const visibleBottomY = viewportSize.height - keyboardHeight - KEYBOARD_AVOID_MARGIN;
    const requiredShift = Math.max(0, editorBottomY - visibleBottomY);
    const clampedShift = clamp(requiredShift, 0, viewportSize.height);

    Animated.timing(pageShiftY, {
      toValue: -clampedShift,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isTextEditing, editingAnnotationId, keyboardHeight, viewportSize.height, annotations, pageShiftY]);

  const handleEditingStateChange = (isEditing: boolean, annotationId: string | null) => {
    setIsTextEditing(isEditing);
    setEditingAnnotationId(annotationId);
    // Передаем состояние редактирования в родительский компонент
    onTextEditingStateChange?.(isEditing, annotationId);
  };

  const handlePickImage = async (x: number, y: number) => {
    try {
      const hasPermission = await ensureMediaLibraryPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: getImagePickerImagesMediaTypes(),
        allowsEditing: false,
        // Важно: не ухудшаем качество пользовательских фото
        quality: 1,
      });

      if (!result.canceled && result.assets[0] && onAnnotationAdd) {
        const maxZIndex = annotations.length > 0 
          ? Math.max(...annotations.map(ann => ann.zIndex), 0)
          : 0;
        const defaultSize = 115;
        const proposedX = x - defaultSize / 2;
        const proposedY = y - defaultSize / 2;
        const nextX = clamp(proposedX, 0, viewportSize.width - defaultSize);
        const nextY = clamp(proposedY, 0, viewportSize.height - defaultSize);
        const newAnnotation: Annotation = {
          id: createId('ann'),
          type: 'image',
          x: nextX,
          y: nextY,
          width: defaultSize,
          height: defaultSize,
          imageUri: result.assets[0].uri,
          zIndex: maxZIndex + 1,
          page: 'cover',
        };
        onAnnotationAdd(newAnnotation);
        // Сбрасываем инструмент после добавления изображения
        onToolReset();
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleImagePress = (event: any) => {
    // Если редактируется текст — тап по пустому месту должен просто закрыть клавиатуру,
    // а редактирование оставить (чтобы можно было нажать галочку после)
    if (isTextEditing) {
      Keyboard.dismiss();
      return;
    }

    if (!isEditing || !currentTool) return;

    const { locationX, locationY } = event.nativeEvent || event;
    
    if (currentTool === 'text') {
      const maxZIndex = annotations.length > 0 
        ? Math.max(...annotations.map(ann => ann.zIndex), 0)
        : 0;

      const proposedX = locationX - TEXT_ANNOTATION_DEFAULT_WIDTH / 2;
      const proposedY = locationY - TEXT_ANNOTATION_DEFAULT_HEIGHT / 2;
      const nextX = clamp(proposedX, 0, viewportSize.width - TEXT_ANNOTATION_DEFAULT_WIDTH);
      const nextY = clamp(proposedY, 0, viewportSize.height - TEXT_EDITING_ESTIMATED_HEIGHT);

      const applyStyle = async () => {
        let savedStyle: { color?: string; fontSize?: number; fontFamily?: string } | null = null;
        let savedFont: string | null = null;
        try {
          const [raw, fontRaw] = await Promise.all([
            AsyncStorage.getItem('@last_text_style'),
            AsyncStorage.getItem('@last_text_font_family'),
          ]);
          if (raw) savedStyle = JSON.parse(raw) as any;
          if (fontRaw && typeof fontRaw === 'string') savedFont = fontRaw;
        } catch (_) {}
        const color = savedStyle?.color ?? defaultTextStyle?.color ?? lastTextStyle?.color ?? '#000000';
        const fontSize = savedStyle?.fontSize ?? defaultTextStyle?.fontSize ?? lastTextStyle?.fontSize ?? 16;
        const fontFamily = getLastFontFamily?.() ?? savedStyle?.fontFamily ?? savedFont ?? defaultTextStyle?.fontFamily ?? lastTextStyle?.fontFamily ?? 'default';

        const newAnnotation: Annotation = {
          id: createId('ann'),
          type: 'text',
          x: nextX,
          y: nextY,
          width: TEXT_ANNOTATION_DEFAULT_WIDTH,
          height: TEXT_ANNOTATION_DEFAULT_HEIGHT,
          content: 'Новый текст',
          color,
          fontSize,
          fontFamily: fontFamily || 'default',
          zIndex: maxZIndex + 1,
          page: 'cover',
        };
        onAnnotationAdd(newAnnotation);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            annotationsRef.current?.startEditing?.(newAnnotation.id);
          });
        });
        onToolReset();
      };
      applyStyle();
    } else if (currentTool === 'image') {
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
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const pageIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentPage(pageIndex);
        }}
        style={styles.scrollView}
      >
        {coverImages.map((imageUri, index) => (
          <View key={index} style={styles.imageContainer}>
            <Animated.View
              style={[
                styles.imageWrapper,
                { transform: [{ translateY: pageShiftY }] },
              ]}
            >
              <TouchableOpacity
                style={styles.imageWrapperInner}
                activeOpacity={1}
                onPress={handleImagePress}
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  if (!width || !height) return;
                  setViewportSize(prev => {
                    if (prev.width === width && prev.height === height) return prev;
                    return { width, height };
                  });
                  onViewportChange?.({ width, height });
                }}
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
                  onToolDeactivate={onToolDeactivate}
                  onEditingStateChange={handleEditingStateChange}
                  viewportWidth={viewportSize.width}
                  viewportHeight={viewportSize.height}
                />
              </TouchableOpacity>
            </Animated.View>
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
  imageWrapperInner: {
    flex: 1,
    position: 'relative',
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

