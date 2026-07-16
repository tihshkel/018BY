import { Image } from 'expo-image';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppHeader, AppScreen, AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';
import {
  AUTH_CONTENT_MAX_WIDTH,
  getTabletContentShell,
  getTabletSectionWrap,
  useResponsiveLayout,
} from '@/utils/responsive';

type AuthScreenLayoutProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export function AuthScreenLayout({
  title,
  subtitle,
  showBack = false,
  onBack,
  children,
  footer,
  contentStyle,
}: AuthScreenLayoutProps) {
  const layout = useResponsiveLayout(AUTH_CONTENT_MAX_WIDTH);
  const shellStyle = getTabletContentShell(layout) ?? getTabletSectionWrap(layout, spacing.md);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [opacity]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AppScreen scroll keyboardAware style={styles.screen} edges={['top', 'bottom']}>
      <Animated.View style={[styles.wrap, shellStyle, fadeStyle]}>
        <AppHeader showBack={showBack} onBack={onBack} style={styles.header} />

        <View style={styles.brandRow}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="018BY"
          />
          <AppText variant="caption" style={styles.brandMark}>
            018BY
          </AppText>
        </View>

        <View style={styles.hero}>
          <AppText variant="title" style={styles.title}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="bodySm" style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        <View style={[styles.content, contentStyle]}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </AppScreen>
  );
}

type AuthFooterLinkProps = {
  prefix: string;
  actionLabel: string;
  onPress: () => void;
};

export function AuthFooterLink({ prefix, actionLabel, onPress }: AuthFooterLinkProps) {
  return (
    <View style={styles.footerRow}>
      <AppText variant="bodySm" style={styles.footerPrefix}>
        {prefix}
      </AppText>
      <Pressable onPress={onPress} hitSlop={10}>
        <AppText variant="bodySm" style={styles.footerAction}>
          {actionLabel}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.white,
  },
  wrap: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  header: {
    paddingHorizontal: 0,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  brandMark: {
    color: colors.textPrimary,
    fontWeight: '600',
    letterSpacing: 1.4,
    fontSize: 11,
  },
  hero: {
    gap: 4,
    marginBottom: spacing.lg,
  },
  title: {
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  content: {
    gap: spacing.md,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  footerPrefix: {
    color: colors.textSecondary,
  },
  footerAction: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
