import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppBottomSheet, AppCard, AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';

export type RegionOption<T extends string = string> = {
  value: T;
  label: string;
  /** Emoji flag — renders natively on iOS (Apple Color Emoji). */
  flag?: string;
};

type RegionPickerSheetProps<T extends string = string> = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  options: RegionOption<T>[];
  selectedValue: T | null;
  onSelect: (value: T) => void;
};

export function RegionPickerSheet<T extends string = string>({
  visible,
  onClose,
  title = 'Выберите регион',
  description = 'Выберите ваш регион для отображения актуальных цен',
  options,
  selectedValue,
  onSelect,
}: RegionPickerSheetProps<T>) {
  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={description}
      scroll={false}
      dismissOnBackdrop={false}
      showClose={false}
    >
      <AppCard style={styles.card}>
        {options.map((region, index) => {
          const isSelected = selectedValue === region.value;
          return (
            <Pressable
              key={region.value}
              onPress={() => onSelect(region.value)}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
                index < options.length - 1 && styles.rowBorder,
              ]}
            >
              <View style={styles.rowLeading}>
                {region.flag ? (
                  <View style={[styles.flagWrap, isSelected && styles.flagWrapSelected]}>
                    <AppText style={styles.flag}>{region.flag}</AppText>
                  </View>
                ) : null}
                <AppText variant="body" style={isSelected ? styles.selectedText : undefined}>
                  {region.label}
                </AppText>
              </View>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </AppCard>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  rowLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: spacing.sm,
  },
  flagWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  flagWrapSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  flag: {
    fontSize: 24,
    lineHeight: 28,
  },
  rowPressed: {
    backgroundColor: colors.primarySurface,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  selectedText: {
    fontWeight: '600',
    color: colors.primary,
  },
});
