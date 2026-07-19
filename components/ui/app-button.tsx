import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, createShadow, radii, typography } from '@/constants/design-tokens';
import { AppText } from '@/components/ui/app-text';

type AppButtonVariant = 'primary' | 'outline' | 'ghost';

export interface AppButtonProps {
  title: string;
  onPress?: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Подпись рядом со спиннером (например «Открываем…»). */
  loadingTitle?: string;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
  testID?: string;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  loadingTitle,
  style,
  fullWidth = true,
  testID,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerColor = variant === 'primary' ? colors.white : colors.primary;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        pressed && !isDisabled && variant === 'primary' && styles.primaryPressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={spinnerColor} />
          {loadingTitle ? (
            <AppText
              variant="button"
              style={[
                variant === 'outline' && styles.outlineText,
                variant === 'ghost' && styles.ghostText,
              ]}
            >
              {loadingTitle}
            </AppText>
          ) : null}
        </View>
      ) : (
        <AppText
          variant="button"
          style={[
            variant === 'outline' && styles.outlineText,
            variant === 'ghost' && styles.ghostText,
          ]}
        >
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: colors.primary,
    ...createShadow('sm'),
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  outlineText: {
    color: colors.textPrimary,
  },
  ghostText: {
    color: colors.primary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
