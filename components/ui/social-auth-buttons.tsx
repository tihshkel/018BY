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
import { colors, spacing, surfaces } from '@/constants/design-tokens';
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
  layout?: 'column' | 'row';
};

function getGoogleLabel(mode: SocialAuthMode): string {
  return mode === 'register' ? 'Продолжить с Google' : 'Войти с Google';
}

function getAppleLabel(mode: SocialAuthMode): string {
  return mode === 'register' ? 'Продолжить с Apple' : 'Войти с Apple';
}

type SocialButtonProps = {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel: string;
  emphasis?: 'default' | 'apple';
  compact?: boolean;
};

function SocialButton({
  label,
  icon,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel,
  emphasis = 'default',
  compact = false,
}: SocialButtonProps) {
  const isDisabled = disabled || loading;
  const isApple = emphasis === 'apple';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        isApple && styles.buttonApple,
        pressed && !isDisabled && (isApple ? styles.buttonApplePressed : styles.buttonPressed),
        isDisabled && styles.buttonDisabled,
      ]}
    >
      <View style={styles.iconSlot}>
        {loading ? <ActivityIndicator color={isApple ? colors.white : colors.textPrimary} /> : icon}
      </View>
      <AppText variant="button" style={[styles.buttonLabel, isApple && styles.buttonLabelApple]}>
        {label}
      </AppText>
      {!compact ? <View style={styles.iconSlot} /> : null}
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
  layout = 'column',
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

      <View style={[styles.buttonsColumn, layout === 'row' && styles.buttonsRow]}>
        <SocialButton
          label={layout === 'row' ? 'Google' : getGoogleLabel(mode)}
          compact={layout === 'row'}
          icon={<GoogleIcon size={20} />}
          onPress={onGooglePress}
          disabled={disabled}
          loading={loadingProvider === 'google'}
          accessibilityLabel={getGoogleLabel(mode)}
        />
        <SocialButton
          label={layout === 'row' ? 'Apple' : getAppleLabel(mode)}
          compact={layout === 'row'}
          icon={<AppleIcon size={20} color={colors.white} />}
          onPress={onApplePress}
          disabled={disabled}
          loading={loadingProvider === 'apple'}
          accessibilityLabel={getAppleLabel(mode)}
          emphasis="apple"
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
    marginBottom: 8,
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
  buttonsRow: { flexDirection: 'row', gap: 10 },
  buttonCompact: { flex: 1, minHeight: 52, paddingHorizontal: 12, gap: 6 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  buttonApple: {
    backgroundColor: '#302B30',
    borderColor: '#302B30',
  },
  buttonPressed: {
    backgroundColor: surfaces.muted,
  },
  buttonApplePressed: {
    backgroundColor: '#514650',
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
    color: colors.white,
  },
});
