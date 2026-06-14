import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing, surfaces } from '@/constants/design-tokens';

export interface AppModalHeaderProps {
  title: string;
  onClose: () => void;
  subtitle?: string;
  showClose?: boolean;
}

export function AppModalHeader({
  title,
  onClose,
  subtitle,
  showClose = true,
}: AppModalHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        <AppText variant="titleSm">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {showClose ? (
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: surfaces.muted,
  },
});
