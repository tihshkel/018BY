import { colors, BLANK_ALBUM_PHOTO_RADIUS, createShadow, radii, sansFont } from '@/constants/design-tokens';
import { getTemplateTextLineMetrics, snapYToNearestTemplateLine } from '@/utils/lineGuides';
import { getTextFieldsForPage, getTextFieldPosition } from '@/constants/text-field-coordinates';
import type { EditorTool } from '@/constants/album-text-margins';
import { usesTemplateLineTextEditing } from '@/constants/album-text-margins';
import { TemplateLineEditor } from '@/components/template-line-editor';
import {
  EditorColorPickerSheet,
  EditorFontPickerSheet,
  EditorFontSizePickerSheet,
  EditorZIndexSheet,
  EDITOR_PICKER_COLORS,
} from '@/components/editor/editor-style-picker-sheet';
import {
  findAnnotationForContinuationGroup,
  findAnnotationForSlot,
  getLineSlotsForPage,
  hasLineGuides,
  layoutAnnotationFromSlot,
} from '@/utils/textLineSlots';
import type { PhotoSlotTransform } from '@/types/album-page-schema';
import { createId } from '@/utils/id';
import {
  applyPhotoSlotTransform,
} from '@/utils/photoSlotTransform';
import { getCachedPageSourceSize } from '@/utils/pageSourceDimensions';
import {
  AVAILABLE_FONTS,
  getAlbumFontFamilyName,
  normalizeAlbumFontId,
  type FontOption,
} from '@/constants/album-fonts';

export { AVAILABLE_FONTS, type FontOption } from '@/constants/album-fonts';

import { distributeTextForTemplateAnnotation, distributeTextWithinContinuationGroup, fitFontSizeToSlot, getContinuationGroupSlots, getEffectiveTemplateFontSize, getTemplateBlockTextInsets, getTemplateLineRowInsets, getTemplateLineTextTop, getTemplateLineTypography, getWishSlotInputKind, joinContinuationSegmentTexts, usesStrokeBaselineLayout } from '@/utils/templateLineText';
import { fitTextToTemplateBlock } from '@/utils/templateTextLayout';
import { isBlankTemplateLineGuide } from '@/utils/photoPageTemplateManifest';
import {
  findNextEmptyFieldTarget,
  findPreviousFieldTarget,
  getAlbumFieldTargets,
  getFieldNavigationState,
  getPageFieldTargets,
} from '@/utils/templateLineNavigation';
import type { GetLineSlotsParams } from '@/utils/textLineSlots';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Easing,
    Keyboard,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';

const FLOATING_TEXT_MIN_CARD_WIDTH = 260;

import type { Annotation, AnnotationTextAlign } from '@/types/annotation';

export type { Annotation, AnnotationTextAlign } from '@/types/annotation';

export interface PdfAnnotationsRef {
  closeEditing: () => void;
  openColorPicker: () => void;
  openFontSizePicker: () => void;
  openFontPicker: () => void;
  startEditing: (annotationId: string) => void;
  clearSelection: () => void;
  setTextAlign: (align: AnnotationTextAlign) => void;
  /** Снять фокус с поля ввода перед системным диалогом (иначе Alert на iOS не реагирует) */
  blurEditingInput: () => void;
  /** Предотвращает закрытие редактирования при blur от тапа по панели форматирования */
  markToolbarInteraction: () => void;
  navigateTemplateLinePrevious: () => void;
  navigateTemplateLineNext: () => void;
  getTemplateLineNavigationState: () => { canGoBack: boolean; canGoNext: boolean };
  insertLineBreak: () => void;
  deleteEditingAnnotation: () => void;
}

