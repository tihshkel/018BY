import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { colors, motion, radii, sansFont, spacing } from '@/constants/design-tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface AppChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function AppChip({
  label,
  selected = false,
  onPress,
}: AppChipProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(motion.pressScale, { duration: motion.fast });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: motion.fast });
      }}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <AppText
        variant="bodySm"
        style={[styles.label, selected && styles.labelSelected]}
      >
        {label}
      </AppText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.chipSelectedBg,
  },
  label: {
    color: colors.textPrimary,
    fontFamily: sansFont('regular'),
  },
  labelSelected: {
    color: colors.primary,
    fontFamily: sansFont('medium'),
  },
});
