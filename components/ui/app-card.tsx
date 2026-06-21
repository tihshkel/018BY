import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, createShadow, radii } from '@/constants/design-tokens';

export interface AppCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function AppCard({ children, onPress, selected = false, style, testID }: AppCardProps) {
  const content = (
    <View style={[styles.card, selected && styles.selected, style]}>{children}</View>
  );

  if (onPress) {
    return (
      <Pressable testID={testID} onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...createShadow('sm'),
  },
  selected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.92,
  },
});
