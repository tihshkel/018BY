import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import type { FontOption } from '@/constants/album-fonts';
import {
  AppActionSheet,
  AppPickerSection,
  AppPickerSheet,
  AppText,
} from '@/components/ui';
import { colors, radii, spacing, surfaces } from '@/constants/design-tokens';

export const EDITOR_PICKER_COLORS = [
  '#000000',
  colors.textPrimary,
  colors.primary,
  colors.textSecondary,
  '#5B4D3F',
  colors.tabInactive,
  colors.border,
  '#FFFFFF',
];

export const EDITOR_FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40];

export const EDITOR_TOOL_COLORS = [
  '#000000',
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#FFA500',
  '#800080',
  '#008000',
];

type EditorColorPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  colors?: string[];
  selectedColor?: string;
  onSelectColor: (color: string) => void;
};

export function EditorColorPickerSheet({
  visible,
  onClose,
  colors: palette = EDITOR_PICKER_COLORS,
  selectedColor,
  onSelectColor,
}: EditorColorPickerSheetProps) {
  return (
    <AppPickerSheet
      visible={visible}
      onClose={onClose}
      title="Выберите цвет"
      scroll={false}
    >
      <AppPickerSection label="Палитра">
        <View style={styles.colorGrid}>
          {palette.map((color) => {
            const isSelected = selectedColor === color;
            const isWhite = color === '#FFFFFF';

            return (
              <Pressable
                key={color}
                onPress={() => onSelectColor(color)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  isWhite && styles.colorSwatchWhite,
                  isSelected && styles.colorSwatchSelected,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              />
            );
          })}
        </View>
      </AppPickerSection>
    </AppPickerSheet>
  );
}

type EditorFontSizePickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  sizes?: number[];
  selectedSize?: number;
  onSelectSize: (size: number) => void;
  showSampleText?: boolean;
};

export function EditorFontSizePickerSheet({
  visible,
  onClose,
  sizes = EDITOR_FONT_SIZES,
  selectedSize,
  onSelectSize,
  showSampleText = false,
}: EditorFontSizePickerSheetProps) {
  return (
    <AppPickerSheet visible={visible} onClose={onClose} title="Выберите размер" size="large">
      <AppPickerSection label="Размер шрифта">
        <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
          {sizes.map((size) => {
            const isSelected = selectedSize === size;

            return (
              <Pressable
                key={size}
                onPress={() => onSelectSize(size)}
                style={[styles.optionRow, isSelected && styles.optionRowSelected]}
              >
                <AppText
                  variant="body"
                  style={[
                    styles.fontSizePreview,
                    { fontSize: size },
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {showSampleText ? `${size}px — Пример текста` : `${size}px`}
                </AppText>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </AppPickerSection>
    </AppPickerSheet>
  );
}

type EditorFontPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  fonts: FontOption[];
  selectedFontId?: string;
  onSelectFont: (fontId: string) => void;
};

export function EditorFontPickerSheet({
  visible,
  onClose,
  fonts,
  selectedFontId = 'default',
  onSelectFont,
}: EditorFontPickerSheetProps) {
  return (
    <AppPickerSheet visible={visible} onClose={onClose} title="Выберите шрифт" size="large">
      <AppPickerSection label="Шрифты">
        <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
          {fonts.map((font) => {
            const isSelected = selectedFontId === font.id;

            return (
              <Pressable
                key={font.id}
                onPress={() => onSelectFont(font.id)}
                style={[styles.optionRow, isSelected && styles.optionRowSelected]}
              >
                <AppText
                  variant="body"
                  style={[
                    styles.fontPreview,
                    {
                      fontFamily:
                        font.id === 'default'
                          ? Platform.select({
                              ios: 'System',
                              android: 'sans-serif',
                              default: 'sans-serif',
                            })
                          : font.name,
                    },
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {font.displayName}
                </AppText>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </AppPickerSection>
    </AppPickerSheet>
  );
}

type EditorZIndexSheetProps = {
  visible: boolean;
  onClose: () => void;
  onMoveForward: () => void;
  onMoveBackward: () => void;
};

export function EditorZIndexSheet({
  visible,
  onClose,
  onMoveForward,
  onMoveBackward,
}: EditorZIndexSheetProps) {
  return (
    <AppActionSheet
      visible={visible}
      onClose={onClose}
      title="Порядок отображения"
      subtitle="Измените расположение элемента относительно других"
      actions={[
        {
          id: 'forward',
          title: 'На передний план',
          icon: 'arrow-up-outline',
          onPress: onMoveForward,
        },
        {
          id: 'backward',
          title: 'На задний план',
          icon: 'arrow-down-outline',
          onPress: onMoveBackward,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  colorSwatchWhite: {
    borderWidth: 2,
    borderColor: colors.border,
  },
  colorSwatchSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  optionList: {
    maxHeight: 320,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
    backgroundColor: surfaces.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  optionRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  fontSizePreview: {
    color: colors.textPrimary,
  },
  fontPreview: {
    color: colors.textPrimary,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
