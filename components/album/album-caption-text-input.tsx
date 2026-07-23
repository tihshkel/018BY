import React from 'react';
import {
  Keyboard,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type TextInputProps,
} from 'react-native';

import { useKeyboardAwareFieldRef } from '@/components/ui/app-screen';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';

type AlbumCaptionTextInputProps = Omit<TextInputProps, 'style'> & {
  style?: StyleProp<TextStyle>;
};

/**
 * Подпись к фото: тот же scroll-к-полю при клавиатуре, что у PageFormFields / AppInput.
 */
export function AlbumCaptionTextInput({
  style,
  onFocus,
  ...rest
}: AlbumCaptionTextInputProps) {
  const { fieldRef, onInputFocus } = useKeyboardAwareFieldRef();

  return (
    <View ref={fieldRef} collapsable={false}>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        returnKeyLabel="OK"
        enterKeyHint="done"
        blurOnSubmit
        onSubmitEditing={() => Keyboard.dismiss()}
        onFocus={(event) => {
          onInputFocus();
          onFocus?.(event);
        }}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: sansFont('regular'),
    color: colors.textPrimary,
    backgroundColor: colors.white,
    minHeight: 48,
  },
});
