import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppHeader, AppScreen, AppText } from '@/components/ui';
import { colors, spacing, surfaces } from '@/constants/design-tokens';
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
    opacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.ease) });
  }, [opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <AppScreen scroll keyboardAware style={styles.screen} edges={['top', 'bottom']}>
      <Animated.View style={[styles.wrap, shellStyle, fadeStyle]}>
        <AppHeader showBack={showBack} onBack={onBack} style={styles.header} />

        <View style={styles.hero}>
          <AppText variant="display" style={styles.title}>
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
      <Pressable onPress={onPress} hitSlop={8}>
        <AppText variant="bodySm" style={styles.footerAction}>
          {actionLabel}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: surfaces.muted,
  },
  wrap: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: 0,
  },
  hero: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  title: {
    letterSpacing: -0.3,
  },
  subtitle: {
    maxWidth: 320,
  },
  content: {
    gap: spacing.md,
  },
  footer: {
    marginTop: spacing.lg,
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
    color: colors.primary,
    fontWeight: '600',
  },
});
