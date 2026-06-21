import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';

export type AppInputHelperTone = 'muted' | 'success' | 'error';

export interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  helperTone?: AppInputHelperTone;
  success?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  rightAccessory?: React.ReactNode;
}

export const AppInput = forwardRef<TextInput, AppInputProps>(function AppInput(
  {
    label,
    error,
    helperText,
    helperTone = 'muted',
    success = false,
    containerStyle,
    inputContainerStyle,
    rightAccessory,
    style,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const helperMessage = error ?? helperText;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <AppText variant="caption" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.inputShell,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          !error && success ? styles.inputSuccess : null,
          inputContainerStyle,
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          style={[styles.input, rightAccessory ? styles.inputWithAccessory : null, style]}
          placeholderTextColor={colors.placeholder}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {rightAccessory}
      </View>
      {helperMessage ? (
        <AppText
          variant="caption"
          style={[
            styles.helper,
            error || helperTone === 'error'
              ? styles.helperError
              : helperTone === 'success'
                ? styles.helperSuccess
                : styles.helperMuted,
          ]}
        >
          {helperMessage}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    color: colors.textSecondary,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: sansFont('regular'),
    color: colors.textPrimary,
  },
  inputWithAccessory: {
    paddingRight: 4,
  },
  inputFocused: {
    borderColor: colors.focusRing,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputSuccess: {
    borderColor: colors.statusFilled,
  },
  helper: {
    marginTop: 2,
  },
  helperMuted: {
    color: colors.textSecondary,
  },
  helperSuccess: {
    color: colors.statusFilled,
  },
  helperError: {
    color: colors.error,
  },
});
