import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppBottomSheet } from '@/components/ui/app-bottom-sheet';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing, surfaces } from '@/constants/design-tokens';

export interface AppPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  doneLabel?: string;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  size?: 'auto' | 'large';
}

export function AppPickerSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  doneLabel = 'Готово',
  scroll = true,
  contentContainerStyle,
  size = 'auto',
}: AppPickerSheetProps) {
  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      scroll={scroll}
      size={size}
      contentContainerStyle={contentContainerStyle}
      footer={<AppButton title={doneLabel} variant="ghost" onPress={onClose} />}
    >
      <View style={styles.contentWrap}>{children}</View>
    </AppBottomSheet>
  );
}

type AppPickerSectionProps = {
  label?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AppPickerSection({ label, children, style }: AppPickerSectionProps) {
  return (
    <View style={[styles.section, style]}>
      {label ? (
        <AppText variant="stepLabel" style={styles.sectionLabel}>
          {label}
        </AppText>
      ) : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textSecondary,
  },
  sectionBody: {
    backgroundColor: surfaces.muted,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
