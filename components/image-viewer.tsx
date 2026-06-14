import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import type { EditorTool } from '@/constants/album-text-margins';
import {
  usesFreeFormTextEditing,
  usesTemplateLineTextEditing,
} from '@/constants/album-text-margins';
import { AppActionSheet } from '@/components/ui';
import { useMediaLibraryPermission } from '@/components/media-library-permission-provider';
import { createId } from '@/utils/id';
import {
  DIARY_BLOCK_PAGE_SIZE,
  getCachedPageSourceSize,
  resolvePageSourceSize,
} from '@/utils/pageSourceDimensions';
import { launchPhotoLibrary } from '@/utils/launchPhotoLibrary';
import {
  BLANK_INTERIOR_CACHE_REVISION,
  BLANK_INTERIOR_PAGE_HEIGHT,
  BLANK_INTERIOR_PAGE_WIDTH,
} from '@/utils/albumImages';
import { isLineSlotDebugEnabled } from '@/constants/line-slot-debug';
import { LineGuideDevOverlay } from '@/components/line-guide-dev-overlay';
import { LineSlotPressables } from '@/components/line-slot-pressables';
import { snapYToNearestTemplateLine } from '@/utils/lineGuides';
import { setPageSourceSize } from '@/utils/pageSourceDimensions';
import {
  buildLineSlotsContext,
  findAnnotationForContinuationGroup,
  hasLineGuides,
  hitTestLineSlot,
  layoutAnnotationFromSlot,
  type GetLineSlotsParams,
} from '@/utils/textLineSlots';
import {
  getContinuationGroupSlots,
  getEffectiveTemplateFontSize,
} from '@/utils/templateLineText';
import { getEditorPageDisplayScale, getEditorPageViewportWidth, isTabletLayout } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Animated,
    FlatList,
    Keyboard,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import PdfAnnotations, { Annotation, PdfAnnotationsRef } from './pdf-annotations';

