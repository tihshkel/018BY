import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/design-tokens';

type AuthErrorBannerProps = {
  message: string;
  style?: StyleProp<ViewStyle>;
};

export function AuthErrorBanner({ message, style }: AuthErrorBannerProps) {
  return (
    <View style={[styles.banner, style]} accessibilityRole="alert">
      <AppText variant="bodySm" style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF8F8',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#F0D0D0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    color: colors.error,
    lineHeight: 20,
  },
});
