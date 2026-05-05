import { useMediaLibraryPermission } from '@/components/media-library-permission-provider';
import { createId } from '@/utils/id';
import { getImagePickerImagesMediaTypes } from '@/utils/image-picker-media-types';
import { snapYToNearestTemplateLine } from '@/utils/lineGuides';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import PdfAnnotations, { Annotation, PdfAnnotationsRef } from './pdf-annotations';

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

function mapScreenPointToUnscaledPagePoint(params: {
  locationX: number;
  locationY: number;
  viewportWidth: number;
  viewportHeight: number;
  zoomLevel: number;
}) {
  const { locationX, locationY, viewportWidth, viewportHeight, zoomLevel } = params;
  const safeZoom = zoomLevel > 0 ? zoomLevel : 1;
  const centerX = viewportWidth / 2;
  const centerY = viewportHeight / 2;

  return {
    x: centerX + (locationX - centerX) / safeZoom,
    y: centerY + (locationY - centerY) / safeZoom,
  };
}

interface ImageViewerProps {
  images: string[]; // Массив URI изображений
  albumName: string;
  lineGuideId?: string;
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
  onToolDeactivate?: () => void; // Мягкий сброс (только выключить выбранный инструмент)
  onTextEditingStateChange?: (isEditing: boolean, annotationId: string | null) => void; // Callback для отслеживания состояния редактирования текста
  annotationsRef?: React.RefObject<PdfAnnotationsRef>; // Ref для доступа к методам PdfAnnotations
  zoomLevel?: number; // Уровень масштабирования
  onViewportChange?: (viewport: { width: number; height: number }) => void; // Для точного экспорта (координаты)
  defaultTextStyle?: { color?: string; fontSize?: number; fontFamily?: string };
  getLastFontFamily?: () => string | undefined; // Мгновенный доступ к последнему шрифту (без ожидания AsyncStorage)
}

