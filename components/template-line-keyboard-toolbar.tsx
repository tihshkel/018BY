import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
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

export const TEMPLATE_LINE_INPUT_ACCESSORY_ID = 'template-line-nav';

type TemplateLineKeyboardToolbarProps = {
  canGoBack: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  style?: StyleProp<ViewStyle>;
};

export function TemplateLineKeyboardToolbar({
  canGoBack,
  canGoNext,
  onPrevious,
  onNext,
  style,
}: TemplateLineKeyboardToolbarProps) {
  const handlePrevious = () => {
    if (!canGoBack) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPrevious();
  };

  const handleNext = () => {
    if (!canGoNext) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.button, !canGoBack && styles.buttonDisabled]}
        onPress={handlePrevious}
        disabled={!canGoBack}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Предыдущее поле"
        accessibilityState={{ disabled: !canGoBack }}
      >
        <Ionicons name="chevron-back" size={18} color={canGoBack ? colors.textPrimary : '#C9B8AB'} />
        <Text style={[styles.buttonText, !canGoBack && styles.buttonTextDisabled]}>Назад</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, !canGoNext && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={!canGoNext}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Следующее пустое поле"
        accessibilityState={{ disabled: !canGoNext }}
      >
        <Text style={[styles.buttonText, !canGoNext && styles.buttonTextDisabled]}>Дальше</Text>
        <Ionicons name="chevron-forward" size={18} color={canGoNext ? colors.textPrimary : '#C9B8AB'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: '#E8D5C7',
    ...Platform.select({
      ios: {
        shadowColor: colors.textPrimary,
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
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    backgroundColor: '#FFFFFF',
    minWidth: 108,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.55,
    backgroundColor: colors.border,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  buttonTextDisabled: {
    color: '#C9B8AB',
  },
});
