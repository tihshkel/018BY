import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/design-tokens';

type HomeSectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function HomeSectionHeader({ title, actionLabel, onActionPress }: HomeSectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="titleSm">{title}</AppText>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <AppText variant="bodySm" style={styles.action}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  action: {
    color: colors.primary,
    fontWeight: '600',
  },
});
