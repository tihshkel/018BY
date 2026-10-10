import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageProps } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppScreen, AppText } from '@/components/ui';
import { colors } from '@/constants/design-tokens';
import { AuthModeSwitch, type AuthMode } from '@/components/auth/auth-mode-switch';

type AuthScreenLayoutProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  mode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  modeSwitchDisabled?: boolean;
  illustration?: ImageProps['source'];
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export const authInputStyle = { borderRadius: 14, backgroundColor: '#F8F6F7', minHeight: 52 };
export const authSubmitStyle = { borderRadius: 14, minHeight: 52, shadowOpacity: 0, elevation: 0 };

export function AuthScreenLayout({
  title,
  subtitle,
  showBack = false,
  onBack,
  mode,
  onModeChange,
  modeSwitchDisabled,
  illustration,
  children,
  footer,
  contentStyle,
}: AuthScreenLayoutProps) {
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const availableHeight = height - insets.top - Math.max(24, insets.bottom + 24);
  const illustrationHeight = Math.max(64, Math.min(180, availableHeight - (mode ? 560 : 520) * Math.max(1, fontScale)));
  const compact = availableHeight < 700 || fontScale > 1.15;
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return (
    <AppScreen scroll keyboardAware style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.wrap, compact && styles.wrapCompact]}>
        {showBack ? (
          <View style={styles.header}>
            <Pressable
              onPress={onBack ?? (() => router.back())}
              style={styles.back}
              accessibilityRole="button"
              accessibilityLabel="Назад"
            >
              <Ionicons name="arrow-back" size={21} color={colors.textPrimary} />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.hero}>
          {illustration && !keyboardVisible ? (
            <Image
              source={illustration}
              contentFit="contain"
              transition={0}
              style={[styles.illustration, { height: illustrationHeight }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
          <AppText accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
          {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
        </View>
        <View>
          {mode && onModeChange ? (
            <AuthModeSwitch value={mode} onChange={onModeChange} disabled={modeSwitchDisabled} />
          ) : null}
          <View style={[styles.content, contentStyle]}>{children}</View>
        </View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFFFFF' },
  scrollContent: { justifyContent: 'center' },
  wrap: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  wrapCompact: { paddingVertical: 12 },
  illustration: { width: 320, maxWidth: '100%', alignSelf: 'center', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.white,
  },
  hero: { paddingBottom: 16 },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.8, fontWeight: '700', color: '#40343B' },
  subtitle: { fontSize: 15, lineHeight: 23, color: '#887780', maxWidth: 360 },
  content: { gap: 12 },
  footer: { paddingTop: 18 },
});
