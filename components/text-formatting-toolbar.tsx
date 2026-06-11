import type { AnnotationTextAlign } from '@/components/pdf-annotations';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type TextFormattingToolbarProps = {
  color: string;
  fontSize: number;
  fontFamilyLabel: string;
  textAlign: AnnotationTextAlign;
  showFontSize?: boolean;
  onColorPress: () => void;
  onFontSizePress: () => void;
  onFontPress: () => void;
  onTextAlignPress: (align: AnnotationTextAlign) => void;
  onToolbarPressIn?: () => void;
};

const ALIGN_OPTIONS: {
  id: AnnotationTextAlign;
  icon: 'format-align-left' | 'format-align-center' | 'format-align-right';
  label: string;
}[] = [
  { id: 'left', icon: 'format-align-left', label: 'По левому краю' },
  { id: 'center', icon: 'format-align-center', label: 'По центру' },
  { id: 'right', icon: 'format-align-right', label: 'По правому краю' },
];

export function TextFormattingToolbar({
  color,
  fontSize,
  fontFamilyLabel,
  textAlign,
  showFontSize = true,
  onColorPress,
  onFontSizePress,
  onFontPress,
  onTextAlignPress,
  onToolbarPressIn,
}: TextFormattingToolbarProps) {
  const activeAlign = textAlign ?? 'left';

  return (
    <View style={styles.panel}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
      >
        <TouchableOpacity
          style={styles.toolButton}
          onPressIn={onToolbarPressIn}
          onPress={onColorPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Изменить цвет текста"
        >
          <View style={[styles.colorSwatch, { backgroundColor: color || '#000000' }]} />
          <Text style={styles.toolButtonText}>Цвет</Text>
        </TouchableOpacity>

        {showFontSize ? (
          <TouchableOpacity
            style={styles.toolButton}
            onPressIn={onToolbarPressIn}
            onPress={onFontSizePress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Изменить размер шрифта"
          >
            <View style={styles.toolIconContainer}>
              <Ionicons name="text-outline" size={20} color="#8B6F5F" />
            </View>
            <Text style={styles.toolButtonText}>{fontSize}px</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.toolButton, styles.toolButtonFont]}
          onPressIn={onToolbarPressIn}
          onPress={onFontPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Изменить шрифт"
        >
          <View style={styles.toolIconContainer}>
            <Ionicons name="brush-outline" size={20} color="#8B6F5F" />
          </View>
          <Text style={styles.toolButtonText} numberOfLines={1}>
            {fontFamilyLabel}
          </Text>
        </TouchableOpacity>

        <View style={styles.alignSection}>
          {ALIGN_OPTIONS.map((option) => {
            const isActive = activeAlign === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.alignButton, isActive && styles.alignButtonActive]}
                onPressIn={onToolbarPressIn}
                onPress={() => onTextAlignPress(option.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isActive }}
              >
                <MaterialIcons
                  name={option.icon}
                  size={20}
                  color={isActive ? '#FFFFFF' : '#8B6F5F'}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8E0',
    paddingVertical: 12,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    minHeight: 48,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  toolButtonFont: {
    maxWidth: 190,
    flexShrink: 1,
  },
  toolIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolButtonText: {
    fontSize: 14,
    color: '#8B6F5F',
    fontWeight: '600',
    flexShrink: 1,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
  },
  alignSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 2,
  },
  alignButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    backgroundColor: '#FAF8F5',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  alignButtonActive: {
    backgroundColor: '#C9A89A',
    borderColor: '#C9A89A',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
});