interface PdfAnnotationsProps {
  annotations: Annotation[];
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationUpdate: (id: string, annotation: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
  isEditing: boolean;
  currentTool: EditorTool;
  onEditingStateChange?: (isEditing: boolean, annotationId: string | null) => void;
  zoomLevel?: number; // Уровень масштабирования
  // Для привязки текста к линиям + корректной геометрии
  viewportWidth?: number;
  viewportHeight?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  lineGuideId?: string;
  // Для UX (ImageViewer передает, чтобы выключать инструмент “Текст” при тапе по существующему)
  onToolDeactivate?: () => void;
  // Сигнал наружу: пользователь взаимодействует (drag/resize) — чтобы не сдвигать страницу/клавиатуру
  onInteractionChange?: (isInteracting: boolean) => void;
  /** Выделение текста при редактировании (как в Word — показать панель выравнивания) */
  onTextSelectionChange?: (hasSelection: boolean) => void;
  /** Выбранная аннотация (рамка / кнопка «Редактировать») — чтобы не перекрывать слотами */
  onSelectionChange?: (annotationId: string | null) => void;
  /** Сигнал о загрузке фото-аннотации (для экспорта через PageRenderer) */
  onImageAnnotationLoad?: (imageUri: string) => void;
  /** Навигация по полям шаблона на всех страницах альбома */
  totalPages?: number;
  onNavigateToPage?: (page: number) => void;
  resolveSlotParams?: (page: number) => GetLineSlotsParams | null;
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
  sourceWidth,
  sourceHeight,
  lineGuideId,
  onToolDeactivate,
  onInteractionChange,
  onTextSelectionChange,
  onSelectionChange,
  onImageAnnotationLoad,
  totalPages,
  onNavigateToPage,
  resolveSlotParams,
}, ref) => {
  // Получаем актуальные размеры экрана
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const lineSlotsContext = useMemo(
    () => ({
      sourceWidth,
      sourceHeight,
      viewportWidth: viewportWidth ?? 0,
      viewportHeight: viewportHeight ?? 0,
    }),
    [sourceWidth, sourceHeight, viewportWidth, viewportHeight]
  );

  const slotsCacheRef = useRef<{ key: string; byPage: Map<number, ReturnType<typeof getLineSlotsForPage>> }>({
    key: '',
    byPage: new Map(),
  });

  const getSlotsForPage = useCallback(
    (pageNumber: number) => {
      const resolvedParams = resolveSlotParams?.(pageNumber);
      const cacheKey = resolvedParams
        ? `params:${pageNumber}:${resolvedParams.lineGuideId}:${resolvedParams.viewportWidth}:${resolvedParams.viewportHeight}:${resolvedParams.sourceWidth ?? 0}:${resolvedParams.sourceHeight ?? 0}`
        : `ctx:${lineGuideId}:${pageNumber}:${lineSlotsContext.viewportWidth}:${lineSlotsContext.viewportHeight}:${lineSlotsContext.sourceWidth ?? 0}:${lineSlotsContext.sourceHeight ?? 0}`;

      if (slotsCacheRef.current.key !== cacheKey) {
        slotsCacheRef.current = { key: cacheKey, byPage: new Map() };
      }

      const cached = slotsCacheRef.current.byPage.get(pageNumber);
      if (cached) return cached;

      let slots: ReturnType<typeof getLineSlotsForPage>;
      if (resolvedParams) {
        slots = getLineSlotsForPage(resolvedParams);
      } else if (
        !lineGuideId ||
        lineSlotsContext.viewportWidth <= 0 ||
        lineSlotsContext.viewportHeight <= 0
      ) {
        slots = [];
      } else {
        slots = getLineSlotsForPage({
          lineGuideId,
          page: pageNumber,
          viewportWidth: lineSlotsContext.viewportWidth,
          viewportHeight: lineSlotsContext.viewportHeight,
          sourceWidth: lineSlotsContext.sourceWidth,
          sourceHeight: lineSlotsContext.sourceHeight,
        });
      }

      slotsCacheRef.current.byPage.set(pageNumber, slots);
      return slots;
    },
    [lineGuideId, lineSlotsContext, resolveSlotParams]
  );

  const usesAlbumWideFieldNavigation = (totalPages ?? 0) > 1 && !!resolveSlotParams;

  const isTemplateLineAlbum = usesTemplateLineTextEditing(lineGuideId);

  const snapTextY = (page: number, y: number) =>
    lineGuideId &&
    isTemplateLineAlbum &&
    lineSlotsContext.viewportHeight > 0
      ? snapYToNearestTemplateLine({
          lineGuideId,
          page,
          y,
          viewportHeight: lineSlotsContext.viewportHeight,
          viewportWidth: lineSlotsContext.viewportWidth,
          sourceWidth: lineSlotsContext.sourceWidth,
          sourceHeight: lineSlotsContext.sourceHeight,
        })
      : y;

  const isTemplateLineAnnotation = (ann: Annotation) =>
    !!lineGuideId &&
    hasLineGuides(lineGuideId) &&
    typeof ann.templateLineStart === 'number' &&
    (ann.templateLineCount ?? 1) === 1;

  const getPageNumber = (ann: Annotation): number | null => {
    if (typeof ann.page === 'number') return ann.page;
    if (typeof ann.page === 'string' && ann.page !== 'cover') {
      const parsed = parseInt(ann.page, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const getMergedTemplateGroupText = (
    annotation: Annotation,
    pageNumber: number,
    startSlotIndex: number,
    slots: ReturnType<typeof getSlotsForPage>
  ): string => {
    const { groupSlots } = getContinuationGroupSlots(slots, startSlotIndex);
    const parts = groupSlots.map((s) => ({
      content: findAnnotationForSlot(annotations, pageNumber, s.index)?.content ?? '',
    }));
    const merged = joinContinuationSegmentTexts(parts);
    return merged.trim() || annotation.content || '';
  };

  const openTextEditing = (annotation: Annotation) => {
    if (annotation.type !== 'text') return;

    lastSelectedFontIdRef.current = null;
    let text = annotation.content || '';

    if (isTemplateLineAnnotation(annotation) && typeof annotation.templateLineStart === 'number') {
      const pageNumber = getPageNumber(annotation);
      if (pageNumber != null) {
        const slots = getSlotsForPage(pageNumber);
        const { startSlotIndex } = getContinuationGroupSlots(slots, annotation.templateLineStart);
        const layoutSlot = slots[startSlotIndex] ?? slots[annotation.templateLineStart];
        if (layoutSlot) {
          onAnnotationUpdate(annotation.id, layoutAnnotationFromSlot(layoutSlot));
        }
        text = getMergedTemplateGroupText(annotation, pageNumber, annotation.templateLineStart, slots);
      }
    }

    setEditingAnnotation(annotation.id);
    setEditingText(text);
    setSelectedAnnotation(null);
    setAdjustedEditingPosition(null);
  };

  const shouldHideTemplateGroupSibling = (
    annotation: Annotation,
    pageNumberForSlots: number | null,
    templateSlots: ReturnType<typeof getSlotsForPage>
  ): boolean => {
    if (!editingAnnotation || annotation.id === editingAnnotation) return false;
    if (typeof annotation.templateLineStart !== 'number' || !pageNumberForSlots) return false;

    const editing = annotations.find((ann) => ann.id === editingAnnotation);
    if (!editing || !isTemplateLineAnnotation(editing)) return false;
    if (getPageNumber(editing) !== pageNumberForSlots) return false;
    if (templateSlots.length === 0) return false;

    const editGroup = templateSlots[editing.templateLineStart ?? 0]?.continuationGroup;
    const annGroup = templateSlots[annotation.templateLineStart]?.continuationGroup;
    return editGroup != null && editGroup === annGroup;
  };

  /** После сохранения по строкам — не дублировать текст; показываем только «главную» аннотацию группы. */
  const shouldHideTemplateGroupDisplaySibling = (
    annotation: Annotation,
    pageNumberForSlots: number | null,
    templateSlots: ReturnType<typeof getSlotsForPage>
  ): boolean => {
    if (typeof annotation.templateLineStart !== 'number' || !pageNumberForSlots) return false;
    if (templateSlots.length === 0) return false;

    const { startSlotIndex, groupSlots } = getContinuationGroupSlots(
      templateSlots,
      annotation.templateLineStart
    );
    if (groupSlots.length <= 1) return false;

    const pageAnnotations = annotations.filter(
      (ann) => getPageNumber(ann) === pageNumberForSlots && isTemplateLineAnnotation(ann)
    );
    const primary = pageAnnotations.find(
      (ann) => (ann.templateLineStart ?? -1) === startSlotIndex
    );
    if (!primary) return false;
    return annotation.id !== primary.id;
  };

  const dismissTextEditing = () => {
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
    notifyTextSelection(false);
    Keyboard.dismiss();
  };

  const persistTemplateLineEditing = (): boolean => {
    if (!editingAnnotation) return false;
    const annotation = annotations.find((ann) => ann.id === editingAnnotation);
    if (!annotation || annotation.type !== 'text' || !isTemplateLineAnnotation(annotation)) {
      return false;
    }

    const pageNumber = getPageNumber(annotation);
    if (!pageNumber || typeof annotation.templateLineStart !== 'number') {
      onAnnotationUpdate(editingAnnotation, { content: editingText });
      return true;
    }

    const slots = getSlotsForPage(pageNumber);
    const startSlotIndex = annotation.templateLineStart ?? 0;
    const startSlot = slots[startSlotIndex];
    if (!startSlot) return false;
    const normalizedFontId = normalizeAlbumFontId(annotation.fontFamily);
    const effectiveFontSize = getEffectiveTemplateFontSize(
      lineGuideId,
      startSlot,
      annotation.fontSize || 16,
      { textContent: editingText, fontId: normalizedFontId },
    );
    const { segments, truncated } = distributeTextForTemplateAnnotation({
      text: editingText,
      startSlotIndex,
      slots,
      fontSize: effectiveFontSize,
      lineGuideId,
      fontId: normalizedFontId,
      lineCount: annotation.templateLineCount ?? 1,
    });

    if (truncated) {
      Alert.alert('Конец строки', 'Текст не помещается в доступные продолжения этой линии.');
    }

    for (const segment of segments) {
      const slot = slots[segment.slotIndex];
      if (!slot) continue;
      const layout = layoutAnnotationFromSlot(slot);
      const existing = findAnnotationForSlot(annotations, pageNumber, segment.slotIndex);

      if (existing) {
        onAnnotationUpdate(existing.id, {
          content: segment.content,
          ...layout,
          templateLineCount: 1,
          color: annotation.color,
          fontSize: effectiveFontSize,
          fontFamily: annotation.fontFamily,
          textAlign: annotation.textAlign,
        });
      } else if (segment.content.trim()) {
        onAnnotationAdd({
          ...annotation,
          id: createId('ann'),
          ...layout,
          content: segment.content,
          templateLineCount: 1,
          zIndex: (annotation.zIndex || 0) + segment.slotIndex,
        });
      }
    }

    const fieldSlotCount = annotation.templateLineCount ?? 1;
    const usedIndices = new Set(segments.map((s) => s.slotIndex));
    for (let offset = 0; offset < fieldSlotCount; offset += 1) {
      const slotIndex = startSlotIndex + offset;
      if (usedIndices.has(slotIndex)) continue;
      const orphan = findAnnotationForSlot(annotations, pageNumber, slotIndex);
      if (orphan && orphan.id !== annotation.id) {
        onAnnotationUpdate(orphan.id, { content: '' });
      }
    }

    lastSelectedFontIdRef.current = null;
    return true;
  };

  const saveTemplateLineEditing = () => {
    if (persistTemplateLineEditing()) {
      dismissTextEditing();
    }
  };
  
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
  const textInputRef = useRef<TextInput | null>(null);
  const templateLineInputRef = useRef<TextInput | null>(null);
  const isTemplateLineNavigatingRef = useRef(false);
  const isToolbarInteractionRef = useRef(false);
  const editingTextRef = useRef('');
  const TEMPLATE_LINE_NAV_BLUR_GUARD_MS = 120;
  const TOOLBAR_INTERACTION_BLUR_GUARD_MS = 200;
  const textSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const hasTextSelectionRef = useRef(false);
  const [selectionOverride, setSelectionOverride] = useState<{ start: number; end: number } | null>(null);

  const notifyTextSelection = (hasSelection: boolean) => {
    if (hasTextSelectionRef.current === hasSelection) return;
    hasTextSelectionRef.current = hasSelection;
    onTextSelectionChange?.(hasSelection);
  };

  const collapseTextSelection = (position: number) => {
    const collapsed = { start: position, end: position };
    textSelectionRef.current = collapsed;
    setSelectionOverride(collapsed);
    requestAnimationFrame(() => setSelectionOverride(null));
  };

  const getTextAlign = (annotation: Annotation): AnnotationTextAlign =>
    annotation.textAlign ?? 'left';
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
  // Refs для актуальных isEditing/editingAnnotation в кэшированных PanResponder (иначе после «Редактировать» тап по тексту/фото не срабатывает)
  const isEditingRef = useRef(isEditing);
  const editingAnnotationRef = useRef<string | null>(editingAnnotation);
  isEditingRef.current = isEditing;
  editingAnnotationRef.current = editingAnnotation;
  editingTextRef.current = editingText;

  const annotationsListRef = useRef(annotations);
  annotationsListRef.current = annotations;

  // Анимации для плавного появления окна редактирования
  const editingScaleAnim = useRef(new Animated.Value(0)).current;
  const editingOpacityAnim = useRef(new Animated.Value(0)).current;
  
  // Анимации для плавного перетаскивания (только визуальные эффекты)
  const dragScaleAnim = useRef(new Animated.Value(1)).current;
  const dragOpacityAnim = useRef(new Animated.Value(1)).current;

  const editingDragStartPos = useRef<{ x: number; y: number } | null>(null);
  const editingDragState = useRef<{ startX: number; startY: number; isDraggingStarted: boolean } | null>(null);

  // Последний выбранный шрифт в этой сессии редактирования — чтобы не терять его при быстром нажатии «Готово» (state может ещё не обновиться)
  const lastSelectedFontIdRef = useRef<string | null>(null);
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

  useEffect(() => {
    onSelectionChange?.(selectedAnnotation);
  }, [selectedAnnotation, onSelectionChange]);

  useEffect(() => {
    if (!isEditing) {
      setSelectedAnnotation(null);
    }
  }, [isEditing]);

  // Обновляем editingText при открытии редактирования (для сохранения текста при повторном открытии)
  const previousEditingAnnotation = useRef<string | null>(null);
  useEffect(() => {
    if (editingAnnotation && editingAnnotation !== previousEditingAnnotation.current) {
      // Открывается новое редактирование - загружаем текст из аннотации
      const annotation = annotations.find(ann => ann.id === editingAnnotation);
      if (annotation && annotation.type === 'text' && !isTemplateLineAnnotation(annotation)) {
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

    if (isTemplateLineAnnotation(currentAnnotation)) {
      dragButtonResponderRef.current = null;
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
          isTemplateLineAnnotation(currentAnnotation) &&
          typeof viewportHeight === 'number' &&
          viewportHeight > 0 &&
          typeof currentAnnotation.page === 'number';
        const snappedY = shouldSnap
          ? snapTextY(currentAnnotation.page as number, currentAnnotation.y)
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
    if (annotation.type === 'text' && editingAnnotationRef.current === annotation.id) {
      return null;
    }

    if (annotation.type === 'text' && isTemplateLineAnnotation(annotation)) {
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
        const isEdit = isEditingRef.current;
        const editingId = editingAnnotationRef.current;
        // Для текста - только если не редактируется
        if (annotation.type === 'text' && editingId === annotation.id) {
          return false;
        }
        // Для текста - если установлен флаг shouldStartDraggingAfterCloseRef, активируем сразу
        if (annotation.type === 'text' && isEdit && shouldStartDraggingAfterCloseRef.current === annotation.id) {
          return true;
        }
        // Для изображений - всегда в режиме редактирования (для выбора при тапе)
        if (annotation.type === 'image') {
          return isEdit;
        }
        return isEdit;
      },
      onStartShouldSetPanResponderCapture: () => {
        const isEdit = isEditingRef.current;
        const editingId = editingAnnotationRef.current;
        if (annotation.type === 'text' && editingId === annotation.id) {
          return false;
        }
        if (annotation.type === 'image') {
          return false;
        }
        return isEdit;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const isEdit = isEditingRef.current;
        const editingId = editingAnnotationRef.current;
        if (annotation.type === 'text' && editingId === annotation.id) {
          return false;
        }
        
        if (annotation.type === 'image') {
          if (isEdit && (selectedAnnotationRef.current === annotation.id || !selectedAnnotationRef.current)) {
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
        if (annotation.type === 'text' && isEdit && shouldStartDraggingAfterCloseRef.current === annotation.id) {
          const { dx, dy } = gestureState;
          const distance = Math.sqrt(dx * dx + dy * dy);
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
        if (isEdit && !isDraggingStarted) {
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
        const isEdit = isEditingRef.current;
        const display = getDisplayPosition(annotation);
        startX = display.x;
        startY = display.y;
        pressStartTime = Date.now();
        pressStartX = evt.nativeEvent.pageX;
        pressStartY = evt.nativeEvent.pageY;
        
        if (annotation.type === 'text' && isEdit && shouldStartDraggingAfterCloseRef.current === annotation.id) {
          shouldStartDraggingAfterCloseRef.current = null;
          isDraggingStarted = true;
          setIsDragging(true);
          isInteractingRef.current = true;
          onInteractionChange?.(true);
        } else {
          isDraggingStarted = false;
        }
        
        if (annotation.type === 'image' && isEdit) {
          if (selectedAnnotationRef.current !== annotation.id) {
            setSelectedAnnotation(annotation.id);
            // Обновляем ref сразу для использования в onMoveShouldSetPanResponder
            selectedAnnotationRef.current = annotation.id;
          }
        }
        // Не выбираем текст сразу - будем различать тап и перетаскивание
      },
      onPanResponderMove: (evt, gestureState) => {
        const isEdit = isEditingRef.current;
        if (annotation.type === 'image') {
          if (isEdit && selectedAnnotationRef.current === annotation.id) {
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
        
        if (isEdit && isDraggingStarted) {
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
            openTextEditing(annotation);
          } else if (annotation.type === 'image') {
            if (selectedAnnotationRef.current === annotation.id) {
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
      openTextEditing(annotation);
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
      openTextEditing(annotation);
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
    if (!editingAnnotation) return;
    const annotation = annotations.find((ann) => ann.id === editingAnnotation);
    if (annotation && isTemplateLineAnnotation(annotation)) {
      saveTemplateLineEditing();
      return;
    }
    if (editingText.trim() !== '') {
      onAnnotationUpdate(editingAnnotation, { content: editingText });
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
    
    if (editingAnnotation) {
      const annotation = annotations.find(ann => ann.id === editingAnnotation);
      if (annotation && annotation.type === 'text') {
        if (isTemplateLineAnnotation(annotation)) {
          setEditingText(text);
          return;
        }

        if (
          typeof annotation.templateLineStart === 'number' &&
          lineGuideId &&
          hasLineGuides(lineGuideId) &&
          typeof viewportWidth === 'number' &&
          typeof viewportHeight === 'number'
        ) {
          setEditingText(text);
          return;
        }

        // Проверяем, есть ли определенные координаты текстового поля
        let textFieldWidth: number | null = null;
        let textFieldX: number | null = null;
        let textFieldY: number | null = null;
        
        if (lineGuideId && typeof viewportWidth === 'number' && typeof viewportHeight === 'number') {
          const pageNumber = typeof annotation.page === 'number' ? annotation.page : 
                            (typeof annotation.page === 'string' && annotation.page !== 'cover' ? parseInt(annotation.page) : null);
          
          if (pageNumber) {
            const fields = getTextFieldsForPage(lineGuideId, pageNumber);
            // Находим поле, которое соответствует текущей позиции аннотации
            for (const field of fields) {
              const fieldPos = getTextFieldPosition(field, viewportWidth, viewportHeight);
              const tolerance = 20; // Допуск в пикселях
              if (Math.abs(annotation.x - fieldPos.x) < tolerance && 
                  Math.abs(annotation.y - fieldPos.y) < tolerance) {
                // Используем координаты из текстового поля
                textFieldWidth = fieldPos.width;
                textFieldX = fieldPos.x;
                textFieldY = fieldPos.y;
                break;
              }
            }
          }
        }
        
        // Используем ширину из текстового поля, если оно определено
        const effectiveWidth = textFieldWidth || annotation.width || 360;
        
        // Анализируем правильность переноса текста
        const analysis = analyzeTextWrapping(
          text,
          effectiveWidth,
          annotation.fontSize || 16,
          annotation.fontFamily
        );
        
        // Обновляем контент и координаты, если найдено текстовое поле
        const updates: Partial<Annotation> = { content: text };
        if (textFieldWidth && annotation.width !== textFieldWidth) {
          updates.width = textFieldWidth;
        }
        if (textFieldX !== null && textFieldY !== null && 
            (annotation.x !== textFieldX || annotation.y !== textFieldY)) {
          updates.x = textFieldX;
          updates.y = textFieldY;
        }
        
        onAnnotationUpdate(editingAnnotation, updates);
        setEditingText(text);
      } else {
        onAnnotationUpdate(editingAnnotation, { content: text });
        setEditingText(text);
      }
    } else {
      setEditingText(text);
    }
  };

  const handleTextContentSizeChange = (event: any) => {
    if (!editingAnnotation) return;
    
    const { width, height } = event.nativeEvent.contentSize;
    const annotation = annotations.find(ann => ann.id === editingAnnotation);
    if (!annotation || annotation.type !== 'text') return;
    
    // Проверяем, есть ли определенные координаты текстового поля
    let shouldUpdateWidth = false;
    let newWidth = annotation.width;
    
    if (lineGuideId && typeof viewportWidth === 'number' && typeof viewportHeight === 'number') {
      const pageNumber = typeof annotation.page === 'number' ? annotation.page : 
                        (typeof annotation.page === 'string' && annotation.page !== 'cover' ? parseInt(annotation.page) : null);
      
      if (pageNumber) {
        const fields = getTextFieldsForPage(lineGuideId, pageNumber);
        // Находим поле, которое соответствует текущей позиции аннотации
        for (const field of fields) {
          const fieldPos = getTextFieldPosition(field, viewportWidth, viewportHeight);
          const tolerance = 20; // Допуск в пикселях
          if (Math.abs(annotation.x - fieldPos.x) < tolerance && 
              Math.abs(annotation.y - fieldPos.y) < tolerance) {
            // Используем ширину из текстового поля
            newWidth = fieldPos.width;
            shouldUpdateWidth = true;
            break;
          }
        }
      }
    }
    
    // Минимальная высота для корректного отображения
    const minHeight = 24;
    const newHeight = Math.max(minHeight, height + 16); // Добавляем небольшой отступ
    
    // Обновляем размеры аннотации
    const updates: Partial<Annotation> = { height: newHeight };
    if (shouldUpdateWidth && annotation.width !== newWidth) {
      updates.width = newWidth;
    }
    
    if (annotation.height !== newHeight || (shouldUpdateWidth && annotation.width !== newWidth)) {
      onAnnotationUpdate(editingAnnotation, updates);
    }
  };

  // Функция для вставки переноса строки в текущую позицию курсора
  const handleInsertLineBreak = () => {
    if (!editingAnnotation) return;
    
    // Получаем текущий текст и позицию курсора
    const currentText = editingText;
    const { start } = textSelectionRef.current;
    
    // Вставляем перенос строки в позицию курсора
    const newText = currentText.slice(0, start) + '\n' + currentText.slice(start);
    const newCursorPosition = start + 1;
    
    setEditingText(newText);
    
    // Обновляем аннотацию
    if (editingAnnotation) {
      onAnnotationUpdate(editingAnnotation, { content: newText });
    }
    
    // Устанавливаем позицию курсора после переноса строки
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
        // Обновляем позицию курсора
        textSelectionRef.current = { start: newCursorPosition, end: newCursorPosition };
      }
    }, 50);
  };

  // Обработчик изменения позиции курсора / выделения
  const handleSelectionChange = (event: { nativeEvent: { selection: { start: number; end: number } } }) => {
    const { start, end } = event.nativeEvent.selection;
    textSelectionRef.current = { start, end };

    const hasSelection = start !== end;
    if (hasSelection) {
      Keyboard.dismiss();
    }
    notifyTextSelection(hasSelection);
  };

  // Функция для анализа правильности переноса текста
  const analyzeTextWrapping = (text: string, width: number, fontSize: number, fontFamily?: string): {
    isValid: boolean;
    lines: string[];
    issues: string[];
  } => {
    const issues: string[] = [];
    const lines: string[] = [];
    
    if (!text || text.length === 0) {
      return { isValid: true, lines: [], issues: [] };
    }
    
    // Приблизительная ширина одного символа (зависит от шрифта)
    const charWidth = fontSize * 0.62;
    const maxCharsPerLine = Math.floor((width - 24) / charWidth); // Учитываем padding
    
    if (maxCharsPerLine <= 0) {
      issues.push('Ширина аннотации слишком мала для отображения текста');
      return { isValid: false, lines: [text], issues };
    }
    
    // Разбиваем текст на строки по словам
    const words = text.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testLength = testLine.length;
      
      if (testLength <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Слово слишком длинное, разбиваем принудительно
          lines.push(word.substring(0, maxCharsPerLine));
          currentLine = word.substring(maxCharsPerLine);
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Проверяем, что каждая строка начинается с начала
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > maxCharsPerLine) {
        issues.push(`Строка ${i + 1} превышает максимальную длину: ${line.length} > ${maxCharsPerLine}`);
      }
    }
    
    const isValid = issues.length === 0;
    
    // Логируем для отладки (можно убрать в продакшене)
    if (__DEV__ && !isValid) {
      console.log('[TextWrapping] Анализ переноса текста:', {
        text,
        width,
        fontSize,
        maxCharsPerLine,
        lines,
        issues,
      });
    }
    
    return { isValid, lines, issues };
  };

  const markTemplateLineNavigating = () => {
    isTemplateLineNavigatingRef.current = true;
    setTimeout(() => {
      isTemplateLineNavigatingRef.current = false;
    }, TEMPLATE_LINE_NAV_BLUR_GUARD_MS);
  };

  const markToolbarInteraction = () => {
    isToolbarInteractionRef.current = true;
    setTimeout(() => {
      isToolbarInteractionRef.current = false;
    }, TOOLBAR_INTERACTION_BLUR_GUARD_MS);
  };

  const refocusEditingInput = () => {
    requestAnimationFrame(() => {
      const editingId = editingAnnotationRef.current;
      if (!editingId) return;
      const current = annotationsListRef.current.find((ann) => ann.id === editingId);
      if (current && isTemplateLineAnnotation(current)) {
        templateLineInputRef.current?.focus();
      } else {
        textInputRef.current?.focus();
      }
    });
  };

  const refocusTemplateLineInput = () => {
    requestAnimationFrame(() => {
      templateLineInputRef.current?.focus();
    });
  };

  const getActivePageNumber = (): number | null => {
    const editingId = editingAnnotationRef.current;
    if (editingId) {
      const editing = annotationsListRef.current.find((ann) => ann.id === editingId);
      if (editing) {
        const pageNumber = getPageNumber(editing);
        if (pageNumber != null) return pageNumber;
      }
    }

    const firstWithPage = annotationsListRef.current.find(
      (ann) => getPageNumber(ann) != null
    );
    return firstWithPage ? getPageNumber(firstWithPage) : null;
  };

  const getLiveFieldOverride = (
    pageNumber: number,
    startSlotIndex: number
  ): { page: number; startSlotIndex: number; isEmpty: boolean } | undefined => {
    const editingId = editingAnnotationRef.current;
    if (!editingId) return undefined;

    const editing = annotationsListRef.current.find((ann) => ann.id === editingId);
    if (!editing || !isTemplateLineAnnotation(editing)) return undefined;
    if (getPageNumber(editing) !== pageNumber) return undefined;
    if (typeof editing.templateLineStart !== 'number') return undefined;

    const slots = getSlotsForPage(pageNumber);
    const { startSlotIndex: editingGroupStart } = getContinuationGroupSlots(
      slots,
      editing.templateLineStart
    );
    if (editingGroupStart !== startSlotIndex) return undefined;

    return {
      page: pageNumber,
      startSlotIndex,
      isEmpty: editingTextRef.current.trim() === '',
    };
  };

  const getTemplateLineNavigationTargets = (pageNumber: number, startSlotIndex: number) => {
    const liveOverride = getLiveFieldOverride(pageNumber, startSlotIndex);

    if (usesAlbumWideFieldNavigation && totalPages) {
      return getAlbumFieldTargets(
        totalPages,
        getSlotsForPage,
        annotationsListRef.current,
        liveOverride
      );
    }

    const slots = getSlotsForPage(pageNumber);
    return getPageFieldTargets(
      slots,
      annotationsListRef.current,
      pageNumber,
      liveOverride
        ? {
            startSlotIndex: liveOverride.startSlotIndex,
            isEmpty: liveOverride.isEmpty,
          }
        : undefined
    );
  };

  const openTemplateLineFieldOnPage = (pageNumber: number, startSlotIndex: number) => {
    const slots = getSlotsForPage(pageNumber);
    const startSlot = slots[startSlotIndex];
    if (!startSlot) return;

    const { startSlotIndex: groupStart } = getContinuationGroupSlots(slots, startSlot.index);
    const groupStartSlot = slots[groupStart] ?? startSlot;

    const existing = findAnnotationForContinuationGroup(
      annotationsListRef.current,
      pageNumber,
      slots,
      groupStart
    );

    if (existing) {
      markTemplateLineNavigating();
      openTextEditing(existing);
      refocusTemplateLineInput();
      return;
    }

    const styleSource = editingAnnotationRef.current
      ? annotationsListRef.current.find((ann) => ann.id === editingAnnotationRef.current)
      : null;
    const maxZIndex =
      annotationsListRef.current.length > 0
        ? Math.max(...annotationsListRef.current.map((ann) => ann.zIndex), 0)
        : 0;
    const layout = layoutAnnotationFromSlot(groupStartSlot);
    const effectiveFontSize = getEffectiveTemplateFontSize(
      lineGuideId,
      groupStartSlot,
      styleSource?.fontSize || 16
    );
    const newId = createId('ann');
    const newAnnotation: Annotation = {
      id: newId,
      type: 'text',
      ...layout,
      content: '',
      color: styleSource?.color ?? '#000000',
      fontSize: effectiveFontSize,
      fontFamily: styleSource?.fontFamily,
      zIndex: maxZIndex + 1,
      page: pageNumber,
    };

    onAnnotationAdd(newAnnotation);

    const tryOpen = (attemptsLeft: number) => {
      const annotation = annotationsListRef.current.find((ann) => ann.id === newId);
      if (annotation?.type === 'text') {
        markTemplateLineNavigating();
        openTextEditing(annotation);
        refocusTemplateLineInput();
        return;
      }
      if (attemptsLeft > 0) {
        requestAnimationFrame(() => tryOpen(attemptsLeft - 1));
      }
    };
    tryOpen(8);
  };

  const beginTemplateLineFieldAtSlot = (pageNumber: number, startSlotIndex: number) => {
    const activePageNumber = getActivePageNumber();
    if (activePageNumber != null && activePageNumber !== pageNumber && onNavigateToPage) {
      onNavigateToPage(pageNumber);
      const tryOpenOnPage = (attemptsLeft: number) => {
        const slots = getSlotsForPage(pageNumber);
        if (slots[startSlotIndex]) {
          openTemplateLineFieldOnPage(pageNumber, startSlotIndex);
          return;
        }
        if (attemptsLeft > 0) {
          requestAnimationFrame(() => tryOpenOnPage(attemptsLeft - 1));
        }
      };
      requestAnimationFrame(() => tryOpenOnPage(12));
      return;
    }

    openTemplateLineFieldOnPage(pageNumber, startSlotIndex);
  };

  const navigateTemplateLinePrevious = () => {
    const editingId = editingAnnotationRef.current;
    if (!editingId) return;

    const current = annotationsListRef.current.find((ann) => ann.id === editingId);
    if (!current || !isTemplateLineAnnotation(current)) return;

    const pageNumber = getPageNumber(current);
    if (pageNumber == null || typeof current.templateLineStart !== 'number') return;

    persistTemplateLineEditing();

    const slots = getSlotsForPage(pageNumber);
    const { startSlotIndex } = getContinuationGroupSlots(slots, current.templateLineStart);
    const targets = getTemplateLineNavigationTargets(pageNumber, startSlotIndex);
    const previousTarget = findPreviousFieldTarget(targets, pageNumber, startSlotIndex);
    if (!previousTarget) return;

    beginTemplateLineFieldAtSlot(previousTarget.page, previousTarget.startSlotIndex);
  };

  const navigateTemplateLineNext = () => {
    const editingId = editingAnnotationRef.current;
    if (!editingId) return;

    const current = annotationsListRef.current.find((ann) => ann.id === editingId);
    if (!current || !isTemplateLineAnnotation(current)) return;

    const pageNumber = getPageNumber(current);
    if (pageNumber == null || typeof current.templateLineStart !== 'number') return;

    persistTemplateLineEditing();

    const slots = getSlotsForPage(pageNumber);
    const { startSlotIndex } = getContinuationGroupSlots(slots, current.templateLineStart);
    const targets = getTemplateLineNavigationTargets(pageNumber, startSlotIndex);
    const nextTarget = findNextEmptyFieldTarget(targets, pageNumber, startSlotIndex);

    if (nextTarget) {
      beginTemplateLineFieldAtSlot(nextTarget.page, nextTarget.startSlotIndex);
      return;
    }

    dismissTextEditing();
  };

  const getTemplateLineNavigationState = () => {
    const editingId = editingAnnotationRef.current;
    if (!editingId) {
      return { canGoBack: false, canGoNext: false };
    }

    const current = annotationsListRef.current.find((ann) => ann.id === editingId);
    if (!current || !isTemplateLineAnnotation(current)) {
      return { canGoBack: false, canGoNext: false };
    }

    const pageNumber = getPageNumber(current);
    if (pageNumber == null || typeof current.templateLineStart !== 'number') {
      return { canGoBack: false, canGoNext: false };
    }

    const slots = getSlotsForPage(pageNumber);
    const { startSlotIndex } = getContinuationGroupSlots(slots, current.templateLineStart);
    const targets = getTemplateLineNavigationTargets(pageNumber, startSlotIndex);
    const state = getFieldNavigationState(targets, pageNumber, startSlotIndex);

    return {
      canGoBack: state.canGoBack,
      canGoNext: state.canGoNext,
    };
  };

  const handleDeleteEditingAnnotation = () => {
    if (!editingAnnotation) return;
    const annotationId = editingAnnotation;
    onAnnotationDelete(annotationId);
    setEditingAnnotation(null);
    setEditingText('');
    setSelectedAnnotation(null);
    Keyboard.dismiss();
    onEditingStateChange?.(false, null);
  };

  const handleCloseEditing = () => {
    if (editingAnnotation) {
      const current = annotations.find(ann => ann.id === editingAnnotation) || null;
      if (current && isTemplateLineAnnotation(current)) {
        saveTemplateLineEditing();
        return;
      }
      const shouldSnap =
        !!current &&
        current.type === 'text' &&
        isTemplateLineAnnotation(current) &&
        typeof viewportHeight === 'number' &&
        viewportHeight > 0 &&
        typeof current.page === 'number';
      const snappedY = shouldSnap
        ? snapTextY(current!.page as number, current!.y)
        : null;

      // Сохраняем финальные изменения, явно передаём стиль, чтобы шрифт/размер/цвет не терялись.
      // Шрифт берём из current или из lastSelectedFontIdRef (на случай, если state ещё не обновился после выбора шрифта).
      const effectiveFontFamily = (current?.type === 'text' && current.fontFamily) ?? lastSelectedFontIdRef.current;
      const styleUpdates = current && current.type === 'text'
        ? { ...getTextStyleUpdates(current), ...(effectiveFontFamily ? { fontFamily: effectiveFontFamily } : {}) }
        : effectiveFontFamily ? { fontFamily: effectiveFontFamily } : {};
      onAnnotationUpdate(editingAnnotation, {
        content: editingText,
        ...(typeof snappedY === 'number' ? { y: snappedY } : {}),
        ...styleUpdates,
      });
      lastSelectedFontIdRef.current = null;
      // Запоминаем последний стиль при закрытии редактирования
      const fontToSave = effectiveFontFamily ?? (current?.type === 'text' ? current.fontFamily : undefined);
      if (current && current.type === 'text' && (current.color != null || current.fontSize != null || fontToSave != null)) {
        if (fontToSave) AsyncStorage.setItem('@last_text_font_family', fontToSave).catch(() => {});
        AsyncStorage.getItem('@last_text_style').then((raw) => {
          let existingFont: string | undefined;
          if (raw) try { existingFont = (JSON.parse(raw) as { fontFamily?: string }).fontFamily; } catch (_) {}
          const lastStyle = {
            color: current!.color ?? '#000000',
            fontSize: current!.fontSize ?? 16,
            fontFamily: fontToSave ?? current!.fontFamily ?? existingFont,
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
      notifyTextSelection(false);
      Keyboard.dismiss();
    }
  };

  const handleTemplateLineEditorDismiss = () => {
    if (isTemplateLineNavigatingRef.current) {
      isTemplateLineNavigatingRef.current = false;
      return;
    }
    if (isToolbarInteractionRef.current) {
      isToolbarInteractionRef.current = false;
      refocusEditingInput();
      return;
    }
    handleCloseEditing();
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
      const tryOpen = (attemptsLeft: number) => {
        const annotation = annotationsListRef.current.find(
          (ann) => ann.id === annotationId
        );
        if (annotation?.type === 'text') {
          openTextEditing(annotation);
          return;
        }
        if (attemptsLeft > 0) {
          requestAnimationFrame(() => tryOpen(attemptsLeft - 1));
        }
      };
      tryOpen(8);
    },
    clearSelection: () => {
      setSelectedAnnotation(null);
      setShowZIndexMenu(false);
      setZIndexAnnotationId(null);
    },
    blurEditingInput: () => {
      textInputRef.current?.blur();
      templateLineInputRef.current?.blur();
      setShowColorPicker(false);
      setShowFontSizePicker(false);
      setShowFontPicker(false);
      Keyboard.dismiss();
    },
    markToolbarInteraction,
    setTextAlign: (align: AnnotationTextAlign) => {
      if (!editingAnnotation) return;

      const current = annotations.find((ann) => ann.id === editingAnnotation);
      if (!current || current.type !== 'text') return;

      onAnnotationUpdate(editingAnnotation, { textAlign: align });

      if (isTemplateLineAnnotation(current)) {
        const pageNumber = getPageNumber(current);
        if (pageNumber != null && typeof current.templateLineStart === 'number') {
          const slots = getSlotsForPage(pageNumber);
          const { groupSlots } = getContinuationGroupSlots(slots, current.templateLineStart);
          for (const slot of groupSlots) {
            const sibling = findAnnotationForSlot(annotations, pageNumber, slot.index);
            if (sibling && sibling.id !== editingAnnotation) {
              onAnnotationUpdate(sibling.id, { textAlign: align });
            }
          }
        }
      }

      const { end } = textSelectionRef.current;
      collapseTextSelection(end);
      notifyTextSelection(false);
      refocusEditingInput();
    },
    navigateTemplateLinePrevious,
    navigateTemplateLineNext,
    getTemplateLineNavigationState,
    insertLineBreak: handleInsertLineBreak,
    deleteEditingAnnotation: handleDeleteEditingAnnotation,
  }), [annotations, editingAnnotation, editingText, onAnnotationUpdate, onEditingStateChange]);

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
      const currentAnnotation = annotations.find(ann => ann.id === editingAnnotation);
      if (currentAnnotation && isTemplateLineAnnotation(currentAnnotation)) {
        setShowFontSizePicker(false);
        return;
      }
      onAnnotationUpdate(editingAnnotation, { fontSize: size });
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
      const normalizedFontId = normalizeAlbumFontId(fontId);
      lastSelectedFontIdRef.current = normalizedFontId;
      onAnnotationUpdate(editingAnnotation, { fontFamily: normalizedFontId });
      AsyncStorage.setItem('@last_text_font_family', normalizedFontId).catch(() => {});
      const currentAnnotation = annotations.find(ann => ann.id === editingAnnotation);
      if (currentAnnotation && currentAnnotation.type === 'text') {
        const newStyle = {
          color: currentAnnotation.color,
          fontSize: currentAnnotation.fontSize,
          fontFamily: normalizedFontId,
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
        return isEditingRef.current && selectedAnnotationRef.current === annotationId;
      },
      onStartShouldSetPanResponderCapture: () => {
        return isEditingRef.current && selectedAnnotationRef.current === annotationId;
      },
      onMoveShouldSetPanResponder: () => {
        return isEditingRef.current && selectedAnnotationRef.current === annotationId;
      },
      onMoveShouldSetPanResponderCapture: () => {
        return isEditingRef.current && selectedAnnotationRef.current === annotationId;
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
        const aspectRatio = startW / (startH || 1);

        // Пропорциональный ресайз: берём доминирующую ось и вычисляем второе измерение
        let delta: number;
        let nextLeft = startLeft;
        let nextTop = startTop;

        if (corner === 'tl') {
          delta = (Math.abs(dx) > Math.abs(dy)) ? -dx : -dy * aspectRatio;
        } else if (corner === 'tr') {
          delta = (Math.abs(dx) > Math.abs(dy)) ? dx : -dy * aspectRatio;
        } else if (corner === 'bl') {
          delta = (Math.abs(dx) > Math.abs(dy)) ? -dx : dy * aspectRatio;
        } else {
          delta = (Math.abs(dx) > Math.abs(dy)) ? dx : dy * aspectRatio;
        }

        delta = Math.max(delta, minSize - startW);
        let nextW = Math.max(minSize, startW + delta);
        let nextH = Math.max(minSize, nextW / aspectRatio);
        nextW = nextH * aspectRatio;

        if (corner === 'tl') {
          nextLeft = startLeft + startW - nextW;
          nextTop = startTop + startH - nextH;
        } else if (corner === 'tr') {
          nextTop = startTop + startH - nextH;
        } else if (corner === 'bl') {
          nextLeft = startLeft + startW - nextW;
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
    return getAlbumFontFamilyName(fontId);
  };

  const renderAnnotation = (annotation: Annotation) => {
    const isEditingText = editingAnnotation === annotation.id;
    const isSelected = selectedAnnotation === annotation.id;
    const panResponder = createPanResponder(annotation);
    const currentColor = annotation.color || '#000000';
    const currentFontSize = annotation.fontSize || 16;
    const normalizedFontId = normalizeAlbumFontId(annotation.fontFamily);
    const currentFontFamily = getFontFamilyName(normalizedFontId);

    if (annotation.type === 'text') {
      const basePos = getDisplayPosition(annotation);
      // Используем скорректированные координаты при редактировании, если они есть
      let displayX = isEditingText && adjustedEditingPosition ? adjustedEditingPosition.x : basePos.x;
      let displayY = isEditingText && adjustedEditingPosition ? adjustedEditingPosition.y : basePos.y;
      
      // Проверяем, есть ли определенные координаты текстового поля для этой страницы
      let textFieldCoordinate: { x: number; width: number } | null = null;
      if (lineGuideId && typeof viewportWidth === 'number' && typeof viewportHeight === 'number') {
        const pageNumber = typeof annotation.page === 'number' ? annotation.page : 
                          (typeof annotation.page === 'string' && annotation.page !== 'cover' ? parseInt(annotation.page) : null);
        
        if (pageNumber) {
          const fields = getTextFieldsForPage(lineGuideId, pageNumber);
          // Находим поле, которое соответствует текущей позиции аннотации
          for (const field of fields) {
            const fieldPos = getTextFieldPosition(field, viewportWidth, viewportHeight);
            // Проверяем, находится ли аннотация в пределах этого поля (с допуском)
            const tolerance = 20; // Допуск в пикселях
            if (Math.abs(basePos.x - fieldPos.x) < tolerance && 
                Math.abs(basePos.y - fieldPos.y) < tolerance) {
              textFieldCoordinate = { x: fieldPos.x, width: fieldPos.width };
              // Используем координаты из текстового поля для правильного начала текста
              displayX = fieldPos.x;
              displayY = fieldPos.y;
              break;
            }
          }
        }
      }

      const metrics =
        lineGuideId && typeof viewportHeight === 'number' && viewportHeight > 0
          ? getTemplateTextLineMetrics({
              lineGuideId,
              page: annotation.page as number,
              y: displayY,
              viewportHeight: lineSlotsContext.viewportHeight,
              viewportWidth: lineSlotsContext.viewportWidth,
              sourceWidth: lineSlotsContext.sourceWidth,
              sourceHeight: lineSlotsContext.sourceHeight,
            })
          : null;
      const alignedLineHeight = metrics?.lineHeight ?? null;
      const alignedFontSize =
        alignedLineHeight && alignedLineHeight > 0 ? Math.min(currentFontSize, Math.max(8, alignedLineHeight * 0.88)) : currentFontSize;

      const pageNumberForSlots =
        typeof annotation.page === 'number'
          ? annotation.page
          : typeof annotation.page === 'string' && annotation.page !== 'cover'
            ? parseInt(annotation.page, 10)
            : null;

      const templateSlots =
        typeof annotation.templateLineStart === 'number' &&
        lineGuideId &&
        pageNumberForSlots &&
        typeof viewportWidth === 'number' &&
        typeof viewportHeight === 'number'
          ? getSlotsForPage(pageNumberForSlots)
          : [];

      const templateLineTexts =
        typeof annotation.templateLineStart === 'number' && templateSlots.length > 0
          ? (annotation.content || '').split('\n')
          : null;

      const slotLayoutWidth =
        templateSlots[annotation.templateLineStart ?? 0]?.width ??
        textFieldCoordinate?.width ??
        annotation.width ??
        360;
      const floatingTextEditingWidth =
        isEditingText && !isTemplateLineAnnotation(annotation)
          ? Math.max(slotLayoutWidth, FLOATING_TEXT_MIN_CARD_WIDTH)
          : slotLayoutWidth;

      if (shouldHideTemplateGroupSibling(annotation, pageNumberForSlots, templateSlots)) {
        return null;
      }

      if (shouldHideTemplateGroupDisplaySibling(annotation, pageNumberForSlots, templateSlots)) {
        return null;
      }

      if (isTemplateLineAnnotation(annotation)) {
        const slotIndex = annotation.templateLineStart ?? 0;
        const slot = templateSlots[slotIndex];
        if (!slot) return null;

        const fieldSlotCount = annotation.templateLineCount ?? 1;
        const fieldSlots = templateSlots.filter(
          (lineSlot) =>
            lineSlot.index >= slotIndex && lineSlot.index < slotIndex + fieldSlotCount,
        );

        const effectiveFontSize = getEffectiveTemplateFontSize(
          lineGuideId,
          slot,
          currentFontSize,
          { textContent: mergedDisplayText, fontId: normalizedFontId },
        );
        if (isEditingText) {
          return (
            <TemplateLineEditor
              key={annotation.id}
              slot={slot}
              groupSlots={fieldSlots.length > 0 ? fieldSlots : [slot]}
              allSlots={templateSlots}
              value={editingText}
              color={currentColor}
              fontSize={effectiveFontSize}
              fontFamily={currentFontFamily}
              fontId={normalizedFontId}
              lineGuideId={lineGuideId}
              textAlign={getTextAlign(annotation)}
              onChangeText={handleTextChange}
              onSubmit={handleTemplateLineEditorDismiss}
              onSelectionChange={handleSelectionChange}
              selection={selectionOverride ?? undefined}
              inputRef={templateLineInputRef}
            />
          );
        }

        const mergedDisplayText =
          pageNumberForSlots != null
            ? getMergedTemplateGroupText(annotation, pageNumberForSlots, slotIndex, templateSlots)
            : annotation.content || '';
        const { segments: displaySegments } = distributeTextForTemplateAnnotation({
          text: mergedDisplayText,
          startSlotIndex: slotIndex,
          slots: templateSlots,
          fontSize: effectiveFontSize,
          lineGuideId,
          fontId: normalizedFontId,
          lineCount: annotation.templateLineCount ?? 1,
        });
        const linesToRender = displaySegments
          .map((segment) => {
            const lineSlot = templateSlots[segment.slotIndex];
            if (!lineSlot || !segment.content) return null;
            return {
              slotIndex: segment.slotIndex,
              content: segment.content,
              lineSlot,
            };
          })
          .filter((row): row is NonNullable<typeof row> => row != null);

        return (
          <>
            {linesToRender.map((row) => {
              const rowTop = getTemplateLineTextTop(
                row.lineSlot,
                effectiveFontSize,
                lineGuideId
              );
              const rowTypography = getTemplateLineTypography(
                effectiveFontSize,
                row.lineSlot.lineHeight,
                getWishSlotInputKind(row.lineSlot, lineGuideId),
                lineGuideId
              );
              const wishInputKind = getWishSlotInputKind(row.lineSlot, lineGuideId);
              const usesStrokeBaseline = usesStrokeBaselineLayout(row.lineSlot, lineGuideId);
              const { viewportTopInset, textTopInset } = getTemplateLineRowInsets(
                row.lineSlot,
                rowTypography.fontSize,
                wishInputKind,
                lineGuideId
              );
              const textInsets = getTemplateBlockTextInsets(row.lineSlot, lineGuideId);
              return (
                <View
                  key={`${annotation.id}-line-${row.slotIndex}`}
                  style={{
                    position: 'absolute',
                    left: row.lineSlot.x,
                    top: rowTop - viewportTopInset,
                    width: row.lineSlot.width,
                    height: rowTypography.lineHeight + viewportTopInset,
                    overflow: 'visible',
                    zIndex: annotation.zIndex,
                  }}
                  pointerEvents="none"
                >
                  <Text
                    style={[
                      styles.textAnnotation,
                      styles.templateLineText,
                      {
                        position: 'absolute',
                        top: textTopInset,
                        left: textInsets.left,
                        width: textInsets.width,
                        color: currentColor,
                        fontSize: rowTypography.fontSize,
                        fontFamily: currentFontFamily,
                        lineHeight: usesStrokeBaseline
                          ? rowTypography.fontSize
                          : rowTypography.lineHeight,
                        includeFontPadding: false,
                        textAlign: getTextAlign(annotation),
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                  >
                    {row.content}
                  </Text>
                </View>
              );
            })}
          </>
        );
      }

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
            overflow: 'hidden' as const,
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
                <>
                  <View
                    style={[
                      styles.floatingTextCard,
                      isDraggingWhileEditing && styles.floatingTextCardDragging,
                    ]}
                    pointerEvents={isDraggingWhileEditing ? 'auto' : 'box-none'}
                  >
                    <View
                      style={[
                        styles.floatingTextHeader,
                        isDraggingWhileEditing && styles.floatingTextHeaderDragging,
                      ]}
                      {...(dragButtonResponderRef.current?.panHandlers || {})}
                      pointerEvents={isDraggingWhileEditing ? 'none' : 'auto'}
                      accessibilityRole="button"
                      accessibilityLabel="Перетащите, чтобы переместить текст"
                      accessibilityHint="Удерживайте полоску сверху и перетащите блок"
                    >
                      <View
                        style={[
                          styles.floatingTextGripBar,
                          isDraggingWhileEditing && styles.floatingTextGripBarDragging,
                        ]}
                      />
                    </View>
                    <View pointerEvents={isDraggingWhileEditing ? 'none' : 'auto'}>
                      <TextInput
                        ref={textInputRef}
                        style={[
                          styles.textAnnotation,
                          styles.floatingTextInput,
                          {
                            color: currentColor,
                            fontSize: alignedFontSize,
                            fontFamily: currentFontFamily,
                            lineHeight: alignedFontSize * 1.2,
                            includeFontPadding: false,
                            textAlignVertical: 'top',
                            textAlign: getTextAlign(annotation),
                            width: floatingTextEditingWidth,
                          },
                        ]}
                        value={editingText}
                        onChangeText={handleTextChange}
                        onContentSizeChange={handleTextContentSizeChange}
                        onSelectionChange={handleSelectionChange}
                        {...(selectionOverride ? { selection: selectionOverride } : {})}
                        onSubmitEditing={handleTextSubmit}
                        onBlur={handleTextSubmit}
                        autoFocus={!isDraggingWhileEditing}
                        multiline
                        placeholder="Введите текст..."
                        placeholderTextColor="#A89888"
                        editable={!isDraggingWhileEditing}
                        selectTextOnFocus={false}
                        textBreakStrategy="simple"
                        {...(Platform.OS === 'android' && {
                          textAlignVertical: 'top',
                        })}
                      />
                    </View>
                  </View>
                </>
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
                  {templateLineTexts ? (
                    templateLineTexts.map((line, lineIndex) => {
                      const slot =
                        templateSlots[(annotation.templateLineStart ?? 0) + lineIndex];
                      if (!slot) return null;
                      return (
                        <Text
                          key={`${annotation.id}-line-${lineIndex}`}
                          style={[
                            styles.textAnnotation,
                            styles.templateLineText,
                            {
                              top: slot.y - displayY,
                              left: slot.x - displayX,
                              width: slot.width,
                              color: currentColor,
                              fontSize: alignedFontSize,
                              fontFamily: currentFontFamily,
                              lineHeight: alignedFontSize * 1.05,
                              includeFontPadding: false,
                              textAlign: getTextAlign(annotation),
                            },
                          ]}
                        >
                          {line}
                        </Text>
                      );
                    })
                  ) : (
                    (() => {
                      const boxWidth = annotation.width || 360;
                      const boxHeight = annotation.height || 24;
                      const fitted = fitTextToTemplateBlock({
                        text: annotation.content || '',
                        boxWidth,
                        boxHeight,
                        fontId: normalizedFontId,
                        preferredFontSize: alignedFontSize,
                      });
                      const blockLineHeight = fitted.fontSize * 1.15;
                      return fitted.lines.map((line, lineIndex) => (
                        <Text
                          key={`${annotation.id}-block-line-${lineIndex}`}
                          style={[
                            styles.textAnnotation,
                            {
                              position: 'absolute',
                              top: lineIndex * blockLineHeight,
                              left: 0,
                              width: boxWidth,
                              color: currentColor,
                              fontSize: fitted.fontSize,
                              fontFamily: currentFontFamily,
                              lineHeight: blockLineHeight,
                              includeFontPadding: false,
                              textAlign: getTextAlign(annotation),
                            },
                          ]}
                        >
                          {line}
                        </Text>
                      ));
                    })()
                  )}
                </TouchableOpacity>
              </View>
              {/* Прямоугольник с обводкой при выборе текста - показывается всегда при выборе */}
              {isSelected && isEditing && (
                <View style={styles.textSelectionBorder} />
              )}
              {/* Кнопки редактирования при долгом нажатии */}
              {isSelected && isEditing && !isDragging && (
                <View style={styles.textControlsOverlay} pointerEvents="box-none">
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditText(annotation)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
      const isBlankAlbumPhoto = isBlankTemplateLineGuide(lineGuideId ?? '');
      const isCircle = annotation.clipShape === 'circle';
      const circleRadius = isCircle
        ? Math.min(annotation.width, annotation.height) / 2
        : 0;
      const rectPhotoRadius = isBlankAlbumPhoto ? BLANK_ALBUM_PHOTO_RADIUS : radii.sm;
      const photoCornerRadius = isCircle ? circleRadius : rectPhotoRadius;
      const photoClipStyle =
        photoCornerRadius > 0
          ? { borderRadius: photoCornerRadius, overflow: 'hidden' as const }
          : undefined;

      if (!annotation.imageUri && annotation.fillColor) {
        const fillSize = isCircle
          ? Math.min(annotation.width, annotation.height)
          : null;
        const fillLeft = isCircle
          ? basePos.x + (annotation.width - fillSize!) / 2
          : basePos.x;
        const fillTop = isCircle
          ? basePos.y + (annotation.height - fillSize!) / 2
          : basePos.y;
        const fillWidth = fillSize ?? annotation.width;
        const fillHeight = fillSize ?? annotation.height;
        const fillRadius = isCircle ? fillWidth / 2 : circleRadius;

        return (
          <View
            key={annotation.id}
            style={[
              styles.annotation,
              {
                left: fillLeft,
                top: fillTop,
                width: fillWidth,
                height: fillHeight,
                zIndex: annotation.zIndex,
                backgroundColor: annotation.fillColor,
                opacity: annotation.fillOpacity ?? 1,
                borderRadius: fillRadius,
              },
            ]}
            pointerEvents="none"
          />
        );
      }

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
            style={[styles.imageContainer, photoClipStyle, isBlankAlbumPhoto && styles.blankAlbumImageContainer]}
            pointerEvents={isEditing ? 'auto' : 'box-none'}
          >
            {annotation.fillColor ? (
              <View
                style={[
                  styles.imageAnnotation,
                  photoClipStyle,
                  { backgroundColor: annotation.fillColor },
                ]}
              />
            ) : null}
            {annotation.imageUri ? (
              annotation.imageSlotTransform && !isEditing ? (
                <View style={[styles.slotTransformClip, photoClipStyle]}>
                  <View
                    style={[
                      styles.slotTransformInner,
                      (() => {
                        const cached = annotation.imageUri
                          ? getCachedPageSourceSize(annotation.imageUri)
                          : null;
                        const imageAspect =
                          cached && cached.width > 0 && cached.height > 0
                            ? cached.width / cached.height
                            : undefined;
                        const inner = applyPhotoSlotTransform(
                          {
                            x: 0,
                            y: 0,
                            width: annotation.width,
                            height: annotation.height,
                          },
                          annotation.imageSlotTransform,
                          imageAspect,
                        );
                        return {
                          left: inner.x,
                          top: inner.y,
                          width: inner.width,
                          height: inner.height,
                        };
                      })(),
                    ]}
                  >
                    <Image
                      source={{ uri: annotation.imageUri }}
                      style={[
                        styles.imageAnnotation,
                        isBlankAlbumPhoto
                          ? styles.blankAlbumImageAnnotationReadOnly
                          : styles.imageAnnotationReadOnly,
                        isCircle && styles.circleImageAnnotation,
                        annotation.fillColor && styles.imageOnFill,
                      ]}
                      contentFit={annotation.imageContentFit ?? 'cover'}
                      priority="high"
                      cachePolicy="disk"
                      transition={0}
                      fadeDuration={0}
                      recyclingKey={annotation.id}
                      contentPosition="center"
                      allowDownscaling
                      onLoad={() => {
                        if (annotation.imageUri) {
                          onImageAnnotationLoad?.(annotation.imageUri);
                        }
                      }}
                    />
                  </View>
                </View>
              ) : (
                <Image
                  source={{ uri: annotation.imageUri }}
                  style={[
                    styles.imageAnnotation,
                    photoClipStyle,
                    isCircle && styles.circleImageAnnotation,
                    annotation.fillColor && styles.imageOnFill,
                    !isEditing &&
                      (isBlankAlbumPhoto
                        ? styles.blankAlbumImageAnnotationReadOnly
                        : styles.imageAnnotationReadOnly),
                  ]}
                  contentFit={annotation.imageContentFit ?? 'fill'}
                  priority="high"
                  cachePolicy="disk"
                  transition={0}
                  fadeDuration={0}
                  recyclingKey={annotation.id}
                  contentPosition="center"
                  allowDownscaling
                  onLoad={() => {
                    if (annotation.imageUri) {
                      onImageAnnotationLoad?.(annotation.imageUri);
                    }
                  }}
                />
              )
            ) : null}
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
                  <Ionicons name="move-outline" size={iconSize} color={colors.textPrimary} />
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
          }          )()}
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


      <EditorColorPickerSheet
        visible={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        colors={EDITOR_PICKER_COLORS}
        selectedColor={currentEditingAnnotation?.color}
        onSelectColor={handleColorSelect}
      />

      <EditorFontSizePickerSheet
        visible={showFontSizePicker}
        onClose={() => setShowFontSizePicker(false)}
        selectedSize={currentEditingAnnotation?.fontSize}
        onSelectSize={handleFontSizeSelect}
        showSampleText
      />

      <EditorFontPickerSheet
        visible={showFontPicker}
        onClose={() => setShowFontPicker(false)}
        fonts={AVAILABLE_FONTS}
        selectedFontId={currentEditingAnnotation?.fontFamily || 'default'}
        onSelectFont={handleFontSelect}
      />

      <EditorZIndexSheet
        visible={showZIndexMenu}
        onClose={() => {
          setShowZIndexMenu(false);
          setZIndexAnnotationId(null);
        }}
        onMoveForward={() => handleZIndexChange('forward')}
        onMoveBackward={() => handleZIndexChange('backward')}
      />
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
    borderColor: colors.primary,
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
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 200,
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
  templateLineText: {
    position: 'absolute',
    padding: 0,
    textAlign: 'left',
  },
  textInput: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 0,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    minHeight: 50,
    textAlignVertical: 'top',
    textAlign: 'left',
    includeFontPadding: false,
  },
  textEditingContainer: {
    flex: 1,
    minWidth: FLOATING_TEXT_MIN_CARD_WIDTH,
  },
  floatingTextCard: {
    minWidth: FLOATING_TEXT_MIN_CARD_WIDTH,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingTextCardDragging: {
    opacity: 0.92,
    borderColor: colors.primary,
  },
  floatingTextHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6DC',
  },
  floatingTextHeaderDragging: {
    backgroundColor: '#F5EDE6',
  },
  floatingTextGripBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4C4B8',
  },
  floatingTextGripBarDragging: {
    width: 48,
    backgroundColor: colors.primary,
  },
  floatingTextInput: {
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 64,
    textAlignVertical: 'top',
    textAlign: 'left',
    includeFontPadding: false,
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
    borderTopColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: colors.textPrimary,
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
    backgroundColor: colors.background,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    gap: 8,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toolbarButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
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
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    gap: 6,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  controlButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
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
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: 4,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '100%', // Ограничиваем ширину для обрезки текста
  },
  dragHint: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: sansFont('bold'),
    // fontSize будет задаваться динамически
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    pointerEvents: 'auto',
    overflow: 'hidden',
    borderRadius: radii.sm,
  },
  blankAlbumImageContainer: {
    borderRadius: BLANK_ALBUM_PHOTO_RADIUS,
  },
  imageAnnotation: {
    width: '100%',
    height: '100%',
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  imageAnnotationReadOnly: {
    borderWidth: 0,
    borderRadius: 0,
  },
  blankAlbumImageAnnotationReadOnly: {
    borderWidth: 0,
    borderRadius: BLANK_ALBUM_PHOTO_RADIUS,
  },
  slotTransformClip: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  slotTransformInner: {
    position: 'absolute',
    overflow: 'hidden',
  },
  imageOnFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 0,
  },
  circleImageAnnotation: {
    borderWidth: 0,
    borderRadius: 9999,
  },
  imageControls: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.textPrimary,
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
});
