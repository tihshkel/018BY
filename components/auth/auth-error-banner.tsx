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
    backgroundColor: '#FFF5F5',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#F5C2C2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    color: colors.error,
  },
});
