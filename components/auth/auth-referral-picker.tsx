import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppCard, AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';
import { getReferralSourceLabel, type ReferralSource } from '@/utils/auth-session';

const REFERRAL_OPTIONS: ReferralSource[] = ['physical_album', 'instagram', 'organic'];

const REFERRAL_OPTION_ICONS: Record<ReferralSource, keyof typeof Ionicons.glyphMap> = {
  physical_album: 'book-outline',
  instagram: 'logo-instagram',
  organic: 'search-outline',
};

type AuthReferralPickerProps = {
  value: ReferralSource;
  onChange: (value: ReferralSource) => void;
};

export function AuthReferralPicker({ value, onChange }: AuthReferralPickerProps) {
  return (
    <View style={styles.section}>
      <AppText variant="caption" style={styles.label}>
        Откуда вы о нас узнали
      </AppText>
      <AppCard style={styles.card} accessibilityRole="radiogroup" accessibilityLabel="Откуда вы о нас узнали">
        {REFERRAL_OPTIONS.map((option, index) => {
          const selected = option === value;
          const isLast = index === REFERRAL_OPTIONS.length - 1;

          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                !isLast && styles.rowDivider,
                pressed && !selected && styles.rowPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={getReferralSourceLabel(option)}
            >
              <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
                <Ionicons
                  name={REFERRAL_OPTION_ICONS[option]}
                  size={18}
                  color={selected ? colors.primary : colors.textSecondary}
                />
              </View>
              <AppText
                variant="bodySm"
                style={[styles.rowText, selected && styles.rowTextSelected]}
                numberOfLines={2}
              >
                {getReferralSourceLabel(option)}
              </AppText>
              {selected ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              ) : (
                <View style={styles.radioCircle} />
              )}
            </Pressable>
          );
        })}
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 6,
  },
  label: {
    color: colors.textSecondary,
    marginLeft: 2,
  },
  card: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowSelected: {
    backgroundColor: colors.primarySurface,
  },
  rowPressed: {
    backgroundColor: colors.background,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  iconWrapSelected: {
    backgroundColor: colors.chipSelectedBg,
  },
  rowText: {
    flex: 1,
    color: colors.textPrimary,
  },
  rowTextSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
});
