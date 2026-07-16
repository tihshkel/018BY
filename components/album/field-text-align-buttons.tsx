import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors, radii } from '@/constants/design-tokens';
import type { FieldTextAlign } from '@/utils/albumFieldTextAlign';

type FieldTextAlignButtonsProps = {
  value: FieldTextAlign;
  onChange: (align: FieldTextAlign) => void;
};

const ALIGN_OPTIONS: {
  id: FieldTextAlign;
  icon: 'format-align-left' | 'format-align-center' | 'format-align-right';
  label: string;
}[] = [
  { id: 'left', icon: 'format-align-left', label: 'По левому краю' },
  { id: 'center', icon: 'format-align-center', label: 'По центру' },
  { id: 'right', icon: 'format-align-right', label: 'По правому краю' },
];

export const FieldTextAlignButtons = memo(function FieldTextAlignButtons({
  value,
  onChange,
}: FieldTextAlignButtonsProps) {
  const active = value ?? 'left';

  return (
    <View style={styles.row}>
      {ALIGN_OPTIONS.map((option) => {
        const selected = active === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.button, selected && styles.buttonSelected]}
            onPress={() => onChange(option.id)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
          >
            <MaterialIcons
              name={option.icon}
              size={22}
              color={selected ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  button: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  buttonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
});
