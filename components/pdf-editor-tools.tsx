import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { Annotation } from './pdf-annotations';

interface PdfEditorToolsProps {
  onToolSelect: (tool: 'text' | 'image' | 'drawing' | null) => void;
  onAddImage: (imageUri: string) => void;
  currentTool: 'text' | 'image' | 'drawing' | null;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  onExport: () => void;
}

const colorOptions = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'
];

const fontSizeOptions = [12, 14, 16, 18, 20, 24, 28, 32];

export default function PdfEditorTools({
  onToolSelect,
  onAddImage,
  currentTool,
  isEditing,
  onToggleEdit,
  onSave,
  onExport,
}: PdfEditorToolsProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedFontSize, setSelectedFontSize] = useState(16);

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Доступ к галерее запрещён');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      onAddImage(result.assets[0].uri);
    }
  };

  const handleToolPress = (tool: 'text' | 'image' | 'drawing' | null) => {
    if (tool === 'image') {
      handleImagePicker();
    } else {
      onToolSelect(tool);
    }
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setShowColorPicker(false);
  };

  const handleFontSizeSelect = (size: number) => {
    setSelectedFontSize(size);
    setShowFontSizePicker(false);
  };

  return (
    <View style={styles.container}>
      {/* Основные инструменты */}
      <View style={styles.toolsRow}>
        <TouchableOpacity
          style={[styles.toolButton, isEditing && styles.toolButtonActive]}
          onPress={onToggleEdit}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? "Завершить редактирование" : "Начать редактирование"}
        >
          <View style={styles.toolIconWrapper}>
            <Ionicons 
              name={isEditing ? "checkmark-circle" : "create-outline"} 
              size={22} 
              color={isEditing ? "#FFFFFF" : "#C9A89A"} 
            />
          </View>
          <Text style={[styles.toolText, isEditing && styles.toolTextActive]}>
            {isEditing ? 'Готово' : 'Редактировать'}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <>
            <TouchableOpacity
              style={[styles.toolButton, currentTool === 'text' && styles.toolButtonSelected]}
              onPress={() => handleToolPress('text')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Добавить текст"
            >
              <View style={styles.toolIconWrapper}>
                <Ionicons 
                  name="text-outline" 
                  size={22} 
                  color={currentTool === 'text' ? "#C9A89A" : "#8B6F5F"} 
                />
              </View>
              <Text style={[styles.toolText, currentTool === 'text' && styles.toolTextSelected]}>
                Текст
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolButton, currentTool === 'image' && styles.toolButtonSelected]}
              onPress={() => handleToolPress('image')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Добавить фото"
            >
              <View style={styles.toolIconWrapper}>
                <Ionicons 
                  name="image-outline" 
                  size={22} 
                  color={currentTool === 'image' ? "#C9A89A" : "#8B6F5F"} 
                />
              </View>
              <Text style={[styles.toolText, currentTool === 'image' && styles.toolTextSelected]}>
                Фото
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolButton, currentTool === 'drawing' && styles.toolButtonSelected]}
              onPress={() => handleToolPress('drawing')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Рисовать"
            >
              <View style={styles.toolIconWrapper}>
                <Ionicons 
                  name="brush-outline" 
                  size={22} 
                  color={currentTool === 'drawing' ? "#C9A89A" : "#8B6F5F"} 
                />
              </View>
              <Text style={[styles.toolText, currentTool === 'drawing' && styles.toolTextSelected]}>
                Рисовать
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Дополнительные настройки для текста */}
      {isEditing && currentTool === 'text' && (
        <View style={styles.settingsRow}>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => setShowColorPicker(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Выбрать цвет текста"
          >
            <View style={[styles.colorPreview, { backgroundColor: selectedColor }]} />
            <Text style={styles.settingText}>Цвет</Text>
            <Ionicons name="chevron-forward" size={16} color="#9B8E7F" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => setShowFontSizePicker(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Выбрать размер шрифта"
          >
            <Ionicons name="text" size={18} color="#8B6F5F" />
            <Text style={styles.settingText}>{selectedFontSize}px</Text>
            <Ionicons name="chevron-forward" size={16} color="#9B8E7F" />
          </TouchableOpacity>
        </View>
      )}

      {/* Кнопки действий */}
      {isEditing && (
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={onSave}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Сохранить изменения"
          >
            <Ionicons name="save-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionText}>Сохранить</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonSecondary]} 
            onPress={onExport}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Экспортировать PDF"
          >
            <Ionicons name="download-outline" size={20} color="#C9A89A" />
            <Text style={styles.actionTextSecondary}>Экспорт</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Модальное окно выбора цвета */}
      <Modal
        visible={showColorPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите цвет</Text>
            <View style={styles.colorGrid}>
              {colorOptions.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => handleColorSelect(color)}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowColorPicker(false)}
            >
              <Text style={styles.modalButtonText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Модальное окно выбора размера шрифта */}
      <Modal
        visible={showFontSizePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFontSizePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите размер шрифта</Text>
            <ScrollView style={styles.fontSizeList}>
              {fontSizeOptions.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.fontSizeOption,
                    selectedFontSize === size && styles.fontSizeOptionSelected,
                  ]}
                  onPress={() => handleFontSizeSelect(size)}
                >
                  <Text style={[styles.fontSizeText, { fontSize: size }]}>
                    {size}px
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowFontSizePicker(false)}
            >
              <Text style={styles.modalButtonText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F5F0EB',
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 10,
  },
  toolButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    minHeight: 52,
    gap: 8,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toolButtonActive: {
    backgroundColor: '#C9A89A',
    borderColor: '#C9A89A',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toolButtonSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9A89A',
    borderWidth: 2,
  },
  toolIconWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: {
    fontSize: 13,
    color: '#8B6F5F',
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  toolTextActive: {
    color: '#FFFFFF',
  },
  toolTextSelected: {
    color: '#C9A89A',
    fontWeight: '600',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  settingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    gap: 10,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8D5C7',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  settingText: {
    flex: 1,
    fontSize: 14,
    color: '#8B6F5F',
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#C9A89A',
    borderRadius: 16,
    gap: 8,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#C9A89A',
  },
  actionText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  actionTextSecondary: {
    color: '#C9A89A',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(139, 111, 95, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#F5F0EB',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#8B6F5F',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 28,
  },
  colorOption: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  colorOptionSelected: {
    borderColor: '#C9A89A',
    borderWidth: 4,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  fontSizeList: {
    maxHeight: 240,
    marginBottom: 28,
  },
  fontSizeOption: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
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
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  modalButton: {
    backgroundColor: '#C9A89A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
});