const TEXT_ANNOTATION_DEFAULT_WIDTH = 200;
const FLOATING_TEXT_DEFAULT_WIDTH = 272;
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
  currentTool?: EditorTool;
  onPageDuplicate?: (pageIndex: number) => void;
  onPageDelete?: (pageIndex: number) => void;
  onToolReset?: () => void; // Callback для сброса инструмента
  onToolDeactivate?: () => void; // Мягкий сброс (только выключить выбранный инструмент)
  onTextEditingStateChange?: (isEditing: boolean, annotationId: string | null) => void; // Callback для отслеживания состояния редактирования текста
  onTextSelectionChange?: (hasSelection: boolean) => void;
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
  onTextSelectionChange,
  annotationsRef: externalAnnotationsRef,
  zoomLevel = 1,
  onViewportChange,
  defaultTextStyle,
  getLastFontFamily,
}: ImageViewerProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const editorViewportWidth = getEditorPageViewportWidth(windowWidth);
  const isTabletEditor = isTabletLayout(windowWidth);
  const displayScale = isTabletEditor
    ? getEditorPageDisplayScale(windowWidth, windowHeight, editorViewportWidth)
    : 1;
  const visualScale = displayScale * (zoomLevel > 0 ? zoomLevel : 1);

  const [currentPage, setCurrentPage] = useState(1);
  const [containerHeight, setContainerHeight] = useState(windowHeight);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isInteractingWithAnnotation, setIsInteractingWithAnnotation] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [lastTextStyle, setLastTextStyle] = useState<{ color?: string; fontSize?: number; fontFamily?: string } | null>(null);
  const [pageSourceSizes, setPageSourceSizes] = useState<
    Record<number, { width: number; height: number }>
  >({});
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

  const isBlankInteriorAlbum = usesFreeFormTextEditing(lineGuideId);

  const resolvePageSourceSizeForPage = (page: number) => {
    const imageUri = images[page - 1];
    const cached = imageUri ? getCachedPageSourceSize(imageUri) : null;
    const measured = pageSourceSizes[page] ?? cached;
    if (measured?.width && measured?.height) {
      return measured;
    }
    if (lineGuideId?.startsWith('diary_interior_')) {
      return DIARY_BLOCK_PAGE_SIZE;
    }
    return {
      width: editorViewportWidth,
      height: containerHeight,
    };
  };

  const buildSlotParams = (page: number): GetLineSlotsParams | null => {
    if (!lineGuideId || !hasLineGuides(lineGuideId)) return null;
    const size = resolvePageSourceSizeForPage(page);
    return {
      lineGuideId,
      page,
      viewportWidth: editorViewportWidth,
      viewportHeight: containerHeight,
      sourceWidth: size.width,
      sourceHeight: size.height,
    };
  };

  // Дневники: фиксированный размер блока 180×240 до onLoad — иначе слоты не попадают в линии
  useEffect(() => {
    if (!lineGuideId?.startsWith('diary_interior_') || images.length === 0) return;
    setPageSourceSizes((prev) => {
      let changed = false;
      const next = { ...prev };
      for (let page = 1; page <= images.length; page += 1) {
        if (next[page]?.width === DIARY_BLOCK_PAGE_SIZE.width) continue;
        next[page] = DIARY_BLOCK_PAGE_SIZE;
        changed = true;
        const uri = images[page - 1];
        if (uri) setPageSourceSize(uri, DIARY_BLOCK_PAGE_SIZE);
      }
      return changed ? next : prev;
    });
  }, [lineGuideId, images]);

  // Размеры PNG до onLoad — иначе contentRect = весь экран и слоты «съезжают»
  useEffect(() => {
    if (!lineGuideId || !hasLineGuides(lineGuideId)) return;
    const pages = [currentPage, currentPage - 1, currentPage + 1].filter(
      (p) => p >= 1 && p <= images.length
    );
    for (const page of pages) {
      const uri = images[page - 1];
      if (!uri || pageSourceSizes[page]) continue;
      const cached = getCachedPageSourceSize(uri);
      if (cached) {
        setPageSourceSizes((prev) => ({ ...prev, [page]: cached }));
        continue;
      }
      void resolvePageSourceSize(uri).then((size) => {
        if (!size) return;
        setPageSourceSizes((prev) =>
          prev[page]?.width === size.width && prev[page]?.height === size.height
            ? prev
            : { ...prev, [page]: size }
        );
      });
    }
  }, [lineGuideId, images, currentPage]);

  const handlePageImageLoad = (page: number, imageUri: string, width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    setPageSourceSizes((prev) => ({ ...prev, [page]: { width, height } }));
    setPageSourceSize(imageUri, { width, height });
  };

  const blankPageLayout = useMemo(() => {
    if (!isBlankInteriorAlbum) return null;
    const aspect = BLANK_INTERIOR_PAGE_WIDTH / BLANK_INTERIOR_PAGE_HEIGHT;
    let width = editorViewportWidth * 0.9;
    let height = width / aspect;
    const maxHeight = containerHeight * 0.9;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspect;
    }
    return { width, height };
  }, [isBlankInteriorAlbum, containerHeight, editorViewportWidth]);

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
      onViewportChange?.({ width: editorViewportWidth, height });
    }
  };

  const loadTextStyleForNewAnnotation = async (pageForAnnotation: number) => {
    type SavedTextStyle = { color?: string; fontSize?: number; fontFamily?: string };
    let savedStyle: SavedTextStyle | null = null;
    let savedFont: string | null = null;
    try {
      const [raw, fontRaw] = await Promise.all([
        AsyncStorage.getItem('@last_text_style'),
        AsyncStorage.getItem('@last_text_font_family'),
      ]);
      if (raw) savedStyle = JSON.parse(raw) as SavedTextStyle;
      if (fontRaw && typeof fontRaw === 'string') savedFont = fontRaw;
    } catch {
      // ignore
    }

    const isPregnancyFirstPage =
      usesTemplateLineTextEditing(lineGuideId) &&
      (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') &&
      pageForAnnotation === 1;

    const color = savedStyle?.color ?? defaultTextStyle?.color ?? lastTextStyle?.color ?? '#000000';
    const fontSize = isPregnancyFirstPage
      ? (savedStyle?.fontSize ?? defaultTextStyle?.fontSize ?? lastTextStyle?.fontSize ?? 18)
      : (savedStyle?.fontSize ?? defaultTextStyle?.fontSize ?? lastTextStyle?.fontSize ?? 16);
    const fontFamily =
      getLastFontFamily?.() ??
      savedStyle?.fontFamily ??
      savedFont ??
      defaultTextStyle?.fontFamily ??
      lastTextStyle?.fontFamily ??
      (isPregnancyFirstPage ? 'Nefelibata-PenSans' : 'default');

    return { color, fontSize, fontFamily: fontFamily || 'default' };
  };

  const startAnnotationEditing = (annotationId: string) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        annotationsRef.current?.startEditing?.(annotationId);
      });
    });
  };

  const addFreeFormTextAnnotation = async (
    pageForAnnotation: number,
    x: number,
    y: number
  ) => {
    if (!onAnnotationAdd) return;

    const maxZIndex =
      annotations.length > 0 ? Math.max(...annotations.map((ann) => ann.zIndex), 0) : 0;
    const viewportWidth = editorViewportWidth;
    const viewportHeight = containerHeight;
    const proposedX = x - FLOATING_TEXT_DEFAULT_WIDTH / 2;
    const proposedY = y - TEXT_ANNOTATION_DEFAULT_HEIGHT / 2;
    const nextX = clamp(proposedX, 0, viewportWidth - FLOATING_TEXT_DEFAULT_WIDTH);
    const nextY = clamp(proposedY, 0, viewportHeight - TEXT_EDITING_ESTIMATED_HEIGHT);
    const style = await loadTextStyleForNewAnnotation(pageForAnnotation);

    const newAnnotation: Annotation = {
      id: createId('ann'),
      type: 'text',
      x: nextX,
      y: nextY,
      width: FLOATING_TEXT_DEFAULT_WIDTH,
      height: TEXT_ANNOTATION_DEFAULT_HEIGHT,
      content: '',
      color: style.color,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      zIndex: maxZIndex + 1,
      page: pageForAnnotation,
    };
    onAnnotationAdd(newAnnotation);
    startAnnotationEditing(newAnnotation.id);
    onToolReset?.();
  };

  const handleLineSlotTap = async (
    pageForAnnotation: number,
    slotIndex?: number,
    tapX?: number,
    tapY?: number
  ) => {
    if (!lineGuideId || !hasLineGuides(lineGuideId) || !onAnnotationAdd) return false;

    const slotParams = buildSlotParams(pageForAnnotation);
    if (!slotParams) return false;
    const { slots } = buildLineSlotsContext(slotParams);
    const slot =
      slotIndex != null
        ? slots[slotIndex] ?? null
        : tapX != null && tapY != null
          ? hitTestLineSlot({ x: tapX, y: tapY, slots, slotParams })
          : null;
    if (!slot) return false;

    const { startSlotIndex } = getContinuationGroupSlots(slots, slot.index);
    const startSlot = slots[startSlotIndex] ?? slot;

    const pageAnnotations = annotations.filter(
      (ann) => (typeof ann.page === 'number' ? ann.page : currentPage) === pageForAnnotation
    );
    const existing = findAnnotationForContinuationGroup(
      pageAnnotations,
      pageForAnnotation,
      slots,
      slot.index
    );
    if (existing) {
      startAnnotationEditing(existing.id);
      onToolDeactivate?.();
      return true;
    }

    const maxZIndex =
      annotations.length > 0 ? Math.max(...annotations.map((ann) => ann.zIndex), 0) : 0;
    const style = await loadTextStyleForNewAnnotation(pageForAnnotation);
    const layout = layoutAnnotationFromSlot(startSlot);
    const effectiveFontSize = getEffectiveTemplateFontSize(
      lineGuideId,
      startSlot,
      style.fontSize
    );

    const newAnnotation: Annotation = {
      id: createId('ann'),
      type: 'text',
      ...layout,
      content: '',
      color: style.color,
      fontSize: effectiveFontSize,
      fontFamily: style.fontFamily,
      zIndex: maxZIndex + 1,
      page: pageForAnnotation,
    };

    onAnnotationAdd(newAnnotation);
    startAnnotationEditing(newAnnotation.id);
    onToolDeactivate?.();
    return true;
  };

  const handleImagePress = (x: number, y: number, tappedPage?: number) => {
    const pageForAnnotation = tappedPage ?? currentPage;
    // При инструменте «Фото» тап по странице открывает галерею (не блокируем из‑за текста/линий)
    if (isTextEditing && currentTool !== 'image') {
      Keyboard.dismiss();
      return;
    }

    if (
      isEditing &&
      lineGuideId &&
      hasLineGuides(lineGuideId) &&
      currentTool !== 'image'
    ) {
      const slotParams = buildSlotParams(pageForAnnotation);
      if (slotParams) {
        const { slots } = buildLineSlotsContext(slotParams);
        if (hitTestLineSlot({ x, y, slots, slotParams })) {
          void handleLineSlotTap(pageForAnnotation, undefined, x, y);
          return;
        }
      }
    }

    // Если мы в режиме редактирования, но инструмент не выбран — тап по пустому месту
    // должен закрывать выделение (рамку/ручки/корзину) у фото/аннотаций.
    if (isEditing && !currentTool) {
      const slotParams = buildSlotParams(pageForAnnotation);
      if (slotParams) {
        const { slots } = buildLineSlotsContext(slotParams);
        if (hitTestLineSlot({ x, y, slots, slotParams })) {
          void handleLineSlotTap(pageForAnnotation, undefined, x, y);
          return;
        }
      }
      annotationsRef.current?.clearSelection?.();
      return;
    }

    if (!isEditing || !currentTool) return;

    if (currentTool === 'floatingText' && onAnnotationAdd) {
      void addFreeFormTextAnnotation(pageForAnnotation, x, y);
      return;
    }

    if (currentTool === 'text' && onAnnotationAdd) {
      if (usesTemplateLineTextEditing(lineGuideId)) {
        const slotParams = buildSlotParams(pageForAnnotation);
        if (slotParams) {
          const { slots } = buildLineSlotsContext(slotParams);
          if (hitTestLineSlot({ x, y, slots, slotParams })) {
            void handleLineSlotTap(pageForAnnotation, undefined, x, y);
            return;
          }
        }
        return;
      }

      const maxZIndex = annotations.length > 0 
        ? Math.max(...annotations.map(ann => ann.zIndex), 0)
        : 0;

      const viewportWidth = editorViewportWidth;
      const viewportHeight = containerHeight;
      const proposedX = x - TEXT_ANNOTATION_DEFAULT_WIDTH / 2;
      const proposedY = y - TEXT_ANNOTATION_DEFAULT_HEIGHT / 2;
      const nextX = clamp(proposedX, 0, viewportWidth - TEXT_ANNOTATION_DEFAULT_WIDTH);
      const nextY = clamp(proposedY, 0, viewportHeight - TEXT_EDITING_ESTIMATED_HEIGHT);

      if (usesFreeFormTextEditing(lineGuideId)) {
        void addFreeFormTextAnnotation(pageForAnnotation, x, y);
        return;
      }

      const clampedY = clamp(proposedY, 0, viewportHeight - TEXT_EDITING_ESTIMATED_HEIGHT);
      const size = pageSourceSizes[pageForAnnotation];
      const snappedY = snapYToNearestTemplateLine({
        lineGuideId,
        page: pageForAnnotation,
        y: clampedY,
        viewportHeight,
        viewportWidth,
        sourceWidth: size?.width,
        sourceHeight: size?.height,
      });
      const snappedNextY = clamp(snappedY, 0, viewportHeight - TEXT_EDITING_ESTIMATED_HEIGHT);

      const applyStyle = async () => {
        const style = await loadTextStyleForNewAnnotation(pageForAnnotation);
        const slotParams = buildSlotParams(pageForAnnotation);
        const snappedSlot = slotParams
          ? buildLineSlotsContext(slotParams).slots.find((s) => Math.abs(s.y - snappedNextY) < 4)
          : undefined;

        const newAnnotation: Annotation = {
          id: createId('ann'),
          type: 'text',
          ...(snappedSlot
            ? { ...layoutAnnotationFromSlot(snappedSlot), content: '' }
            : {
                x: nextX,
                y: snappedNextY,
                width: TEXT_ANNOTATION_DEFAULT_WIDTH,
                height: TEXT_ANNOTATION_DEFAULT_HEIGHT,
                content: '',
              }),
          color: style.color,
          fontSize: style.fontSize,
          fontFamily: style.fontFamily,
          zIndex: maxZIndex + 1,
          page: pageForAnnotation,
        };
        onAnnotationAdd(newAnnotation);
        startAnnotationEditing(newAnnotation.id);
        if (onToolReset) onToolReset();
      };
      void applyStyle();
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

  const handlePickImage = async (x: number, y: number, page: number = currentPage) => {
    try {
      Keyboard.dismiss();
      annotationsRef.current?.blurEditingInput?.();

      const hasPermission = await ensureMediaLibraryPermission();
      if (!hasPermission) return;

      const result = await launchPhotoLibrary();

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
        const viewportWidth = editorViewportWidth;
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

  const navigateToPage = React.useCallback(
    (page: number) => {
      const clampedPage = Math.max(1, Math.min(page, images.length));
      setCurrentPage(clampedPage);
      scrollToPage(clampedPage);
    },
    [containerHeight, images.length]
  );

  if (images.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="image-outline" size={64} color={colors.tabInactive} />
        <Text style={styles.errorText}>Изображения не найдены</Text>
      </View>
    );
  }

  return (
    <View 
      style={styles.container}
      onLayout={handleContainerLayout}
    >
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
        decelerationRate="fast"
        snapToInterval={containerHeight}
        contentInsetAdjustmentBehavior="never"
        snapToAlignment="start"
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
                {
                  width: isTabletEditor ? '100%' : editorViewportWidth,
                  height: containerHeight,
                  alignSelf: isTabletEditor ? 'center' : undefined,
                },
                isBlankInteriorAlbum && styles.blankPageContainer,
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
                  <View style={styles.imageContainerInner}>
                    <Pressable
                      style={StyleSheet.absoluteFill}
                      onPress={(e) => {
                        const { locationX, locationY } = e.nativeEvent;
                        const { x, y } = mapScreenPointToUnscaledPagePoint({
                          locationX,
                          locationY,
                          viewportWidth: editorViewportWidth,
                          viewportHeight: containerHeight,
                          zoomLevel: visualScale,
                        });
                        handleImagePress(x, y, pageNumber);
                      }}
                      onLongPress={() => handleImageLongPress(index)}
                      delayLongPress={500}
                    />
                    <View
                      style={{
                        width: editorViewportWidth,
                        height: containerHeight,
                        justifyContent: 'center',
                        alignItems: 'center',
                        transform: [{ scale: visualScale }],
                      }}
                      pointerEvents="box-none"
                    >
                      {isBlankInteriorAlbum && blankPageLayout ? (
                        <View style={[styles.blankPageFrame, blankPageLayout]} pointerEvents="none">
                          <Image
                            source={{ uri: imageUri }}
                            style={styles.blankPageImage}
                            contentFit="fill"
                            transition={0}
                            fadeDuration={0}
                            cachePolicy="memory-disk"
                            priority={index < 3 ? 'high' : 'normal'}
                            recyclingKey={`${lineGuideId || albumName}-p${index}-${BLANK_INTERIOR_CACHE_REVISION}`}
                          />
                        </View>
                      ) : (
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.image}
                          contentFit="contain"
                          contentPosition="center"
                          transition={0}
                          fadeDuration={0}
                          cachePolicy="disk"
                          priority={index < 3 ? 'high' : 'normal'}
                          recyclingKey={`${lineGuideId || albumName}-p${index}-${BLANK_INTERIOR_CACHE_REVISION}`}
                          pointerEvents="none"
                          onLoad={(event) => {
                            const w = event.source?.width;
                            const h = event.source?.height;
                            if (w && h) {
                              handlePageImageLoad(pageNumber, imageUri, w, h);
                            }
                          }}
                        />
                      )}

                      {(() => {
                        const slotParams = buildSlotParams(pageNumber);
                        const showSlotPressables =
                          pageNumber === currentPage &&
                          !!slotParams &&
                          isEditing &&
                          !isTextEditing &&
                          !selectedAnnotationId &&
                          hasLineGuides(lineGuideId) &&
                          usesTemplateLineTextEditing(lineGuideId) &&
                          currentTool !== 'image' &&
                          currentTool !== 'drawing' &&
                          currentTool !== 'floatingText';

                        return (
                          <>
                            {showSlotPressables ? (
                              <LineSlotPressables
                                slotParams={slotParams}
                                enabled
                                onSlotPress={(slotIndex) =>
                                  void handleLineSlotTap(pageNumber, slotIndex)
                                }
                              />
                            ) : null}
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
                              onSelectionChange={
                                pageNumber === currentPage ? setSelectedAnnotationId : undefined
                              }
                              zoomLevel={visualScale}
                              viewportWidth={editorViewportWidth}
                              viewportHeight={containerHeight}
                              sourceWidth={resolvePageSourceSizeForPage(pageNumber).width}
                              sourceHeight={resolvePageSourceSizeForPage(pageNumber).height}
                              lineGuideId={lineGuideId}
                              onTextSelectionChange={onTextSelectionChange}
                              totalPages={
                                pageNumber === currentPage ? images.length : undefined
                              }
                              onNavigateToPage={
                                pageNumber === currentPage ? navigateToPage : undefined
                              }
                              resolveSlotParams={
                                pageNumber === currentPage ? buildSlotParams : undefined
                              }
                            />
                            {slotParams && isLineSlotDebugEnabled() ? (
                              <LineGuideDevOverlay {...slotParams} />
                            ) : null}
                          </>
                        );
                      })()}
                    </View>
                  </View>
                </Animated.View>
              </View>
            </View>
          );
        }}
      />

      <AppActionSheet
        visible={showPageMenu}
        onClose={() => {
          setShowPageMenu(false);
          setSelectedPageIndex(null);
        }}
        title="Действия со страницей"
        subtitle={
          selectedPageIndex !== null ? `Страница ${selectedPageIndex + 1}` : undefined
        }
        actions={[
          {
            id: 'duplicate',
            title: 'Дублировать',
            icon: 'copy-outline',
            onPress: handleDuplicatePage,
          },
          {
            id: 'delete',
            title: 'Удалить',
            icon: 'trash-outline',
            destructive: true,
            onPress: handleDeletePage,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  pageContainer: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  blankPageContainer: {
    justifyContent: 'center',
    backgroundColor: '#E8E2DC',
  },
  zoomContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  zoomWrapper: {
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
  },
  blankPageFrame: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C9B8A8',
    borderRadius: 3,
    overflow: 'hidden',
    shadowColor: colors.textSecondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  blankPageImage: {
    width: '100%',
    height: '100%',
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
    shadowColor: colors.textPrimary,
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
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
});

