import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/design-tokens';

export interface AppHeaderProps {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppHeader({
  title,
  onBack,
  showBack = true,
  right,
  style,
}: AppHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.center}>
        {title ? (
          <AppText variant="titleSm" numberOfLines={1} style={styles.title}>
            {title}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    width: 'auto',
    minWidth: 44,
    maxWidth: 176,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
});
