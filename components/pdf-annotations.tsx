import { getTemplateTextLineMetrics, snapYToNearestTemplateLine } from '@/utils/lineGuides';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Keyboard,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Цвета из темы приложения
const APP_COLORS = [
  '#000000', // Черный
  '#8B6F5F', // Основной коричневый
  '#C9A89A', // Светло-коричневый
  '#9B8E7F', // Серо-коричневый
  '#6B5D4F', // Темно-коричневый
  '#5B4D3F', // Очень темный коричневый
  '#D4C4B5', // Светло-бежевый
  '#F0E8E0', // Светлый бежевый
  '#FFFFFF', // Белый
];

// Размеры шрифта
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40];

// Доступные шрифты из папки assets/fonts
export interface FontOption {
  id: string;
  name: string;
  file: any; // require() модуль
  displayName: string;
}

export const AVAILABLE_FONTS: FontOption[] = [
  { id: 'default', name: 'System', file: null, displayName: 'Системный' },
  { id: 'AmaticSC-Regular', name: 'AmaticSC-Regular', file: require('@/assets/fonts/AmaticSC-Regular.ttf'), displayName: 'Amatic SC' },
  { id: 'AmaticSC-Bold', name: 'AmaticSC-Bold', file: require('@/assets/fonts/AmaticSC-Bold.ttf'), displayName: 'Amatic SC Bold' },
  { id: 'inspiration', name: 'inspiration', file: require('@/assets/fonts/inspiration.ttf'), displayName: 'Inspiration' },
  { id: 'Nefelibata-Brush', name: 'Nefelibata-Brush', file: require('@/assets/fonts/Nefelibata-Brush.otf'), displayName: 'Nefelibata Brush' },
  { id: 'Nefelibata-BrushCanvas', name: 'Nefelibata-BrushCanvas', file: require('@/assets/fonts/Nefelibata-BrushCanvas.otf'), displayName: 'Nefelibata Brush Canvas' },
  { id: 'Nefelibata-Extras', name: 'Nefelibata-Extras', file: require('@/assets/fonts/Nefelibata-Extras.otf'), displayName: 'Nefelibata Extras' },
  { id: 'Nefelibata-PenSans', name: 'Nefelibata-PenSans', file: require('@/assets/fonts/Nefelibata-PenSans.otf'), displayName: 'Nefelibata Pen Sans' },
  { id: 'Nefelibata-Sans', name: 'Nefelibata-Sans', file: require('@/assets/fonts/Nefelibata-Sans.otf'), displayName: 'Nefelibata Sans' },
  { id: 'Nefelibata-SansCanvas', name: 'Nefelibata-SansCanvas', file: require('@/assets/fonts/Nefelibata-SansCanvas.otf'), displayName: 'Nefelibata Sans Canvas' },
  { id: 'Nefelibata-SansCd', name: 'Nefelibata-SansCd', file: require('@/assets/fonts/Nefelibata-SansCd.otf'), displayName: 'Nefelibata Sans Cd' },
  { id: 'Nefelibata-SansCdCanvas', name: 'Nefelibata-SansCdCanvas', file: require('@/assets/fonts/Nefelibata-SansCdCanvas.otf'), displayName: 'Nefelibata Sans Cd Canvas' },
  { id: 'Nefelibata-Script', name: 'Nefelibata-Script', file: require('@/assets/fonts/Nefelibata-Script.otf'), displayName: 'Nefelibata Script' },
  { id: 'SvyaznoyRF', name: 'SvyaznoyRF', file: require('@/assets/fonts/SvyaznoyRF.ttf'), displayName: 'Svyaznoy RF' },
];

export interface Annotation {
  id: string;
  type: 'text' | 'image' | 'drawing';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  imageUri?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string; // ID шрифта из AVAILABLE_FONTS
  zIndex: number;
  page?: number | string;
}

export interface PdfAnnotationsRef {
  closeEditing: () => void;
  openColorPicker: () => void;
  openFontSizePicker: () => void;
  openFontPicker: () => void;
  startEditing: (annotationId: string) => void;
  clearSelection: () => void;
}

