import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  PanResponder,
  Modal,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

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
  zIndex: number;
  page?: number;
}

export interface PdfAnnotationsRef {
  closeEditing: () => void;
}

interface PdfAnnotationsProps {
  annotations: Annotation[];
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationUpdate: (id: string, annotation: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
  isEditing: boolean;
  currentTool: 'text' | 'image' | 'drawing' | null;
  onEditingStateChange?: (isEditing: boolean, annotationId: string | null) => void;
}

const PdfAnnotations = React.forwardRef<PdfAnnotationsRef, PdfAnnotationsProps>(({
  annotations,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  isEditing,
  currentTool,
  onEditingStateChange,
}, ref) => {
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showZIndexMenu, setShowZIndexMenu] = useState(false);
  const [zIndexAnnotationId, setZIndexAnnotationId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const panResponders = useRef<{ [key: string]: any }>({});

  // Автоматически открываем редактирование для нового текста
  useEffect(() => {
    const newTextAnnotation = annotations.find(
      ann => ann.type === 'text' && ann.content === 'Новый текст' && !editingAnnotation
    );
    if (newTextAnnotation && isEditing) {
      setEditingAnnotation(newTextAnnotation.id);
      setEditingText('Новый текст');
      onEditingStateChange?.(true, newTextAnnotation.id);
    }
  }, [annotations]);

  // Уведомляем родительский компонент об изменении состояния редактирования
  useEffect(() => {
    onEditingStateChange?.(!!editingAnnotation, editingAnnotation);
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

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => {
        // Для текста - только если не редактируется
        if (annotation.type === 'text' && editingAnnotation === annotation.id) {
          return false;
        }
        return isEditing;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Для текста - только если не редактируется
        if (annotation.type === 'text' && editingAnnotation === annotation.id) {
          return false;
        }
        
        // Начинаем перетаскивание только если движение достаточно большое
        if (isEditing && !isDraggingStarted) {
          const { dx, dy } = gestureState;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 10) {
            isDraggingStarted = true;
            setIsDragging(true);
            return true;
          }
        }
        return isDraggingStarted;
      },
      onPanResponderGrant: (evt) => {
        startX = annotation.x;
        startY = annotation.y;
        setSelectedAnnotation(annotation.id);
        setIsDragging(true);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isEditing) {
          const newX = Math.max(0, Math.min(startX + gestureState.dx, SCREEN_WIDTH - annotation.width));
          const newY = Math.max(0, Math.min(startY + gestureState.dy, SCREEN_HEIGHT - annotation.height));
          onAnnotationUpdate(annotation.id, { x: newX, y: newY });
        }
      },
      onPanResponderRelease: () => {
        setSelectedAnnotation(null);
        setIsDragging(false);
        isDraggingStarted = false;
      },
      onPanResponderTerminate: () => {
        setSelectedAnnotation(null);
        setIsDragging(false);
        isDraggingStarted = false;
      },
    });

