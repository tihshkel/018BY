import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing } from '@/constants/design-tokens';

type HomeActionRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  accent?: boolean;
  destructive?: boolean;
  showChevron?: boolean;
  showDivider?: boolean;
};

export function HomeActionRow({
  icon,
  title,
  subtitle,
  onPress,
  accent = false,
  destructive = false,
  showChevron = true,
  showDivider = true,
}: HomeActionRowProps) {
  const iconColor = destructive
    ? colors.error
    : accent
      ? colors.primary
      : colors.textSecondary;

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          !subtitle && styles.rowCompact,
          pressed && (destructive ? styles.rowPressedDestructive : styles.rowPressed),
        ]}
        accessibilityRole="button"
      >
        <View
          style={[
            styles.iconWrap,
            accent && styles.iconWrapAccent,
            destructive && styles.iconWrapDestructive,
          ]}
        >
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.copy}>
          <AppText
            variant="body"
            style={[styles.title, destructive && styles.titleDestructive]}
          >
            {title}
          </AppText>
          {subtitle ? <AppText variant="bodySm">{subtitle}</AppText> : null}
        </View>
        {showChevron ? (
          <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
        ) : null}
      </Pressable>
      {showDivider ? <View style={styles.divider} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    minHeight: 64,
  },
  rowCompact: {
    minHeight: 52,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: colors.primarySurface,
  },
  rowPressedDestructive: {
    backgroundColor: '#FFF5F5',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  iconWrapAccent: {
    backgroundColor: colors.primarySurface,
  },
  iconWrapDestructive: {
    backgroundColor: '#FFF5F5',
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontWeight: '600',
  },
  titleDestructive: {
    color: colors.error,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 40 + spacing.sm,
  },
});
