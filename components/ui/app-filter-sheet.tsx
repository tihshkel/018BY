import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBottomSheet } from '@/components/ui/app-bottom-sheet';
import { AppButton } from '@/components/ui/app-button';
import { AppChip } from '@/components/ui/app-chip';
import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/design-tokens';

export type FilterOption<T extends string = string> = {
  value: T;
  label: string;
};

export type FilterSection<T extends string = string> = {
  id: string;
  title: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export interface AppFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  sections: FilterSection[];
  onReset: () => void;
  onApply: () => void;
  applyLabel?: string;
  resetLabel?: string;
}

export function AppFilterSheet({
  visible,
  onClose,
  title = 'Фильтры',
  sections,
  onReset,
  onApply,
  applyLabel = 'Применить',
  resetLabel = 'Сбросить',
}: AppFilterSheetProps) {
  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <View style={styles.footerRow}>
          <AppButton
            title={resetLabel}
            variant="outline"
            onPress={onReset}
            fullWidth={false}
            style={styles.footerBtn}
          />
          <AppButton
            title={applyLabel}
            onPress={onApply}
            fullWidth={false}
            style={styles.footerBtn}
          />
        </View>
      }
    >
      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <AppText variant="stepLabel" style={styles.sectionTitle}>
            {section.title}
          </AppText>
          <View style={styles.chipGrid}>
            {section.options.map((option) => (
              <AppChip
                key={option.value}
                label={option.label}
                selected={section.value === option.value}
                onPress={() => section.onChange(option.value)}
              />
            ))}
          </View>
        </View>
      ))}
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.textSecondary,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerBtn: {
    flex: 1,
  },
});
