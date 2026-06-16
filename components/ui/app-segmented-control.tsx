import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, sansFont, spacing, surfaces } from '@/constants/design-tokens';

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
  testID?: string;
};

type AppSegmentedControlProps<T extends string> = {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

export function AppSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: AppSegmentedControlProps<T>) {
  if (options.length === 0) return null;

  return (
    <View
      style={styles.track}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && !selected && styles.segmentPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <AppText
              variant="bodySm"
              style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: surfaces.muted,
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  segmentSelected: {
    backgroundColor: colors.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentPressed: {
    opacity: 0.85,
  },
  segmentLabel: {
    color: colors.textSecondary,
    fontFamily: sansFont('regular'),
  },
  segmentLabelSelected: {
    color: colors.textPrimary,
    fontFamily: sansFont('semibold'),
    fontWeight: '600',
  },
});
