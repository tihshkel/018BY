import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii, spacing, surfaces } from '@/constants/design-tokens';
import { getReferralSourceLabel, type ReferralSource } from '@/utils/auth-session';

const REFERRAL_OPTIONS: ReferralSource[] = ['physical_album', 'instagram', 'organic'];

const REFERRAL_CHIP_LABELS: Record<ReferralSource, string> = {
  physical_album: 'Альбом',
  instagram: 'Instagram',
  organic: 'Другое',
};

type AuthReferralPickerProps = {
  value: ReferralSource;
  onChange: (value: ReferralSource) => void;
};

export function AuthReferralPicker({ value, onChange }: AuthReferralPickerProps) {
  return (
    <View style={styles.section}>
      <AppText variant="caption" style={styles.label}>
        Откуда узнали
      </AppText>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Откуда вы о нас узнали">
        {REFERRAL_OPTIONS.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && !selected && styles.chipPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={getReferralSourceLabel(option)}
            >
              <AppText
                variant="caption"
                style={[styles.chipText, selected && styles.chipTextSelected]}
                numberOfLines={1}
              >
                {REFERRAL_CHIP_LABELS[option]}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 6,
  },
  label: {
    color: colors.textSecondary,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 8,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: {
    borderColor: colors.textPrimary,
    backgroundColor: surfaces.muted,
  },
  chipPressed: {
    backgroundColor: surfaces.muted,
  },
  chipText: {
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
