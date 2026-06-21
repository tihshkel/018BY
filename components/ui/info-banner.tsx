import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing } from '@/constants/design-tokens';

export interface InfoBannerProps {
  message: string;
  style?: StyleProp<ViewStyle>;
}

export function InfoBanner({ message, style }: InfoBannerProps) {
  return (
    <View style={[styles.banner, style]}>
      <AppText variant="bodySm" style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    color: colors.info,
  },
});
