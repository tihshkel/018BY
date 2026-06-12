import React from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { typography } from '@/constants/design-tokens';

type AppTextVariant = keyof typeof typography;

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  style?: StyleProp<TextStyle>;
}

export function AppText({ variant = 'body', style, ...rest }: AppTextProps) {
  return <Text style={[typography[variant], style]} {...rest} />;
}
