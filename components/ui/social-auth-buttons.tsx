import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppleIcon } from '@/components/icons/apple-icon';
import { GoogleIcon } from '@/components/icons/google-icon';
import { AppText } from '@/components/ui/app-text';
import { colors, createShadow, radii } from '@/constants/design-tokens';
import { AUTH_CONTENT_MAX_WIDTH } from '@/utils/responsive';

type SocialAuthMode = 'login' | 'register';

export type SocialAuthButtonsProps = {
  mode?: SocialAuthMode;
  disabled?: boolean;
  loadingProvider?: 'google' | 'apple' | null;
  onGooglePress?: () => void;
  onApplePress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function getGoogleLabel(mode: SocialAuthMode): string {
  return mode === 'register' ? 'Продолжить с Google' : 'Войти через Google';
}

function getAppleLabel(mode: SocialAuthMode): string {
  return mode === 'register' ? 'Продолжить с Apple' : 'Войти через Apple';
}

type SocialButtonProps = {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel: string;
};

function SocialButton({
  label,
  icon,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel,
}: SocialButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
      ]}
    >
      <View style={styles.iconSlot}>{loading ? <ActivityIndicator color={colors.textPrimary} /> : icon}</View>
      <AppText variant="button" style={styles.buttonLabel}>
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
}: SocialAuthButtonsProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <AppText variant="caption" style={styles.dividerText}>
          или
        </AppText>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.buttonsColumn}>
        <SocialButton
          label={getGoogleLabel(mode)}
          icon={<GoogleIcon size={22} />}
          onPress={onGooglePress}
          disabled={disabled}
          loading={loadingProvider === 'google'}
          accessibilityLabel={getGoogleLabel(mode)}
        />

        <SocialButton
          label={getAppleLabel(mode)}
          icon={<AppleIcon size={22} color={colors.textPrimary} />}
          onPress={onApplePress}
          disabled={disabled}
          loading={loadingProvider === 'apple'}
          accessibilityLabel={getAppleLabel(mode)}
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
    marginTop: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    textTransform: 'lowercase',
  },
  buttonsColumn: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    ...createShadow('sm'),
  },
  buttonPressed: {
    backgroundColor: colors.background,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  iconSlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
  },
});
