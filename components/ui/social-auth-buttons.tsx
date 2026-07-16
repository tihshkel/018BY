import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppleIcon } from '@/components/icons/apple-icon';
import { GoogleIcon } from '@/components/icons/google-icon';
import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing, surfaces } from '@/constants/design-tokens';
import { AUTH_CONTENT_MAX_WIDTH } from '@/utils/responsive';

type SocialAuthMode = 'login' | 'register';

export type SocialAuthButtonsProps = {
  mode?: SocialAuthMode;
  disabled?: boolean;
  loadingProvider?: 'google' | 'apple' | null;
  onGooglePress?: () => void;
  onApplePress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Показать разделитель над кнопками (по умолчанию true). */
  showDivider?: boolean;
  dividerLabel?: string;
};

function getGoogleLabel(mode: SocialAuthMode): string {
  return 'Google';
}

function getAppleLabel(mode: SocialAuthMode): string {
  return 'Apple';
}

type SocialButtonProps = {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel: string;
  emphasis?: 'default' | 'apple';
};

function SocialButton({
  label,
  icon,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel,
  emphasis = 'default',
}: SocialButtonProps) {
  const isDisabled = disabled || loading;
  const isApple = emphasis === 'apple';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        isApple && styles.buttonApple,
        pressed && !isDisabled && (isApple ? styles.buttonApplePressed : styles.buttonPressed),
        isDisabled && styles.buttonDisabled,
      ]}
    >
      <View style={styles.iconSlot}>
        {loading ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          icon
        )}
      </View>
      <AppText variant="button" style={[styles.buttonLabel, isApple && styles.buttonLabelApple]}>
        {label}
      </AppText>
      <View style={styles.iconSlot} />
    </Pressable>
  );
}

export function SocialAuthButtons({
  mode = 'login',
  disabled = false,
  loadingProvider = null,
  onGooglePress,
  onApplePress,
  style,
  showDivider = true,
  dividerLabel = 'или',
}: SocialAuthButtonsProps) {
  return (
    <View style={[styles.container, style]}>
      {showDivider ? (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <AppText variant="caption" style={styles.dividerText}>
            {dividerLabel}
          </AppText>
          <View style={styles.dividerLine} />
        </View>
      ) : null}

      <View style={styles.buttonsColumn}>
        {Platform.OS === 'ios' ? (
          <SocialButton
            label={getAppleLabel(mode)}
            icon={<AppleIcon size={18} color={colors.textPrimary} />}
            onPress={onApplePress}
            disabled={disabled}
            loading={loadingProvider === 'apple'}
            accessibilityLabel={getAppleLabel(mode)}
            emphasis="apple"
          />
        ) : null}

        <SocialButton
          label={getGoogleLabel(mode)}
          icon={<GoogleIcon size={20} />}
          onPress={onGooglePress}
          disabled={disabled}
          loading={loadingProvider === 'google'}
          accessibilityLabel={getGoogleLabel(mode)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
  },
  buttonsColumn: {
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  buttonApple: {
    backgroundColor: colors.white,
    borderColor: colors.border,
  },
  buttonPressed: {
    backgroundColor: surfaces.muted,
  },
  buttonApplePressed: {
    backgroundColor: surfaces.muted,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  iconSlot: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontWeight: '500',
  },
  buttonLabelApple: {
    color: colors.textPrimary,
  },
});