    panResponders.current[annotation.id] = panResponder;
    return panResponder;
  };

  const handleAnnotationPress = (annotation: Annotation) => {
    if (!isEditing) return;
    
    if (annotation.type === 'text') {
      setEditingAnnotation(annotation.id);
      setEditingText(annotation.content || '');
    }
  };

  const handleAnnotationLongPress = (annotation: Annotation) => {
    if (!isEditing) return;
    
    if (annotation.type === 'image') {
      setZIndexAnnotationId(annotation.id);
      setShowZIndexMenu(true);
    } else if (annotation.type === 'text') {
      // Для текста долгое нажатие также открывает редактирование
      setEditingAnnotation(annotation.id);
      setEditingText(annotation.content || '');
    }
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
      // Сохраняем финальные изменения
      onAnnotationUpdate(editingAnnotation, { content: editingText });
      setEditingAnnotation(null);
      setEditingText('');
      onEditingStateChange?.(false, null);
    }
  };

  // Публичная функция для закрытия редактирования извне
  React.useImperativeHandle(ref, () => ({
    closeEditing: handleCloseEditing,
  }), [editingAnnotation, editingText, onAnnotationUpdate, onEditingStateChange]);

  const handleColorSelect = (color: string) => {
    if (editingAnnotation) {
      onAnnotationUpdate(editingAnnotation, { color });
      setShowColorPicker(false);
    }
  };

  const handleFontSizeSelect = (size: number) => {
    if (editingAnnotation) {
      onAnnotationUpdate(editingAnnotation, { fontSize: size });
      setShowFontSizePicker(false);
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

  const renderAnnotation = (annotation: Annotation) => {
    const isEditingText = editingAnnotation === annotation.id;
    const isSelected = selectedAnnotation === annotation.id;
    const panResponder = createPanResponder(annotation);
    const currentColor = annotation.color || '#000000';
    const currentFontSize = annotation.fontSize || 16;

    if (annotation.type === 'text') {
      return (
        <View
          key={annotation.id}
          {...(panResponder?.panHandlers || {})}
          style={[
            styles.annotation,
            {
              left: annotation.x,
              top: annotation.y,
              width: annotation.width,
              height: annotation.height,
              zIndex: annotation.zIndex,
            },
            isSelected && styles.annotationSelected,
            isDragging && isSelected && styles.annotationDragging,
          ]}
        >
          {isEditingText ? (
            <>
              <View style={styles.textEditingContainer} pointerEvents="box-none">
                <View style={styles.textInputWrapper}>
                  <TextInput
                    style={[
                      styles.textAnnotation,
                      styles.textInput,
                      {
                        color: currentColor,
                        fontSize: currentFontSize,
                      },
                    ]}
                    value={editingText}
                    onChangeText={handleTextChange}
                    onSubmitEditing={handleTextSubmit}
                    onBlur={handleTextSubmit}
                    autoFocus
                    multiline
                    placeholder="Введите текст..."
                    placeholderTextColor={currentColor + '80'}
                    editable={true}
                    selectTextOnFocus={false}
                  />
                  {/* Кнопки Принять и Удалить рядом с текстом */}
                  <View style={styles.textActionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={handleCloseEditing}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.removeButton]}
                      onPress={() => {
                        onAnnotationDelete(annotation.id);
                        setEditingAnnotation(null);
                        setEditingText('');
                        Keyboard.dismiss();
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={styles.textContainer}
              onPress={() => handleAnnotationPress(annotation)}
              onLongPress={() => handleAnnotationLongPress(annotation)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.textAnnotation,
                  {
                    color: currentColor,
                    fontSize: currentFontSize,
                  },
                ]}
              >
                {annotation.content || ''}
              </Text>
              {isSelected && isEditing && (
                <View style={styles.dragIndicator}>
                  <Ionicons name="move-outline" size={16} color="#C9A89A" />
                  <Text style={styles.dragHint}>Перетащите</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (annotation.type === 'image') {
      return (
        <View
          key={annotation.id}
          {...panResponder.panHandlers}
          style={[
            styles.annotation,
            {
              left: annotation.x,
              top: annotation.y,
              width: annotation.width,
              height: annotation.height,
              zIndex: annotation.zIndex,
            },
            isSelected && styles.annotationSelected,
            isDragging && isSelected && styles.annotationDragging,
          ]}
          onLongPress={() => handleAnnotationLongPress(annotation)}
        >
          <Image
            source={{ uri: annotation.imageUri }}
            style={styles.imageAnnotation}
            contentFit="cover"
            priority="high"
            cachePolicy="disk"
            transition={0}
            fadeDuration={0}
          />
          {isSelected && isEditing && (
            <View style={styles.dragIndicator}>
              <Ionicons name="move-outline" size={16} color="#C9A89A" />
              <Text style={styles.dragHint}>Перетащите</Text>
            </View>
          )}
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
      <View style={styles.container}>
        {annotations.map(renderAnnotation)}
      </View>

      {/* Панель выбора цвета и размера над клавиатурой - показывается только при редактировании текста */}
      {editingAnnotation && isKeyboardVisible && currentEditingAnnotation && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          style={styles.keyboardToolbar}
        >
          <View style={styles.toolbarContent}>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => setShowColorPicker(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.colorPreview, { backgroundColor: currentEditingAnnotation.color || '#000000' }]} />
              <Text style={styles.toolbarButtonText}>Цвет</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => setShowFontSizePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="text-outline" size={20} color="#8B6F5F" />
              <Text style={styles.toolbarButtonText}>{currentEditingAnnotation.fontSize || 16}px</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

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
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  textAnnotation: {
    backgroundColor: 'transparent',
    padding: 4,
    minHeight: 24,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#C9A89A',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  textEditingContainer: {
    flex: 1,
    minWidth: 200,
  },
  textInputWrapper: {
    position: 'relative',
  },
  textActionButtons: {
    position: 'absolute',
    right: 8,
    top: 8,
    flexDirection: 'row',
    gap: 8,
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
  acceptButton: {
    backgroundColor: '#4ECDC4',
  },
  removeButton: {
    backgroundColor: '#FF4444',
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
    backgroundColor: 'rgba(201, 168, 154, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  dragHint: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
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
