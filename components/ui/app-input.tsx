import React, { forwardRef, useState } from 'react';
import {
  Keyboard,
  Platform,
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

const INPUT_MIN_HEIGHT = 52;

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
    multiline,
    returnKeyType,
    returnKeyLabel,
    enterKeyHint,
    blurOnSubmit,
    onSubmitEditing,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const helperMessage = error ?? helperText;
  const isMultiline = multiline === true;
  const resolvedReturnKeyType = returnKeyType ?? (isMultiline ? 'default' : 'done');
  const resolvedBlurOnSubmit = blurOnSubmit ?? !isMultiline;

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
          isMultiline ? styles.inputShellMultiline : styles.inputShellSingleLine,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          !error && success ? styles.inputSuccess : null,
          inputContainerStyle,
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          scrollEnabled={isMultiline ? rest.scrollEnabled : false}
          underlineColorAndroid="transparent"
          returnKeyType={resolvedReturnKeyType}
          returnKeyLabel={returnKeyLabel ?? (isMultiline ? undefined : 'OK')}
          enterKeyHint={enterKeyHint ?? (isMultiline ? 'enter' : 'done')}
          blurOnSubmit={resolvedBlurOnSubmit}
          onSubmitEditing={
            onSubmitEditing ??
            (isMultiline
              ? undefined
              : () => {
                  Keyboard.dismiss();
                })
          }
          style={[
            styles.input,
            isMultiline ? styles.inputMultiline : styles.inputSingleLine,
            !isMultiline && Platform.OS === 'android' ? styles.inputSingleLineAndroid : null,
            rightAccessory ? styles.inputWithAccessory : null,
            style,
          ]}
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
        {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
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
  inputShellSingleLine: {
    minHeight: INPUT_MIN_HEIGHT,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
  },
  inputShellMultiline: {
    minHeight: INPUT_MIN_HEIGHT,
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: sansFont('regular'),
    color: colors.textPrimary,
  },
  inputSingleLine: {
    paddingHorizontal: 0,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    margin: 0,
  },
  inputSingleLineAndroid: {
    includeFontPadding: false,
  },
  inputMultiline: {
    minHeight: INPUT_MIN_HEIGHT,
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlignVertical: 'top',
  },
  accessory: {
    alignSelf: 'center',
    justifyContent: 'center',
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