interface PdfAnnotationsProps {
  annotations: Annotation[];
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationUpdate: (id: string, annotation: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
  isEditing: boolean;
  currentTool: 'text' | 'image' | 'drawing' | null;
  onEditingStateChange?: (isEditing: boolean, annotationId: string | null) => void;
  zoomLevel?: number; // Уровень масштабирования
  // Для привязки текста к линиям + корректной геометрии
  viewportWidth?: number;
  viewportHeight?: number;
  lineGuideId?: string;
  // Для UX (ImageViewer передает, чтобы выключать инструмент “Текст” при тапе по существующему)
  onToolDeactivate?: () => void;
  // Сигнал наружу: пользователь взаимодействует (drag/resize) — чтобы не сдвигать страницу/клавиатуру
  onInteractionChange?: (isInteracting: boolean) => void;
}

const PdfAnnotations = React.forwardRef<PdfAnnotationsRef, PdfAnnotationsProps>(({
  annotations,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  isEditing,
  currentTool,
  onEditingStateChange,
  zoomLevel = 1,
  viewportWidth,
  viewportHeight,
  lineGuideId,
  onToolDeactivate,
  onInteractionChange,
}, ref) => {
  // Получаем актуальные размеры экрана
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  
  // Загружаем все шрифты через expo-font
  const [fontsLoaded] = useFonts(
    AVAILABLE_FONTS.reduce((acc, font) => {
      if (font.file && font.id !== 'default') {
        acc[font.name] = font.file;
      }
      return acc;
    }, {} as Record<string, any>)
  );

  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showZIndexMenu, setShowZIndexMenu] = useState(false);
  const [zIndexAnnotationId, setZIndexAnnotationId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingWhileEditing, setIsDraggingWhileEditing] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [adjustedEditingPosition, setAdjustedEditingPosition] = useState<{ x: number; y: number } | null>(null);
  const editingContainerLayout = useRef<{ width: number; height: number } | null>(null);
  const panResponders = useRef<{ [key: string]: any }>({});
  const editingDragResponder = useRef<any>(null);
  
  // Используем ref для доступа к актуальному selectedAnnotation в PanResponder
  const selectedAnnotationRef = useRef<string | null>(null);

  // Анимации для плавного появления окна редактирования
  const editingScaleAnim = useRef(new Animated.Value(0)).current;
  const editingOpacityAnim = useRef(new Animated.Value(0)).current;
  
  // Анимации для плавного перетаскивания (только визуальные эффекты)
  const dragScaleAnim = useRef(new Animated.Value(1)).current;
  const dragOpacityAnim = useRef(new Animated.Value(1)).current;

  const editingDragStartPos = useRef<{ x: number; y: number } | null>(null);
  const editingDragState = useRef<{ startX: number; startY: number; isDraggingStarted: boolean } | null>(null);
  const isDraggingWhileEditingRef = useRef(false);
  const adjustedEditingPositionRef = useRef<{ x: number; y: number } | null>(null);
  // Флаг для активации перетаскивания после закрытия редактирования через оранжевую кнопку
  const shouldStartDraggingAfterCloseRef = useRef<string | null>(null);
  // PanResponder для оранжевой кнопки перетаскивания
  const dragButtonResponderRef = useRef<ReturnType<typeof PanResponder.create> | null>(null);

  // Локальные позиции для плавного drag (в родитель коммитим только на отпускании)
  const localPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const pendingCommitRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const rafHandleRef = useRef<number | null>(null);
  const [localPositionsVersion, setLocalPositionsVersion] = useState(0);

  // Реальные размеры текста (убирает "стену" из-за фиксированных width/height)
  const measuredTextSizesRef = useRef<Map<string, { width: number; height: number }>>(new Map());
  const [, setMeasuredVersion] = useState(0);

  const scheduleLocalRerender = () => {
    if (rafHandleRef.current) return;
    rafHandleRef.current = requestAnimationFrame(() => {
      rafHandleRef.current = null;
      setLocalPositionsVersion((v) => v + 1);
    });
  };

  const setLocalPosition = (annotationId: string, next: { x: number; y: number }) => {
    localPositionsRef.current.set(annotationId, next);
    scheduleLocalRerender();
  };

  const getDisplayPosition = (annotation: Annotation) => {
    // используем state как "триггер" перерендера
    void localPositionsVersion;
    return localPositionsRef.current.get(annotation.id) ?? { x: annotation.x, y: annotation.y };
  };

  // Ref для отслеживания активного взаимодействия (перетаскивание или изменение размера)
  const isInteractingRef = useRef(false);
  
  useEffect(() => {
    if (pendingCommitRef.current.size === 0 && localPositionsRef.current.size === 0) return;
    // НЕ очищаем localPositionsRef во время активного взаимодействия
    // Это предотвращает возврат фото на старую позицию при изменении размера
    if (isInteractingRef.current) return;
    
    let changed = false;
    for (const ann of annotations) {
      const pending = pendingCommitRef.current.get(ann.id);
      if (!pending) continue;
      if (Math.abs(ann.x - pending.x) < 0.01 && Math.abs(ann.y - pending.y) < 0.01) {
        pendingCommitRef.current.delete(ann.id);
        localPositionsRef.current.delete(ann.id);
        changed = true;
      }
    }
    if (changed) scheduleLocalRerender();
  }, [annotations]);

  // Автоматически открываем редактирование для нового текста
  useEffect(() => {
    if (!isEditing) return;
    
    const newTextAnnotation = annotations.find(
      ann => ann.type === 'text' && ann.content === 'Новый текст' && !editingAnnotation
    );
    if (newTextAnnotation) {
      // Небольшая задержка для корректного открытия редактирования
      setTimeout(() => {
        setEditingAnnotation(newTextAnnotation.id);
        setEditingText('Новый текст');
        setAdjustedEditingPosition(null); // Сбрасываем скорректированную позицию
        onEditingStateChange?.(true, newTextAnnotation.id);
      }, 100);
    }
  }, [annotations, isEditing, editingAnnotation]);

  // Автоматически выбираем новое изображение после добавления
  const previousAnnotationsLength = useRef(annotations.length);
  useEffect(() => {
    if (!isEditing) {
      previousAnnotationsLength.current = annotations.length;
      return;
    }
    
    // Проверяем, было ли добавлено новое изображение
    if (annotations.length > previousAnnotationsLength.current) {
      const newImageAnnotation = annotations
        .filter(ann => ann.type === 'image')
        .sort((a, b) => {
          // Сортируем по zIndex, чтобы получить последнее добавленное
          return (b.zIndex || 0) - (a.zIndex || 0);
        })
        .find(ann => ann.id !== selectedAnnotation && !editingAnnotation);
      
      if (newImageAnnotation) {
        // Небольшая задержка для корректного выбора
        setTimeout(() => {
          setSelectedAnnotation(newImageAnnotation.id);
        }, 150);
      }
    }
    
    previousAnnotationsLength.current = annotations.length;
  }, [annotations, isEditing, selectedAnnotation, editingAnnotation]);

  // Уведомляем родительский компонент об изменении состояния редактирования
  useEffect(() => {
    onEditingStateChange?.(!!editingAnnotation, editingAnnotation);
  }, [editingAnnotation]);

  // Синхронизируем ref с состоянием для использования в PanResponder
  useEffect(() => {
    isDraggingWhileEditingRef.current = isDraggingWhileEditing;
  }, [isDraggingWhileEditing]);

  useEffect(() => {
    adjustedEditingPositionRef.current = adjustedEditingPosition;
  }, [adjustedEditingPosition]);

  // Синхронизируем selectedAnnotation в ref для использования в PanResponder
  useEffect(() => {
    selectedAnnotationRef.current = selectedAnnotation;
  }, [selectedAnnotation]);

  // Обновляем editingText при открытии редактирования (для сохранения текста при повторном открытии)
  const previousEditingAnnotation = useRef<string | null>(null);
  useEffect(() => {
    if (editingAnnotation && editingAnnotation !== previousEditingAnnotation.current) {
      // Открывается новое редактирование - загружаем текст из аннотации
      const annotation = annotations.find(ann => ann.id === editingAnnotation);
      if (annotation && annotation.type === 'text') {
        // Загружаем текущий текст из аннотации при открытии редактирования
        // Это позволяет продолжить редактирование существующего текста
        setEditingText(annotation.content || '');
      }
      previousEditingAnnotation.current = editingAnnotation;
      
      // Плавная анимация появления окна редактирования
      // Устанавливаем opacity сразу в 1, чтобы текст был четким с самого начала
      editingScaleAnim.setValue(0);
      editingOpacityAnim.setValue(1); // Сразу устанавливаем opacity в 1 для четкости текста
      Animated.parallel([
        Animated.spring(editingScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        // Убираем анимацию opacity, чтобы текст был четким сразу
        // Animated.timing(editingOpacityAnim, {
        //   toValue: 1,
        //   duration: 200,
        //   easing: Easing.out(Easing.ease),
        //   useNativeDriver: true,
        // }),
      ]).start();
    } else if (!editingAnnotation) {
      previousEditingAnnotation.current = null;
      // Плавная анимация закрытия окна редактирования
      Animated.parallel([
        Animated.spring(editingScaleAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(editingOpacityAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [editingAnnotation]);

  // Отслеживаем видимость клавиатуры
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Создаем PanResponder для оранжевой кнопки перетаскивания
  useEffect(() => {
    if (!editingAnnotation) {
      dragButtonResponderRef.current = null;
      return;
    }

    const annotationId = editingAnnotation;
    const currentAnnotation = annotations.find(ann => ann.id === annotationId);

    if (!currentAnnotation || currentAnnotation.type !== 'text') {
      return;
    }

    let isDraggingStarted = false;
    let startX = 0;
    let startY = 0;

    dragButtonResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Активируем при малейшем движении
        const { dx, dy } = gestureState;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance > 1;
      },
      onPanResponderGrant: () => {
        // При зажатии кнопки передвижения:
        if (!editingAnnotation) return;
        
        const annotationId = editingAnnotation;
        const currentAnnotation = annotations.find(ann => ann.id === annotationId);
        
        if (!currentAnnotation) return;
        
        // 1. Сохраняем текст с учетом всех параметров
        const shouldSnap =
          currentAnnotation.type === 'text' &&
          !!lineGuideId &&
          typeof viewportHeight === 'number' &&
          viewportHeight > 0 &&
          typeof currentAnnotation.page === 'number';
        const snappedY = shouldSnap
          ? snapYToNearestTemplateLine({
              lineGuideId,
              page: currentAnnotation.page as number,
              y: currentAnnotation.y,
              viewportHeight,
            })
          : null;

        const textToSave = editingText.trim() || currentAnnotation.content || '';
        onAnnotationUpdate(annotationId, {
          content: textToSave,
          ...(typeof snappedY === 'number' ? { y: snappedY } : {}),
        });
        
        // Сохраняем начальную позицию
        const display = getDisplayPosition(currentAnnotation);
        startX = display.x;
        startY = display.y;
        
        // 2. Закрываем клавиатуру
        Keyboard.dismiss();

        // 3. Сразу закрываем редактирование и активируем перетаскивание через флаг
        delete panResponders.current[annotationId];
        setSelectedAnnotation(annotationId);
        shouldStartDraggingAfterCloseRef.current = annotationId;

        setEditingAnnotation(null);
        setEditingText('');
        setIsDraggingWhileEditing(false);
        setAdjustedEditingPosition(null);
        editingContainerLayout.current = null;
        editingDragResponder.current = null;
        editingDragState.current = null;
        isDraggingWhileEditingRef.current = false;
        adjustedEditingPositionRef.current = null;
        onEditingStateChange?.(false, null);

        // 4. Плавно скрываем окно редактирования визуально
        Animated.parallel([
          Animated.spring(editingScaleAnim, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(editingOpacityAnim, {
            toValue: 0,
            duration: 150,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();

        // 5. Сразу активируем перетаскивание
        isDraggingStarted = true;
        isInteractingRef.current = true;
        onInteractionChange?.(true);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isDraggingStarted || !shouldStartDraggingAfterCloseRef.current) return;
        
        const annotationId = shouldStartDraggingAfterCloseRef.current;
        const currentAnnotation = annotations.find(ann => ann.id === annotationId);
        
        if (!currentAnnotation) return;
        
        // Обновляем позицию текста мгновенно
        const safeZoom = zoomLevel > 0 ? zoomLevel : 1;
        const dx = gestureState.dx / safeZoom;
        const dy = gestureState.dy / safeZoom;
        const viewportW = typeof viewportWidth === 'number' && viewportWidth > 0 ? viewportWidth : windowWidth;
        const viewportH = typeof viewportHeight === 'number' && viewportHeight > 0 ? viewportHeight : windowHeight;
        const bounds = getAnnotationBoundsSize(currentAnnotation);
        // Для текста используем минимальную ширину (24px) при расчете правой границы,
        // чтобы текст мог доехать до самого правого края, даже если окно редактирования шире
        const minTextWidth = 24;
        const effectiveWidth = currentAnnotation.type === 'text' ? minTextWidth : bounds.width;
        const newX = Math.max(0, Math.min(startX + dx, viewportW - effectiveWidth));
        const newY = Math.max(0, Math.min(startY + dy, viewportH - bounds.height));
        
        setLocalPosition(annotationId, { x: newX, y: newY });
        onAnnotationUpdate(annotationId, { x: newX, y: newY });
      },
      onPanResponderRelease: () => {
        isDraggingStarted = false;
        isInteractingRef.current = false;
        onInteractionChange?.(false);
        shouldStartDraggingAfterCloseRef.current = null;
        dragButtonResponderRef.current = null;
      },
      onPanResponderTerminate: () => {
        isDraggingStarted = false;
        isInteractingRef.current = false;
        onInteractionChange?.(false);
        shouldStartDraggingAfterCloseRef.current = null;
        dragButtonResponderRef.current = null;
      },
    });
    return () => {
      dragButtonResponderRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingAnnotation, annotations, editingText, lineGuideId, viewportHeight, zoomLevel, viewportWidth, windowWidth, windowHeight]);

  const createPanResponder = (annotation: Annotation) => {
    // Не создаем PanResponder для текста, который редактируется
    if (annotation.type === 'text' && editingAnnotation === annotation.id) {
      return null;
    }

    if (panResponders.current[annotation.id]) {
      return panResponders.current[annotation.id];
    }

    let startX = 0;
    let startY = 0;
    let isDraggingStarted = false;
    let pressStartTime = 0;
    let pressStartX = 0;
    let pressStartY = 0;

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Для текста - только если не редактируется
        if (annotation.type === 'text' && editingAnnotation === annotation.id) {
          return false;
        }
        // Для текста - если установлен флаг shouldStartDraggingAfterCloseRef, активируем сразу
        // Это позволяет перетаскивать текст сразу после закрытия окна через оранжевую кнопку
        if (annotation.type === 'text' && isEditing && shouldStartDraggingAfterCloseRef.current === annotation.id) {
          return true;
        }
        // Для изображений - всегда в режиме редактирования (для выбора при тапе)
        if (annotation.type === 'image') {
          return isEditing;
        }
        // Активируем PanResponder сразу для возможности перетаскивания
        return isEditing;
      },
      onStartShouldSetPanResponderCapture: () => {
        // НЕ перехватываем события в capture фазе для изображений,
        // чтобы ручки изменения размера могли обработать их первыми
        if (annotation.type === 'text' && editingAnnotation === annotation.id) {
          return false;
        }
        // Для изображений - не перехватываем в capture, чтобы ручки имели приоритет
        if (annotation.type === 'image') {
          return false;
        }
        return isEditing;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Для текста - только если не редактируется
        if (annotation.type === 'text' && editingAnnotation === annotation.id) {
          return false;
        }
        
        // Для изображений - перетаскивание работает если изображение выбрано или выбирается
        if (annotation.type === 'image') {
          // Используем ref для получения актуального значения selectedAnnotation
          // Также проверяем, что изображение может быть выбрано (в режиме редактирования)
          if (isEditing && (selectedAnnotationRef.current === annotation.id || !selectedAnnotationRef.current)) {
            const { dx, dy } = gestureState;
            const distance = Math.sqrt(dx * dx + dy * dy);
            // Порог 3 пикселя - более чувствительный для начала перетаскивания
            if (distance > 3 && !isDraggingStarted) {
              // Если изображение еще не выбрано, выбираем его
              if (selectedAnnotationRef.current !== annotation.id) {
                setSelectedAnnotation(annotation.id);
                selectedAnnotationRef.current = annotation.id;
              }
              isDraggingStarted = true;
              setIsDragging(true);
              // Уведомляем о начале взаимодействия для отключения скроллинга PDF
              onInteractionChange?.(true);
              return true;
            }
            return isDraggingStarted;
          }
          return false; // Не начинаем перетаскивание, если изображение не выбрано
        }
        
        // Для текста - если установлен флаг shouldStartDraggingAfterCloseRef,
        // активируем перетаскивание при малейшем движении (после закрытия через оранжевую кнопку)
        if (annotation.type === 'text' && isEditing && shouldStartDraggingAfterCloseRef.current === annotation.id) {
          const { dx, dy } = gestureState;
          const distance = Math.sqrt(dx * dx + dy * dy);
          // Очень низкий порог (1 пиксель) для немедленной активации после закрытия окна
          if (distance > 1) {
            // Очищаем флаг
            shouldStartDraggingAfterCloseRef.current = null;
            // Активируем перетаскивание
            isDraggingStarted = true;
            setIsDragging(true);
            isInteractingRef.current = true;
            onInteractionChange?.(true);
            return true;
          }
        }
        
        // Для текста - если перетаскивание уже начато, сразу возвращаем true
        if (annotation.type === 'text' && isDraggingStarted) {
          return true;
        }
        
        // Начинаем перетаскивание только если движение достаточно большое (для текста)
        if (isEditing && !isDraggingStarted) {
          const { dx, dy } = gestureState;
          const distance = Math.sqrt(dx * dx + dy * dy);
          // Порог 5 пикселей - чтобы отличить перетаскивание от обычного тапа
          if (distance > 5) {
            isDraggingStarted = true;
            setIsDragging(true);
            if (annotation.type === 'text') {
              setSelectedAnnotation(annotation.id);
            }
            return true;
          }
        }
        return isDraggingStarted;
      },
      onPanResponderGrant: (evt) => {
        const display = getDisplayPosition(annotation);
        startX = display.x;
        startY = display.y;
        pressStartTime = Date.now();
        pressStartX = evt.nativeEvent.pageX;
        pressStartY = evt.nativeEvent.pageY;
        
        // Для текста - если установлен флаг shouldStartDraggingAfterCloseRef,
        // сразу активируем перетаскивание (текст был закрыт через оранжевую кнопку)
        if (annotation.type === 'text' && isEditing && shouldStartDraggingAfterCloseRef.current === annotation.id) {
          // Очищаем флаг
          shouldStartDraggingAfterCloseRef.current = null;
          // Сразу активируем перетаскивание
          isDraggingStarted = true;
          setIsDragging(true);
          isInteractingRef.current = true;
          onInteractionChange?.(true);
        } else {
          // Сбрасываем флаг перетаскивания только если не активировали его выше
          isDraggingStarted = false;
        }
        
        // Для изображений - если не выбрано, выбираем при начале касания
        // Это позволяет сразу начать перетаскивание при зажатии
        if (annotation.type === 'image' && isEditing) {
          if (selectedAnnotationRef.current !== annotation.id) {
            setSelectedAnnotation(annotation.id);
            // Обновляем ref сразу для использования в onMoveShouldSetPanResponder
            selectedAnnotationRef.current = annotation.id;
          }
        }
        // Не выбираем текст сразу - будем различать тап и перетаскивание
      },
      onPanResponderMove: (evt, gestureState) => {
        // Для изображений - перетаскивание работает если изображение выбрано
        if (annotation.type === 'image') {
          // Используем ref для получения актуального значения selectedAnnotation
          // Если изображение выбрано и есть движение, начинаем перетаскивание
          if (isEditing && selectedAnnotationRef.current === annotation.id) {
            const { dx, dy } = gestureState;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Если движение достаточно большое, начинаем перетаскивание
            if (distance > 3 && !isDraggingStarted) {
              isDraggingStarted = true;
              setIsDragging(true);
              isInteractingRef.current = true; // Помечаем активное взаимодействие
              onInteractionChange?.(true);
            }
            
            // Если перетаскивание начато, обновляем позицию мгновенно
            if (isDraggingStarted) {
              onInteractionChange?.(true);
              const safeZoom = zoomLevel > 0 ? zoomLevel : 1;
              const moveDx = gestureState.dx / safeZoom;
              const moveDy = gestureState.dy / safeZoom;
              const viewportW = typeof viewportWidth === 'number' && viewportWidth > 0 ? viewportWidth : windowWidth;
              const viewportH = typeof viewportHeight === 'number' && viewportHeight > 0 ? viewportHeight : windowHeight;
              const bounds = getAnnotationBoundsSize(annotation);
              const newX = Math.max(0, Math.min(startX + moveDx, viewportW - bounds.width));
              const newY = Math.max(0, Math.min(startY + moveDy, viewportH - bounds.height));
              setLocalPosition(annotation.id, { x: newX, y: newY });
            }
          }
          return;
        }
        
        // Для текста - только локальное обновление во время drag (без родительского re-render)
        if (isEditing && isDraggingStarted) {
          isInteractingRef.current = true;
          onInteractionChange?.(true);
          const safeZoom = zoomLevel > 0 ? zoomLevel : 1;
          const dx = gestureState.dx / safeZoom;
          const dy = gestureState.dy / safeZoom;
          const viewportW = typeof viewportWidth === 'number' && viewportWidth > 0 ? viewportWidth : windowWidth;
          const viewportH = typeof viewportHeight === 'number' && viewportHeight > 0 ? viewportHeight : windowHeight;
          const bounds = getAnnotationBoundsSize(annotation);
          const minTextWidth = 24;
          const effectiveWidth = annotation.type === 'text' ? minTextWidth : bounds.width;
          const newX = Math.max(0, Math.min(startX + dx, viewportW - effectiveWidth));
          const newY = Math.max(0, Math.min(startY + dy, viewportH - bounds.height));
          setLocalPosition(annotation.id, { x: newX, y: newY });
        }
      },
      onPanResponderRelease: (evt) => {
        const pressDuration = Date.now() - pressStartTime;
        const pressDistance = Math.sqrt(
          Math.pow(evt.nativeEvent.pageX - pressStartX, 2) + 
          Math.pow(evt.nativeEvent.pageY - pressStartY, 2)
        );
        
        // Если это был короткий тап без движения - открываем редактирование
        if (!isDraggingStarted && pressDuration < 300 && pressDistance < 10) {
          if (annotation.type === 'text') {
            // Короткий тап - открываем редактирование текста
            setEditingAnnotation(annotation.id);
            setEditingText(annotation.content || '');
            setSelectedAnnotation(null);
            // Сбрасываем скорректированную позицию - она будет вычислена после получения размеров контейнера
            setAdjustedEditingPosition(null);
          } else if (annotation.type === 'image') {
            // Для изображений - переключаем выбор (если уже выбрано - снимаем выбор, если нет - выбираем)
            if (selectedAnnotation === annotation.id) {
              // Если уже выбрано - можно оставить выбранным для перетаскивания при следующем зажатии
              // Или снять выбор, если нужно
              // Оставляем выбранным, чтобы можно было сразу перетаскивать
            } else {
              // Выбираем изображение
              setSelectedAnnotation(annotation.id);
            }
          } else {
            setSelectedAnnotation(annotation.id);
          }
        } else if (isDraggingStarted) {
          // После перетаскивания выбираем текст (показываем прямоугольник)
          if (annotation.type === 'text') {
            setSelectedAnnotation(annotation.id);
          } else {
            setSelectedAnnotation(annotation.id);
          }
        }
        
        if (isDraggingStarted) {
          const latest = localPositionsRef.current.get(annotation.id);
          if (latest) {
            pendingCommitRef.current.set(annotation.id, latest);
            onAnnotationUpdate(annotation.id, { x: latest.x, y: latest.y });
          }
        }

        setIsDragging(false);
        // Снимаем флаг взаимодействия с небольшой задержкой
        setTimeout(() => {
          isInteractingRef.current = false;
          onInteractionChange?.(false);
        }, 100);
        isDraggingStarted = false;
      },
      onPanResponderTerminate: () => {
        setSelectedAnnotation(null);
        setIsDragging(false);
        onInteractionChange?.(false);
        isDraggingStarted = false;
      },
    });

    panResponders.current[annotation.id] = panResponder;
    return panResponder;
  };

  const handleAnnotationPress = (annotation: Annotation) => {
    if (!isEditing) return;
    
    // Обычное нажатие - просто выбираем аннотацию (для текста не открываем редактор)
    setSelectedAnnotation(annotation.id);
  };

  const handleAnnotationLongPress = (annotation: Annotation) => {
    if (!isEditing) return;
    
    if (annotation.type === 'image') {
      setZIndexAnnotationId(annotation.id);
      setShowZIndexMenu(true);
    } else if (annotation.type === 'text') {
      // Для текста долгое нажатие открывает редактирование
      setEditingAnnotation(annotation.id);
      setEditingText(annotation.content || '');
      setSelectedAnnotation(null); // Убираем выбор при открытии редактора
      // Сбрасываем скорректированную позицию - она будет вычислена после получения размеров контейнера
      setAdjustedEditingPosition(null);
    }
  };

  // Функция для вычисления корректной позиции с учетом границ экрана
  const calculateAdjustedPosition = (
    annotation: Annotation,
    containerWidth: number,
    containerHeight: number
  ): { x: number; y: number } => {
    const padding = 16; // Отступ от краев экрана
    const safeViewportWidth = typeof viewportWidth === 'number' && viewportWidth > 0 ? viewportWidth : windowWidth;
    const safeViewportHeight = typeof viewportHeight === 'number' && viewportHeight > 0 ? viewportHeight : windowHeight;
    const minX = padding;
    const minY = padding;
    const maxX = safeViewportWidth - containerWidth - padding;
    const maxY = safeViewportHeight - containerHeight - padding;

    let adjustedX = annotation.x;
    let adjustedY = annotation.y;

    // Проверяем правую границу
    if (annotation.x + containerWidth > windowWidth - padding) {
      adjustedX = Math.max(minX, windowWidth - containerWidth - padding);
    }

    // Проверяем левую границу
    if (annotation.x < padding) {
      adjustedX = minX;
    }

    // Проверяем нижнюю границу
    if (annotation.y + containerHeight > windowHeight - padding) {
      adjustedY = Math.max(minY, windowHeight - containerHeight - padding);
    }

    // Проверяем верхнюю границу
    if (annotation.y < padding) {
      adjustedY = minY;
    }

    return { x: adjustedX, y: adjustedY };
  };

  const handleEditText = (annotation: Annotation) => {
    if (annotation.type === 'text') {
      setEditingAnnotation(annotation.id);
      setEditingText(annotation.content || '');
      setSelectedAnnotation(null);
      // Сбрасываем скорректированную позицию - она будет вычислена после получения размеров контейнера
      setAdjustedEditingPosition(null);
    }
  };

  const getTextStyleUpdates = (ann: Annotation | null): Partial<Annotation> => {
    if (!ann || ann.type !== 'text') return {};
    return {
      ...(ann.color != null ? { color: ann.color } : {}),
      ...(ann.fontSize != null ? { fontSize: ann.fontSize } : {}),
      ...(ann.fontFamily != null ? { fontFamily: ann.fontFamily } : {}),
    };
  };

  const handleTextSubmit = () => {
    if (editingAnnotation && editingText.trim() !== '') {
      onAnnotationUpdate(editingAnnotation, { content: editingText });
      // Не закрываем редактирование автоматически - пользователь может продолжить редактировать
    }
  };

  const handleTextChange = (text: string) => {
    // Если пользователь начинает стирать стандартный текст "Новый текст", удаляем его целиком
    if (editingText === 'Новый текст' && text.length < editingText.length) {
      setEditingText('');
      if (editingAnnotation) {
        onAnnotationUpdate(editingAnnotation, { content: '' });
      }
      return;
    }
    
    setEditingText(text);
    // Сохраняем изменения в реальном времени
    if (editingAnnotation) {
      onAnnotationUpdate(editingAnnotation, { content: text });
    }
  };

  const handleCloseEditing = () => {
    if (editingAnnotation) {
      const current = annotations.find(ann => ann.id === editingAnnotation) || null;
      const shouldSnap =
        !!current &&
        current.type === 'text' &&
        !!lineGuideId &&
        typeof viewportHeight === 'number' &&
        viewportHeight > 0 &&
        typeof current.page === 'number';
      const snappedY = shouldSnap
        ? snapYToNearestTemplateLine({
            lineGuideId,
            page: current!.page as number,
            y: current!.y,
            viewportHeight,
          })
        : null;

      // Сохраняем финальные изменения, явно передаём стиль, чтобы шрифт/размер/цвет не терялись
      const styleUpdates = current && current.type === 'text' ? getTextStyleUpdates(current) : {};
      onAnnotationUpdate(editingAnnotation, {
        content: editingText,
        ...(typeof snappedY === 'number' ? { y: snappedY } : {}),
        ...styleUpdates,
      });
      // Запоминаем последний стиль при закрытии редактирования
      if (current && current.type === 'text' && (current.color != null || current.fontSize != null || current.fontFamily != null)) {
        const fontToSave = current.fontFamily;
        if (fontToSave) AsyncStorage.setItem('@last_text_font_family', fontToSave).catch(() => {});
        AsyncStorage.getItem('@last_text_style').then((raw) => {
          let existingFont: string | undefined;
          if (raw) try { existingFont = (JSON.parse(raw) as { fontFamily?: string }).fontFamily; } catch (_) {}
          const lastStyle = {
            color: current!.color ?? '#000000',
            fontSize: current!.fontSize ?? 16,
            fontFamily: current!.fontFamily ?? existingFont,
          };
          AsyncStorage.setItem('@last_text_style', JSON.stringify(lastStyle)).catch(() => {});
        }).catch(() => {});
      }
      setEditingAnnotation(null);
      setEditingText('');
      setIsDraggingWhileEditing(false);
      setAdjustedEditingPosition(null);
      editingContainerLayout.current = null;
      editingDragResponder.current = null;
      editingDragState.current = null;
      isDraggingWhileEditingRef.current = false;
      adjustedEditingPositionRef.current = null;
      onEditingStateChange?.(false, null);
    }
  };

  // Публичная функция для закрытия редактирования извне
  React.useImperativeHandle(ref, () => ({
    closeEditing: handleCloseEditing,
    openColorPicker: () => {
      if (editingAnnotation) {
        setShowColorPicker(true);
      }
    },
    openFontSizePicker: () => {
      if (editingAnnotation) {
        setShowFontSizePicker(true);
      }
    },
    openFontPicker: () => {
      if (editingAnnotation) {
        setShowFontPicker(true);
      }
    },
    startEditing: (annotationId: string) => {
      const annotation = annotations.find(ann => ann.id === annotationId);
      if (!annotation || annotation.type !== 'text') return;
      setEditingAnnotation(annotationId);
      setEditingText(annotation.content || '');
      setSelectedAnnotation(null);
      setAdjustedEditingPosition(null);
    },
    clearSelection: () => {
      setSelectedAnnotation(null);
      setShowZIndexMenu(false);
      setZIndexAnnotationId(null);
    },
  }), [editingAnnotation, editingText, onAnnotationUpdate, onEditingStateChange]);

  const handleColorSelect = (color: string) => {
    if (editingAnnotation) {
      onAnnotationUpdate(editingAnnotation, { color });
      const currentAnnotation = annotations.find(ann => ann.id === editingAnnotation);
      if (currentAnnotation && currentAnnotation.type === 'text') {
        const ff = currentAnnotation.fontFamily;
        if (ff) AsyncStorage.setItem('@last_text_font_family', ff).catch(() => {});
        const newStyle = { color, fontSize: currentAnnotation.fontSize, fontFamily: ff };
        AsyncStorage.setItem('@last_text_style', JSON.stringify(newStyle)).catch(() => {});
      }
      setShowColorPicker(false);
    }
  };

  const handleFontSizeSelect = (size: number) => {
    if (editingAnnotation) {
      onAnnotationUpdate(editingAnnotation, { fontSize: size });
      const currentAnnotation = annotations.find(ann => ann.id === editingAnnotation);
      if (currentAnnotation && currentAnnotation.type === 'text') {
        const ff = currentAnnotation.fontFamily;
        if (ff) AsyncStorage.setItem('@last_text_font_family', ff).catch(() => {});
        const newStyle = { color: currentAnnotation.color, fontSize: size, fontFamily: ff };
        AsyncStorage.setItem('@last_text_style', JSON.stringify(newStyle)).catch(() => {});
      }
      setShowFontSizePicker(false);
    }
  };

  const handleFontSelect = (fontId: string) => {
    if (editingAnnotation) {
      onAnnotationUpdate(editingAnnotation, { fontFamily: fontId });
      AsyncStorage.setItem('@last_text_font_family', fontId).catch(() => {});
      const currentAnnotation = annotations.find(ann => ann.id === editingAnnotation);
      if (currentAnnotation && currentAnnotation.type === 'text') {
        const newStyle = {
          color: currentAnnotation.color,
          fontSize: currentAnnotation.fontSize,
          fontFamily: fontId,
        };
        AsyncStorage.setItem('@last_text_style', JSON.stringify(newStyle)).catch((error) => {
          console.error('Error saving last text style:', error);
        });
      }
      setShowFontPicker(false);
    }
  };

  const handleZIndexChange = (direction: 'forward' | 'backward') => {
    if (!zIndexAnnotationId) return;

    const annotation = annotations.find(ann => ann.id === zIndexAnnotationId);
    if (!annotation) return;

    const maxZIndex = Math.max(...annotations.map(ann => ann.zIndex), 0);
    const minZIndex = Math.min(...annotations.map(ann => ann.zIndex), 0);

    let newZIndex = annotation.zIndex;
    if (direction === 'forward') {
      newZIndex = Math.min(annotation.zIndex + 1, maxZIndex + 1);
    } else {
      newZIndex = Math.max(annotation.zIndex - 1, minZIndex - 1);
    }

    onAnnotationUpdate(zIndexAnnotationId, { zIndex: newZIndex });
    setShowZIndexMenu(false);
    setZIndexAnnotationId(null);
  };

  const getAnnotationBoundsSize = (annotation: Annotation) => {
    if (annotation.type === 'text') {
      const measured = measuredTextSizesRef.current.get(annotation.id);
      if (measured) return { width: Math.max(1, measured.width), height: Math.max(1, measured.height) };
      const fontSize = annotation.fontSize || 16;
      const text = (annotation.id === editingAnnotation ? editingText : annotation.content) || '';
      const maxWidth = annotation.width || 360;
      // Рассчитываем приблизительную ширину одной строки
      const charsPerLine = Math.floor((maxWidth - 12) / (fontSize * 0.62));
      // Рассчитываем количество строк для многострочного текста
      const numLines = charsPerLine > 0 ? Math.ceil(text.length / charsPerLine) : 1;
      const approxWidth = Math.max(24, Math.min(maxWidth, Math.ceil(text.length * fontSize * 0.62) + 12));
      // Высота зависит от количества строк
      const approxHeight = Math.max(24, Math.ceil(fontSize * 1.2 * numLines) + 8);
      return { width: approxWidth, height: approxHeight };
    }
    return { width: annotation.width || 120, height: annotation.height || 120 };
  };

  type ResizeCorner = 'tl' | 'tr' | 'bl' | 'br';
  const imageResizeResponders = useRef<Record<string, any>>({});

  const createImageResizeResponder = (params: { annotationId: string; corner: ResizeCorner }) => {
    const { annotationId, corner } = params;
    const key = `${annotationId}:${corner}`;
    if (imageResizeResponders.current[key]) return imageResizeResponders.current[key];

    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;
    let startLeft = 0;
    let startTop = 0;

    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => {
        // Активируем только если изображение выбрано и в режиме редактирования
        // Используем ref для получения актуального значения
        return isEditing && selectedAnnotationRef.current === annotationId;
      },
      onStartShouldSetPanResponderCapture: () => {
        // Перехватываем события для ручек с высоким приоритетом
        // Используем ref для получения актуального значения
        return isEditing && selectedAnnotationRef.current === annotationId;
      },
      onMoveShouldSetPanResponder: () => {
        // Активируем при движении, если изображение выбрано
        // Используем ref для получения актуального значения
        return isEditing && selectedAnnotationRef.current === annotationId;
      },
      onMoveShouldSetPanResponderCapture: () => {
        // Перехватываем движение для ручек с высоким приоритетом
        // Используем ref для получения актуального значения
        return isEditing && selectedAnnotationRef.current === annotationId;
      },
      onPanResponderGrant: (evt) => {
        const ann = annotations.find(a => a.id === annotationId);
        if (!ann || ann.type !== 'image') return;
        // Помечаем, что началось взаимодействие
        isInteractingRef.current = true;
        // Используем актуальную позицию из localPositionsRef, если она есть
        // Это важно, чтобы при изменении размера после перетаскивания использовалась новая позиция
        const localPos = localPositionsRef.current.get(annotationId);
        const currentX = localPos?.x ?? ann.x;
        const currentY = localPos?.y ?? ann.y;
        const display = { x: currentX, y: currentY };
        startLeft = display.x;
        startTop = display.y;
        startX = display.x;
        startY = display.y;
        startW = ann.width;
        startH = ann.height;
        onInteractionChange?.(true);
        // Останавливаем распространение события, чтобы основной PanResponder не мешал
        evt.stopPropagation?.();
      },
      onPanResponderMove: (evt, gestureState) => {
        const ann = annotations.find(a => a.id === annotationId);
        if (!ann || ann.type !== 'image') return;

        // gestureState.dx и dy - это смещение от начала жеста (onPanResponderGrant)
        // Поэтому используем startLeft и startTop из onPanResponderGrant, а не текущую позицию
        const safeZoom = zoomLevel > 0 ? zoomLevel : 1;
        const dx = gestureState.dx / safeZoom;
        const dy = gestureState.dy / safeZoom;

        const viewportW = typeof viewportWidth === 'number' && viewportWidth > 0 ? viewportWidth : windowWidth;
        const viewportH = typeof viewportHeight === 'number' && viewportHeight > 0 ? viewportHeight : windowHeight;

        const minSize = 40;
        let nextLeft = startLeft;
        let nextTop = startTop;
        let nextW = startW;
        let nextH = startH;

        // Вычисляем новую позицию и размер в зависимости от угла
        if (corner === 'tl') {
          // Левый верхний угол: двигаем левый верхний угол, изменяем размер
          nextLeft = startLeft + dx;
          nextTop = startTop + dy;
          nextW = startW - dx;
          nextH = startH - dy;
        } else if (corner === 'tr') {
          // Правый верхний угол: двигаем правый верхний угол, изменяем размер
          nextTop = startTop + dy;
          nextW = startW + dx;
          nextH = startH - dy;
        } else if (corner === 'bl') {
          // Левый нижний угол: двигаем левый нижний угол, изменяем размер
          nextLeft = startLeft + dx;
          nextW = startW - dx;
          nextH = startH + dy;
        } else if (corner === 'br') {
          // Правый нижний угол: только изменяем размер, позиция не меняется
          nextW = startW + dx;
          nextH = startH + dy;
        }

        // Ограничиваем минимальный размер
        nextW = Math.max(minSize, nextW);
        nextH = Math.max(minSize, nextH);

        // Корректируем позицию, если размер изменился и нужно сохранить противоположный угол
        // Это важно для углов, которые не являются правым нижним
        if (corner === 'tl') {
          // Если размер стал меньше минимального, корректируем позицию
          if (nextW < minSize) {
            nextLeft = startLeft + startW - minSize;
            nextW = minSize;
          }
          if (nextH < minSize) {
            nextTop = startTop + startH - minSize;
            nextH = minSize;
          }
        } else if (corner === 'tr') {
          if (nextH < minSize) {
            nextTop = startTop + startH - minSize;
            nextH = minSize;
          }
        } else if (corner === 'bl') {
          if (nextW < minSize) {
            nextLeft = startLeft + startW - minSize;
            nextW = minSize;
          }
        }

        // Clamp внутри вьюпорта
        nextLeft = Math.max(0, Math.min(nextLeft, viewportW - nextW));
        nextTop = Math.max(0, Math.min(nextTop, viewportH - nextH));

        // Обновляем локальную позицию для мгновенного отображения
        setLocalPosition(annotationId, { x: nextLeft, y: nextTop });
        // Обновляем размер и позицию одновременно в родителе
        // Это гарантирует, что позиция не сбросится при обновлении размера
        onAnnotationUpdate(annotationId, { 
          x: nextLeft, 
          y: nextTop, 
          width: nextW, 
          height: nextH 
        });
      },
      onPanResponderRelease: () => {
        // Получаем актуальную позицию из localPositionsRef
        const latestPos = localPositionsRef.current.get(annotationId);
        if (latestPos) {
          // Сохраняем в pendingCommit для синхронизации
          pendingCommitRef.current.set(annotationId, latestPos);
          // Обновляем позицию в родителе только после завершения изменения размера
          // Это гарантирует, что позиция не сбросится
          onAnnotationUpdate(annotationId, { x: latestPos.x, y: latestPos.y });
        }
        // Снимаем флаг взаимодействия с небольшой задержкой, чтобы дать время обновиться аннотации
        setTimeout(() => {
          isInteractingRef.current = false;
        }, 100);
        onInteractionChange?.(false);
      },
      onPanResponderTerminate: () => {
        // Снимаем флаг взаимодействия
        setTimeout(() => {
          isInteractingRef.current = false;
        }, 100);
        onInteractionChange?.(false);
      },
    });

    imageResizeResponders.current[key] = responder;
    return responder;
  };

  // Создаем PanResponder для перетаскивания во время редактирования
  const createEditingDragResponder = (annotation: Annotation) => {
    // Создаем PanResponder один раз и переиспользуем
    // Используем ref для доступа к актуальному состоянию
    if (!editingDragResponder.current) {
      editingDragResponder.current = PanResponder.create({
        onStartShouldSetPanResponder: () => {
          // Активируем только если режим перетаскивания активен
          return isDraggingWhileEditingRef.current;
        },
        onStartShouldSetPanResponderCapture: () => {
          // Перехватываем события только если режим перетаскивания активен
          // Это важно для обработки событий, начатых на дочерних элементах (кнопках)
          return isDraggingWhileEditingRef.current;
        },
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Активируем при движении, если режим перетаскивания активен
          if (isDraggingWhileEditingRef.current) {
            // Активируем сразу при любом движении
            return true;
          }
          return false;
        },
        onMoveShouldSetPanResponderCapture: () => {
          // Перехватываем движение только если режим перетаскивания активен
          return isDraggingWhileEditingRef.current;
        },
        onPanResponderGrant: (evt) => {
          // Получаем актуальные координаты из аннотации или скорректированной позиции
          const currentAnnotation = annotations.find(ann => ann.id === annotation.id);
          const currentPos = adjustedEditingPositionRef.current;
          const startX = currentPos?.x ?? (currentAnnotation?.x ?? annotation.x);
          const startY = currentPos?.y ?? (currentAnnotation?.y ?? annotation.y);
          
          // Инициализируем состояние перетаскивания
          editingDragState.current = {
            startX,
            startY,
            isDraggingStarted: true,
          };
          
          // Плавная анимация масштаба и прозрачности при начале перетаскивания
          Animated.parallel([
            Animated.spring(dragScaleAnim, {
              toValue: 1.05,
              tension: 100,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.timing(dragOpacityAnim, {
              toValue: 0.95,
              duration: 150,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start();
          
          onInteractionChange?.(true);
        },
        onPanResponderMove: (evt, gestureState) => {
          if (!editingDragState.current || !editingDragState.current.isDraggingStarted) return;
          
          // Получаем актуальную аннотацию для правильного расчета границ
          const currentAnnotation = annotations.find(ann => ann.id === annotation.id);
          const ann = currentAnnotation || annotation;
          
          const safeZoom = zoomLevel > 0 ? zoomLevel : 1;
          const dx = gestureState.dx / safeZoom;
          const dy = gestureState.dy / safeZoom;
          const viewportW = typeof viewportWidth === 'number' && viewportWidth > 0 ? viewportWidth : windowWidth;
          const viewportH = typeof viewportHeight === 'number' && viewportHeight > 0 ? viewportHeight : windowHeight;

          // В режиме переноса через оранжевую кнопку двигаем по размеру текста,
          // иначе "редактор" (minWidth 200) создаёт стену на середине.
          const bounds = getAnnotationBoundsSize(ann);
          // Для текста используем минимальную ширину (24px) при расчете правой границы,
          // чтобы текст мог доехать до самого правого края, даже если окно редактирования шире
          const minTextWidth = 24;
          const effectiveWidth = ann.type === 'text' ? minTextWidth : bounds.width;
          const newX = Math.max(0, Math.min(editingDragState.current.startX + dx, viewportW - effectiveWidth));
          const newY = Math.max(0, Math.min(editingDragState.current.startY + dy, viewportH - bounds.height));

          // Плавное обновление позиции
          setLocalPosition(annotation.id, { x: newX, y: newY });
          setAdjustedEditingPosition({ x: newX, y: newY });
        },
        onPanResponderRelease: () => {
          if (editingDragState.current) {
            editingDragState.current.isDraggingStarted = false;
          }
          const latest = localPositionsRef.current.get(annotation.id);
          if (latest) {
            pendingCommitRef.current.set(annotation.id, latest);
            onAnnotationUpdate(annotation.id, { x: latest.x, y: latest.y });
          }
          
          // Плавная анимация возврата масштаба и прозрачности после перетаскивания
          Animated.parallel([
            Animated.spring(dragScaleAnim, {
              toValue: 1,
              tension: 100,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.timing(dragOpacityAnim, {
              toValue: 1,
              duration: 150,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start();
          
          onInteractionChange?.(false);
        },
        onPanResponderTerminate: () => {
          if (editingDragState.current) {
            editingDragState.current.isDraggingStarted = false;
          }
          // Возвращаем анимации в исходное состояние
          Animated.parallel([
            Animated.spring(dragScaleAnim, {
              toValue: 1,
              tension: 100,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.timing(dragOpacityAnim, {
              toValue: 1,
              duration: 150,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start();
          onInteractionChange?.(false);
        },
      });
    }

    return editingDragResponder.current;
  };

  // Получаем имя шрифта для React Native из ID шрифта
  const getFontFamilyName = (fontId?: string): string | undefined => {
    if (!fontId || fontId === 'default') return undefined;
    const font = AVAILABLE_FONTS.find(f => f.id === fontId);
    if (!font) return undefined;
    // В React Native с expo-font шрифты доступны по имени, указанному в useFonts
    // Используем font.name, которое соответствует ключу в useFonts
    // Если шрифты еще не загружены, все равно возвращаем имя - React Native попытается использовать его
    return font.name;
  };

  const renderAnnotation = (annotation: Annotation) => {
    const isEditingText = editingAnnotation === annotation.id;
    const isSelected = selectedAnnotation === annotation.id;
    const panResponder = createPanResponder(annotation);
    const currentColor = annotation.color || '#000000';
    const currentFontSize = annotation.fontSize || 16;
    const currentFontFamily = getFontFamilyName(annotation.fontFamily);

    if (annotation.type === 'text') {
      const basePos = getDisplayPosition(annotation);
      // Используем скорректированные координаты при редактировании, если они есть
      const displayX = isEditingText && adjustedEditingPosition ? adjustedEditingPosition.x : basePos.x;
      const displayY = isEditingText && adjustedEditingPosition ? adjustedEditingPosition.y : basePos.y;

      const metrics =
        lineGuideId && typeof viewportHeight === 'number' && viewportHeight > 0
          ? getTemplateTextLineMetrics({
              lineGuideId,
              page: annotation.page,
              y: displayY,
              viewportHeight,
            })
          : null;
      const alignedLineHeight = metrics?.lineHeight ?? null;
      const alignedFontSize =
        alignedLineHeight && alignedLineHeight > 0 ? Math.min(currentFontSize, Math.max(8, alignedLineHeight * 0.88)) : currentFontSize;

      return (
      <Animated.View
        key={annotation.id}
        {...(isEditingText ? (createEditingDragResponder(annotation)?.panHandlers || {}) : panResponder?.panHandlers || {})}
        style={[
          styles.annotation,
          {
            left: displayX,
            top: displayY,
            width: annotation.width,
            // Высота должна быть динамической для многострочного текста
            // Используем minHeight вместо фиксированной height, чтобы текст мог расширяться
            minHeight: annotation.height || 24,
            // Используем очень высокий z-index для редактируемого текста, чтобы он был поверх всех страниц
            zIndex: isEditingText ? 99999 : annotation.zIndex,
            transform: [
              { 
                scale: isEditingText 
                  ? (isDraggingWhileEditing 
                      ? Animated.multiply(editingScaleAnim, dragScaleAnim)
                      : editingScaleAnim)
                  : 1 
              },
            ],
            opacity: isEditingText
              ? (isDraggingWhileEditing
                  ? Animated.multiply(editingOpacityAnim, dragOpacityAnim)
                  : editingOpacityAnim)
              : 1,
          },
          isSelected && styles.annotationSelected,
          isDragging && isSelected && styles.annotationDragging,
        ]}
        pointerEvents={isEditingText && isDraggingWhileEditing ? "auto" : "box-none"}
      >
          {isEditingText ? (
            <>
              <Animated.View 
                style={[
                  styles.textEditingContainer,
                  {
                    transform: [{ scale: editingScaleAnim }],
                    opacity: editingOpacityAnim,
                  },
                ]} 
                pointerEvents={isDraggingWhileEditing ? "auto" : "box-none"}
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  const previousLayout = editingContainerLayout.current;
                  // Сохраняем размеры контейнера
                  editingContainerLayout.current = { width, height };
                  
                  // Вычисляем корректную позицию с учетом границ экрана
                  // Пересчитываем, если позиция еще не вычислена или размеры контейнера изменились
                  const needsRecalculation = !adjustedEditingPosition || 
                    !previousLayout || 
                    previousLayout.width !== width || 
                    previousLayout.height !== height;
                  
                  if (needsRecalculation) {
                    // Получаем актуальную позицию аннотации
                    const currentAnnotation = annotations.find(ann => ann.id === annotation.id);
                    const currentX = currentAnnotation?.x ?? annotation.x;
                    const currentY = currentAnnotation?.y ?? annotation.y;
                    
                    const adjusted = calculateAdjustedPosition(
                      { ...annotation, x: currentX, y: currentY },
                      width,
                      height
                    );
                    setAdjustedEditingPosition(adjusted);
                    
                    // Обновляем позицию аннотации, если она была скорректирована
                    if (adjusted.x !== currentX || adjusted.y !== currentY) {
                      onAnnotationUpdate(annotation.id, { x: adjusted.x, y: adjusted.y });
                    }
                  }
                }}
              >
                <View pointerEvents={isDraggingWhileEditing ? "none" : "auto"}>
                  <TextInput
                    style={[
                      styles.textAnnotation,
                      styles.textInput,
                      {
                        color: currentColor,
                        fontSize: alignedFontSize,
                        fontFamily: currentFontFamily,
                        // Единый базовый стиль для всех PDF
                        lineHeight: alignedFontSize * 1.2, // Небольшие отступы между строками
                        includeFontPadding: false, // Единый размер курсора
                        textAlignVertical: 'center', // Центрирование текста по вертикали
                        paddingTop: 0,
                        paddingBottom: 0,
                      },
                    ]}
                    value={editingText}
                    onChangeText={handleTextChange}
                    onSubmitEditing={handleTextSubmit}
                    onBlur={handleTextSubmit}
                    autoFocus={!isDraggingWhileEditing}
                    multiline
                    placeholder="Введите текст..."
                    placeholderTextColor={currentColor + '80'}
                    editable={!isDraggingWhileEditing}
                    selectTextOnFocus={false}
                  />
                </View>
                {/* Кнопки: Перетащить (оранжевая), Принять и Удалить за полем ввода */}
                <View style={styles.textActionButtons} pointerEvents={isDraggingWhileEditing ? "none" : "auto"}>
                  <View
                    style={[styles.actionButton, styles.dragButton]}
                    {...(dragButtonResponderRef.current?.panHandlers || {})}
                  >
                    <Ionicons name="move" size={18} color="#FFFFFF" />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.actionButton, 
                      styles.acceptButton,
                      isDraggingWhileEditing && styles.buttonDisabled
                    ]}
                    onPress={handleCloseEditing}
                    activeOpacity={0.7}
                    disabled={isDraggingWhileEditing}
                  >
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton, 
                      styles.removeButton,
                      isDraggingWhileEditing && styles.buttonDisabled
                    ]}
                    onPress={() => {
                      onAnnotationDelete(annotation.id);
                      setEditingAnnotation(null);
                      setEditingText('');
                      Keyboard.dismiss();
                    }}
                    activeOpacity={0.7}
                    disabled={isDraggingWhileEditing}
                  >
                    <Ionicons name="trash" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </>
          ) : (
            <View
              style={styles.textContainer}
              {...(panResponder?.panHandlers || {})}
            >
              <View
                style={styles.textContent}
                onStartShouldSetResponder={() => false}
                onMoveShouldSetResponder={() => false}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onLongPress={() => handleAnnotationLongPress(annotation)}
                  delayLongPress={400}
                  disabled={isDragging || isSelected}
                >
                  <Text
                    style={[
                      styles.textAnnotation,
                      {
                        color: currentColor,
                        fontSize: alignedFontSize,
                        fontFamily: currentFontFamily,
                        maxWidth: annotation.width || 360, // Ограничиваем ширину для автоматического переноса
                        textAlign: 'left', // Выравниваем текст по левому краю для правильного переноса
                        // Единый базовый стиль для всех PDF
                        lineHeight: alignedFontSize * 1.2, // Небольшие отступы между строками
                        includeFontPadding: false, // Единый размер для всех
                      },
                    ]}
                    onLayout={(event) => {
                      const { width, height } = event.nativeEvent.layout;
                      if (!width || !height) return;
                      const prev = measuredTextSizesRef.current.get(annotation.id);
                      if (prev && prev.width === width && prev.height === height) return;
                      measuredTextSizesRef.current.set(annotation.id, { width, height });
                      setMeasuredVersion((v) => v + 1);
                    }}
                  >
                    {annotation.content || ''}
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Прямоугольник с обводкой при выборе текста - показывается всегда при выборе */}
              {isSelected && isEditing && (
                <View style={styles.textSelectionBorder} />
              )}
              {/* Кнопки редактирования при долгом нажатии */}
              {isSelected && isEditing && !isDragging && (
                <View style={styles.textControlsOverlay}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditText(annotation)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>Редактировать</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteTextButton}
                    onPress={() => {
                      onAnnotationDelete(annotation.id);
                      setSelectedAnnotation(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
              {isDragging && isSelected && (
                <View style={styles.dragIndicator}>
                  <Ionicons name="move-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.dragHint}>Перетаскивание...</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      );
    }

    if (annotation.type === 'image') {
      const basePos = getDisplayPosition(annotation);
      const resizeResponderTL = createImageResizeResponder({ annotationId: annotation.id, corner: 'tl' });
      const resizeResponderTR = createImageResizeResponder({ annotationId: annotation.id, corner: 'tr' });
      const resizeResponderBL = createImageResizeResponder({ annotationId: annotation.id, corner: 'bl' });
      const resizeResponderBR = createImageResizeResponder({ annotationId: annotation.id, corner: 'br' });
      
      return (
        <View
          key={annotation.id}
          style={[
            styles.annotation,
            {
              left: basePos.x,
              top: basePos.y,
              width: annotation.width,
              height: annotation.height,
              zIndex: annotation.zIndex,
            },
            isSelected && styles.annotationSelected,
            isDragging && isSelected && styles.annotationDragging,
          ]}
        >
          {/* Основной PanResponder для перетаскивания - всегда в режиме редактирования для выбора при тапе */}
          <View
            {...(isEditing && panResponder ? panResponder.panHandlers : {})}
            style={styles.imageContainer}
            pointerEvents={isEditing ? 'auto' : 'box-none'}
          >
            <Image
              source={{ uri: annotation.imageUri }}
              style={styles.imageAnnotation}
              contentFit="cover"
              priority="high"
              cachePolicy="disk"
              transition={0}
              fadeDuration={0}
              // Улучшаем качество изображения при изменении размера
              recyclingKey={annotation.id}
              // Используем максимальное качество рендеринга
              contentPosition="center"
            />
          </View>
          {/* Ручки отображаются только если изображение выбрано, режим редактирования активен, 
              и НЕ редактируется текст (чтобы ручки не появлялись при редактировании текста) */}
          {isSelected && isEditing && !editingAnnotation && (() => {
            // Вычисляем адаптивный размер шрифта на основе размера изображения
            const imageWidth = annotation.width || 120;
            const imageHeight = annotation.height || 120;
            const imageSize = Math.min(imageWidth, imageHeight);
            // Размер шрифта от 8 до 14, в зависимости от размера изображения
            // Минимальный размер изображения для полного текста: ~100px
            const minImageSize = 60;
            const maxImageSize = 200;
            const minFontSize = 8;
            const maxFontSize = 14;
            const fontSize = Math.max(
              minFontSize,
              Math.min(
                maxFontSize,
                minFontSize + ((imageSize - minImageSize) / (maxImageSize - minImageSize)) * (maxFontSize - minFontSize)
              )
            );
            // Размер иконки также адаптивный
            const iconSize = Math.max(12, Math.min(16, fontSize + 2));
            
            return (
              <>
                <View 
                  key="drag-indicator" 
                  style={[
                    styles.dragIndicator,
                    { maxWidth: Math.max(80, imageWidth - 10) } // Ограничиваем ширину размером изображения
                  ]}
                >
                  <Ionicons name="move-outline" size={iconSize} color="#8B6F5F" />
                  <Text 
                    style={[styles.dragHint, { fontSize }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Перетащите
                  </Text>
                </View>
                {/* Ручки для изменения размера фото - с высоким z-index и pointerEvents */}
                {/* Ручки должны быть поверх всего и иметь приоритет */}
                <View
                  style={[styles.resizeHandle, styles.resizeHandleTL]}
                  {...(resizeResponderTL?.panHandlers || {})}
                  pointerEvents="box-only"
                  collapsable={false}
                />
                <View
                  style={[styles.resizeHandle, styles.resizeHandleTR]}
                  {...(resizeResponderTR?.panHandlers || {})}
                  pointerEvents="box-only"
                  collapsable={false}
                />
                <View
                  style={[styles.resizeHandle, styles.resizeHandleBL]}
                  {...(resizeResponderBL?.panHandlers || {})}
                  pointerEvents="box-only"
                  collapsable={false}
                />
                <View
                  style={[styles.resizeHandle, styles.resizeHandleBR]}
                  {...(resizeResponderBR?.panHandlers || {})}
                  pointerEvents="box-only"
                  collapsable={false}
                />
              </>
            );
          })()}
          {isEditing && (
            <View style={styles.imageControls}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onAnnotationDelete(annotation.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#FF4444" />
              </TouchableOpacity>
            </View>
          )}

        </View>
      );
    }

    return null;
  };

  const currentEditingAnnotation = editingAnnotation 
    ? annotations.find(ann => ann.id === editingAnnotation)
    : null;

  return (
    <>
      <View 
        style={[
          styles.container,
          // Когда инструмент активен и нет редактируемых аннотаций, пропускаем события через контейнер
          // чтобы они дошли до TouchableOpacity в ImageViewer
          currentTool && !editingAnnotation && { pointerEvents: 'box-none' }
        ]}
      >
        {annotations.map(renderAnnotation)}
      </View>


      {/* Модальное окно выбора цвета */}
      <Modal
        visible={showColorPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowColorPicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Выберите цвет</Text>
            <View style={styles.colorGrid}>
              {APP_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: color,
                      borderColor: color === '#FFFFFF' ? '#E8D5C7' : 'transparent',
                      borderWidth: color === '#FFFFFF' ? 2 : 0,
                    },
                    currentEditingAnnotation?.color === color &&
                      styles.colorOptionSelected,
                  ]}
                  onPress={() => handleColorSelect(color)}
                  activeOpacity={0.7}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowColorPicker(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelButtonText}>Готово</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Модальное окно выбора размера шрифта */}
      <Modal
        visible={showFontSizePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFontSizePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFontSizePicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Выберите размер</Text>
            <ScrollView style={styles.fontSizeList} showsVerticalScrollIndicator={false}>
              {FONT_SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.fontSizeOption,
                    currentEditingAnnotation?.fontSize === size &&
                      styles.fontSizeOptionSelected,
                  ]}
                  onPress={() => handleFontSizeSelect(size)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.fontSizeText,
                      { fontSize: size },
                      currentEditingAnnotation?.fontSize === size &&
                        styles.fontSizeTextSelected,
                    ]}
                  >
                    {size}px - Пример текста
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowFontSizePicker(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelButtonText}>Готово</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Модальное окно выбора шрифта */}
      <Modal
        visible={showFontPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFontPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFontPicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Выберите шрифт</Text>
            <ScrollView style={styles.fontList} showsVerticalScrollIndicator={false}>
              {AVAILABLE_FONTS.map((font) => (
                <TouchableOpacity
                  key={font.id}
                  style={[
                    styles.fontOption,
                    (currentEditingAnnotation?.fontFamily || 'default') === font.id &&
                      styles.fontOptionSelected,
                  ]}
                  onPress={() => handleFontSelect(font.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.fontOptionText,
                      {
                        fontFamily: font.id === 'default' 
                          ? Platform.select({
                              ios: 'System',
                              android: 'sans-serif',
                              default: 'sans-serif',
                            })
                          : font.name,
                      },
                      (currentEditingAnnotation?.fontFamily || 'default') === font.id &&
                        styles.fontOptionTextSelected,
                    ]}
                  >
                    {font.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowFontPicker(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelButtonText}>Готово</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Модальное окно изменения z-index */}
      <Modal
        visible={showZIndexMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowZIndexMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowZIndexMenu(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Порядок отображения</Text>
            <View style={styles.zIndexActions}>
              <TouchableOpacity
                style={[styles.zIndexButton, styles.forwardButton]}
                onPress={() => handleZIndexChange('forward')}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-up-outline" size={24} color="#FFFFFF" />
                <Text style={styles.zIndexButtonText}>На передний план</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.zIndexButton, styles.backwardButton]}
                onPress={() => handleZIndexChange('backward')}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-down-outline" size={24} color="#FFFFFF" />
                <Text style={styles.zIndexButtonText}>На задний план</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowZIndexMenu(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

// Устанавливаем displayName до экспорта
if (!PdfAnnotations.displayName) {
  PdfAnnotations.displayName = 'PdfAnnotations';
}

export default PdfAnnotations;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  annotation: {
    position: 'absolute',
    pointerEvents: 'auto',
  },
  annotationSelected: {
    opacity: 0.9,
  },
  annotationDragging: {
    opacity: 0.7,
    transform: [{ scale: 1.05 }],
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    position: 'relative',
    width: '100%',
    padding: 0, // Убираем отступы контейнера
    margin: 0,
  },
  textContent: {
    width: '100%',
    flexShrink: 1, // Позволяет контейнеру сжиматься для переноса текста
    padding: 0, // Убираем отступы контента
    margin: 0,
    alignItems: 'flex-start', // Выравниваем содержимое по левому краю
  },
  textSelectionBorder: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 2,
    borderColor: '#C9A89A',
    borderRadius: 4,
    borderStyle: 'dashed',
    pointerEvents: 'none',
  },
  textControlsOverlay: {
    position: 'absolute',
    top: -50,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(139, 111, 95, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 168, 154, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  editButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  deleteTextButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.8)',
    padding: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textAnnotation: {
    backgroundColor: 'transparent',
    padding: 0, // Убираем отступы, чтобы текст начинался с начала строки
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: 24,
    flexWrap: 'wrap', // Позволяет тексту переноситься на новую строку
    textAlign: 'left', // Выравниваем текст по левому краю
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#C9A89A',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    minHeight: 50,
    textAlignVertical: 'center', // Центрирование по умолчанию для всех
    includeFontPadding: false, // Единый размер курсора для всех
    paddingVertical: 8, // Небольшие вертикальные отступы
  },
  textEditingContainer: {
    flex: 1,
    minWidth: 200,
  },
  textActionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dragButton: {
    backgroundColor: '#FF8C42',
  },
  acceptButton: {
    backgroundColor: '#4ECDC4',
  },
  removeButton: {
    backgroundColor: '#FF4444',
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  keyboardToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  toolbarContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    gap: 8,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toolbarButtonText: {
    fontSize: 14,
    color: '#8B6F5F',
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  textControls: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    gap: 6,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  controlButtonText: {
    fontSize: 14,
    color: '#8B6F5F',
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8D5C7',
  },
  deleteButton: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFE0E0',
  },
  closeButton: {
    backgroundColor: '#F0FFF4',
    borderColor: '#C6F6D5',
  },
  dragIndicator: {
    position: 'absolute',
    top: -30,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#C9A89A',
    gap: 4,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '100%', // Ограничиваем ширину для обрезки текста
  },
  dragHint: {
    color: '#8B6F5F',
    fontWeight: '400',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    // fontSize будет задаваться динамически
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    pointerEvents: 'auto',
  },
  imageAnnotation: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C9A89A',
  },
  imageControls: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: '#C9A89A',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  resizeHandle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4A90E2',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 15,
    zIndex: 100000,
    // Увеличиваем область нажатия для удобства, но не слишком много
    margin: -4,
    // Убеждаемся, что ручки всегда видны и кликабельны
    overflow: 'visible',
  },
  resizeHandleTL: {
    top: -8,
    left: -8,
  },
  resizeHandleTR: {
    top: -8,
    right: -8,
  },
  resizeHandleBL: {
    bottom: -8,
    left: -8,
  },
  resizeHandleBR: {
    bottom: -8,
    right: -8,
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
    maxHeight: '80%',
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
    marginBottom: 24,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  colorOption: {
    width: 52,
    height: 52,
    borderRadius: 26,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  colorOptionSelected: {
    borderWidth: 4,
    borderColor: '#C9A89A',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.1 }],
  },
  fontSizeList: {
    maxHeight: 300,
    marginBottom: 24,
  },
  fontSizeOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
  },
  fontSizeOptionSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9A89A',
    borderWidth: 2,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fontSizeText: {
    color: '#8B6F5F',
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  fontSizeTextSelected: {
    color: '#8B6F5F',
    fontWeight: '600',
  },
  fontList: {
    maxHeight: 400,
    marginBottom: 24,
  },
  fontOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
  },
  fontOptionSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9A89A',
    borderWidth: 2,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fontOptionText: {
    color: '#8B6F5F',
    fontSize: 18,
    fontWeight: '400',
  },
  fontOptionTextSelected: {
    color: '#8B6F5F',
    fontWeight: '600',
  },
  zIndexActions: {
    gap: 12,
    marginBottom: 24,
  },
  zIndexButton: {
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
  forwardButton: {
    backgroundColor: '#C9A89A',
  },
  backwardButton: {
    backgroundColor: '#9B8E7F',
  },
  zIndexButtonText: {
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
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8D5C7',
  },
  modalCancelButtonText: {
    color: '#8B6F5F',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
});
