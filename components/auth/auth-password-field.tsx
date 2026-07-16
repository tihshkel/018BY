import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, type TextInput } from 'react-native';

import { AppInput, type AppInputProps } from '@/components/ui/app-input';
import { colors } from '@/constants/design-tokens';

type AuthPasswordFieldProps = Omit<AppInputProps, 'secureTextEntry' | 'rightAccessory'> & {
  visibilityLabel?: string;
};

export const AuthPasswordField = forwardRef<TextInput, AuthPasswordFieldProps>(
  function AuthPasswordField({ visibilityLabel = 'Пароль', ...rest }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <AppInput
        ref={ref}
        {...rest}
        secureTextEntry={!visible}
        rightAccessory={
          <Pressable
            onPress={() => setVisible((value) => !value)}
            hitSlop={10}
            style={styles.toggle}
            accessibilityLabel={
              visible
                ? `Скрыть ${visibilityLabel.toLowerCase()}`
                : `Показать ${visibilityLabel.toLowerCase()}`
            }
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.textSecondary}
            />
          </Pressable>
        }
      />
    );
  },
);

const styles = StyleSheet.create({
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
