import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HomeActionRow } from '@/components/home/home-action-row';
import { AppBottomSheet } from '@/components/ui/app-bottom-sheet';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { spacing } from '@/constants/design-tokens';

export type AppActionSheetItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
};

export interface AppActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  actions: AppActionSheetItem[];
  cancelLabel?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

export function AppActionSheet({
  visible,
  onClose,
  title,
  subtitle,
  actions,
  cancelLabel = 'Отмена',
  footer,
  children,
}: AppActionSheetProps) {
  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      scroll={false}
      footer={
        footer ?? (
          <AppButton title={cancelLabel} variant="ghost" onPress={onClose} />
        )
      }
    >
      {children}
      <AppCard style={styles.card}>
        {actions.map((action, index) => (
          <HomeActionRow
            key={action.id}
            icon={action.icon ?? 'ellipse-outline'}
            title={action.title}
            subtitle={action.subtitle}
            onPress={action.onPress}
            destructive={action.destructive}
            showChevron={false}
            showDivider={index < actions.length - 1}
          />
        ))}
      </AppCard>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xs,
  },
});