export default function ImageViewer({
  images,
  albumName,
  lineGuideId,
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
  onToolDeactivate,
  onTextEditingStateChange,
  annotationsRef: externalAnnotationsRef,
  zoomLevel = 1,
  onViewportChange,
  defaultTextStyle,
  getLastFontFamily,
}: ImageViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [containerHeight, setContainerHeight] = useState(SCREEN_HEIGHT);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isInteractingWithAnnotation, setIsInteractingWithAnnotation] = useState(false);
  const [lastTextStyle, setLastTextStyle] = useState<{ color?: string; fontSize?: number; fontFamily?: string } | null>(null);
  const internalAnnotationsRef = React.useRef<PdfAnnotationsRef | null>(null);
  const annotationsRef = externalAnnotationsRef || internalAnnotationsRef;
  const { ensureMediaLibraryPermission } = useMediaLibraryPermission();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const flatListRef = React.useRef<FlatList<string>>(null);
  const pageShiftY = React.useRef(new Animated.Value(0)).current;

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

  // Синхронизируем lastTextStyle с defaultTextStyle от родителя (edit-album обновляет его при смене цвета/шрифта/размера)
  useEffect(() => {
    if (defaultTextStyle && (defaultTextStyle.color != null || defaultTextStyle.fontSize != null || defaultTextStyle.fontFamily != null)) {
      setLastTextStyle(prev => ({
        ...(prev || {}),
        ...defaultTextStyle,
      }));
    }
  }, [defaultTextStyle?.color, defaultTextStyle?.fontSize, defaultTextStyle?.fontFamily]);

  const annotationsByPage = useMemo(() => {
    const map = new Map<number, Annotation[]>();
    for (const ann of annotations) {
      const page = typeof ann.page === 'number' ? ann.page : Number(ann.page || 1);
      if (!Number.isFinite(page) || page < 1) continue;
      const bucket = map.get(page) || [];
      bucket.push(ann);
      if (!map.has(page)) map.set(page, bucket);
    }
    return map;
  }, [annotations]);

  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage, images.length);
    }
  }, [currentPage, images.length]);

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
    // Если редактирование закрыто — возвращаем страницу на место
    if (!isTextEditing || !editingAnnotationId || keyboardHeight <= 0) {
      Animated.timing(pageShiftY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }

    const activeAnnotation = annotations.find(
      ann => ann.id === editingAnnotationId && (ann.page || 1) === currentPage
    );
    if (!activeAnnotation) return;

    const editorBottomY = activeAnnotation.y + TEXT_EDITING_ESTIMATED_HEIGHT;
    const visibleBottomY = containerHeight - keyboardHeight - KEYBOARD_AVOID_MARGIN;
    const requiredShift = Math.max(0, editorBottomY - visibleBottomY);
    const clampedShift = clamp(requiredShift, 0, containerHeight);

    Animated.timing(pageShiftY, {
      toValue: -clampedShift,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isTextEditing, editingAnnotationId, keyboardHeight, containerHeight, annotations, currentPage, pageShiftY]);


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
      onViewportChange?.({ width: SCREEN_WIDTH, height });
    }
  };

  const handleImagePress = (x: number, y: number, tappedPage?: number) => {
    const pageForAnnotation = tappedPage ?? currentPage;
    // Если редактируется текст — тап по пустому месту должен просто закрыть клавиатуру,
    // а редактирование оставить (чтобы можно было нажать галочку после)
    if (isTextEditing) {
      Keyboard.dismiss();
      return;
    }

    // Если мы в режиме редактирования, но инструмент не выбран — тап по пустому месту
    // должен закрывать выделение (рамку/ручки/корзину) у фото/аннотаций.
    if (isEditing && !currentTool) {
      annotationsRef.current?.clearSelection?.();
      return;
    }

    if (!isEditing || !currentTool) return;

    if (currentTool === 'text' && onAnnotationAdd) {
      const maxZIndex = annotations.length > 0 
        ? Math.max(...annotations.map(ann => ann.zIndex), 0)
        : 0;

      const viewportWidth = SCREEN_WIDTH;
      const viewportHeight = containerHeight;
      const proposedX = x - TEXT_ANNOTATION_DEFAULT_WIDTH / 2;
      const proposedY = y - TEXT_ANNOTATION_DEFAULT_HEIGHT / 2;
      const nextX = clamp(proposedX, 0, viewportWidth - TEXT_ANNOTATION_DEFAULT_WIDTH);
      const clampedY = clamp(proposedY, 0, viewportHeight - TEXT_EDITING_ESTIMATED_HEIGHT);
      const snappedY = snapYToNearestTemplateLine({
        lineGuideId,
        page: pageForAnnotation,
        y: clampedY,
        viewportHeight,
      });
      const nextY = clamp(snappedY, 0, viewportHeight - TEXT_EDITING_ESTIMATED_HEIGHT);

      const isPregnancyFirstPage = lineGuideId && (lineGuideId === 'pregnancy_60' || String(lineGuideId).includes('pregnancy')) && pageForAnnotation === 1;

      // Всегда берём последний сохранённый стиль из AsyncStorage в момент тапа
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
        const fontSize = isPregnancyFirstPage
          ? (savedStyle?.fontSize ?? defaultTextStyle?.fontSize ?? lastTextStyle?.fontSize ?? 18)
          : (savedStyle?.fontSize ?? defaultTextStyle?.fontSize ?? lastTextStyle?.fontSize ?? 16);
        const fontFamily = (getLastFontFamily?.() ?? savedStyle?.fontFamily ?? savedFont ?? defaultTextStyle?.fontFamily ?? lastTextStyle?.fontFamily)
          ?? (isPregnancyFirstPage ? 'Nefelibata-PenSans' : 'default');

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
          page: pageForAnnotation,
        };
        onAnnotationAdd(newAnnotation);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            annotationsRef.current?.startEditing?.(newAnnotation.id);
          });
        });
        if (onToolReset) onToolReset();
      };
      applyStyle();
    } else if (currentTool === 'image' && onAnnotationAdd) {
      handlePickImage(x, y, pageForAnnotation);
    }
  };

  const handleEditingStateChange = (isEditing: boolean, annotationId: string | null) => {
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
      const duplicatedPage = selectedPageIndex + 2;
      onPageDuplicate(selectedPageIndex);
      setShowPageMenu(false);
      setSelectedPageIndex(null);
      setTimeout(() => {
        setCurrentPage(duplicatedPage);
        scrollToPage(duplicatedPage);
      }, 150);
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

  const handlePickImage = async (x: number, y: number, page: number = currentPage) => {
    try {
      const hasPermission = await ensureMediaLibraryPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: getImagePickerImagesMediaTypes(),
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0] && onAnnotationAdd) {
        const maxZIndex = annotations.length > 0 
          ? Math.max(...annotations.map(ann => ann.zIndex), 0)
          : 0;
        const asset = result.assets[0];
        const origW = asset.width || 120;
        const origH = asset.height || 120;
        const maxSide = 150;
        const scale = maxSide / Math.max(origW, origH);
        const fitW = Math.round(origW * scale);
        const fitH = Math.round(origH * scale);
        const viewportWidth = SCREEN_WIDTH;
        const viewportHeight = containerHeight;
        const nextX = clamp(x, 0, viewportWidth - fitW);
        const nextY = clamp(y, 0, viewportHeight - fitH);
        const newAnnotation: Annotation = {
          id: createId('ann'),
          type: 'image',
          x: nextX,
          y: nextY,
          width: fitW,
          height: fitH,
          imageUri: asset.uri,
          zIndex: maxZIndex + 1,
          page,
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
    if (!flatListRef.current) return;
    flatListRef.current.scrollToOffset({
      offset: (page - 1) * containerHeight,
      animated: true,
    });
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
      {/* paging + disableIntervalMomentum (RN ScrollView): одна страница за жест, без «перескока» на 3–4 из‑за инерции */}
      <FlatList
        ref={flatListRef}
        data={images}
        keyExtractor={(_, index) => `page-${index}`}
        keyboardShouldPersistTaps="always"
        pagingEnabled
        scrollEnabled={!isInteractingWithAnnotation}
        showsVerticalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="normal"
        disableIntervalMomentum
        contentInsetAdjustmentBehavior="never"
        bounces={false}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={16}
        getItemLayout={(_, index) => ({
          length: containerHeight,
          offset: containerHeight * index,
          index,
        })}
        renderItem={({ item: imageUri, index }) => {
          const pageNumber = index + 1;
          const pageAnnotations = annotationsByPage.get(pageNumber) || [];
          const isEditingOnThisPage = editingAnnotationId
            ? pageAnnotations.some((ann) => ann.id === editingAnnotationId)
            : false;

          return (
            <View
              style={[
                styles.pageContainer,
                { height: containerHeight },
                index === images.length - 1 && styles.lastPageContainer,
              ]}
            >
              <View style={styles.zoomContainer}>
                <Animated.View
                  style={[
                    styles.imageContainer,
                    isEditingOnThisPage && { transform: [{ translateY: pageShiftY }] },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.imageContainerInner}
                    activeOpacity={1}
                    onPress={(e) => {
                      const { locationX, locationY } = e.nativeEvent;
                      const x = locationX / (zoomLevel > 0 ? zoomLevel : 1);
                      const y = locationY / (zoomLevel > 0 ? zoomLevel : 1);
                      handleImagePress(x, y, pageNumber);
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
                        // Важно для плавности: убираем fade transition при ререндере/виртуализации
                        transition={0}
                        fadeDuration={0}
                        cachePolicy="disk"
                        priority={index < 3 ? 'high' : 'normal'}
                        recyclingKey={`${albumName}-page-${index}`}
                      />

                      <PdfAnnotations
                        ref={pageNumber === currentPage ? annotationsRef : null}
                        annotations={pageAnnotations}
                        onAnnotationAdd={onAnnotationAdd || (() => {})}
                        onAnnotationUpdate={onAnnotationUpdate || (() => {})}
                        onAnnotationDelete={onAnnotationDelete || (() => {})}
                        isEditing={isEditing}
                        currentTool={currentTool}
                        onToolDeactivate={onToolDeactivate}
                        onEditingStateChange={handleEditingStateChange}
                        onInteractionChange={setIsInteractingWithAnnotation}
                        zoomLevel={zoomLevel}
                        viewportWidth={SCREEN_WIDTH}
                        viewportHeight={containerHeight}
                        lineGuideId={lineGuideId}
                      />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          );
        }}
      />

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
  imageContainerInner: {
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

