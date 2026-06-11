import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export const FLOATING_TEXT_INPUT_ACCESSORY_ID = 'floating-text-editing';

type FloatingTextEditingToolbarProps = {
  onNewLine: () => void;
  onDone: () => void;
  onDelete: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FloatingTextEditingToolbar({
  onNewLine,
  onDone,
  onDelete,
  disabled = false,
  style,
}: FloatingTextEditingToolbarProps) {
  const handleNewLine = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNewLine();
  };

  const handleDone = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDone();
  };

  const handleDelete = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDelete();
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
        onPress={handleNewLine}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Новая строка"
      >
        <Ionicons name="return-down-back" size={18} color="#8B6F5F" />
        <Text style={styles.secondaryButtonText}>Новая строка</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryButton, disabled && styles.buttonDisabled]}
        onPress={handleDone}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Готово"
      >
        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
        <Text style={styles.primaryButtonText}>Готово</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteButton, disabled && styles.buttonDisabled]}
        onPress={handleDelete}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Удалить текст"
      >
        <Ionicons name="trash-outline" size={18} color="#B85C5C" />
        <Text style={styles.deleteButtonText}>Удалить</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAF8F5',
    borderTopWidth: 1,
    borderTopColor: '#E8D5C7',
    ...Platform.select({
      ios: {
        shadowColor: '#8B6F5F',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    backgroundColor: '#FFFFFF',
    flexShrink: 1,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B6F5F',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#C9A89A',
    minWidth: 108,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F0D4D4',
    flexShrink: 1,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B85C5C',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
