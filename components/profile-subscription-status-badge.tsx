import { colors } from '@/constants/design-tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PREMIUM_GOLD = '#D4E1D8';
const PREMIUM_GOLD_DARK = '#56735F';

type ProfileSubscriptionStatusBadgeProps = {
  isPremium: boolean;
  isLoading?: boolean;
  isIapEnabled?: boolean;
  onPress?: () => void;
};

export function ProfileSubscriptionStatusBadge({
  isPremium,
  isLoading = false,
  isIapEnabled = true,
  onPress,
}: ProfileSubscriptionStatusBadgeProps) {
  const content = isLoading ? (
    <ActivityIndicator size="small" color={colors.textSecondary} />
  ) : isPremium ? (
    <>
      <MaterialCommunityIcons name="check-decagram-outline" size={14} color={PREMIUM_GOLD_DARK} />
      <Text style={styles.premiumText}>{isIapEnabled ? 'Куплено' : 'Доступно'}</Text>
    </>
  ) : (
    <Text style={styles.standardText}>Не куплено</Text>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[
          styles.badge,
          isPremium ? styles.badgePremium : styles.badgeStandard,
          isLoading && styles.badgeLoading,
        ]}
        onPress={onPress}
        activeOpacity={0.75}
        testID="profile-subscription-badge-button"
        accessibilityRole="button"
        accessibilityLabel={
          !isIapEnabled
            ? 'Экспорт для печати доступен'
            : isPremium
              ? 'Экспорт для печати: куплено'
              : 'Экспорт для печати: не куплено'
        }
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        isPremium ? styles.badgePremium : styles.badgeStandard,
        isLoading && styles.badgeLoading,
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 108,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  badgeStandard: {
    backgroundColor: colors.background,
    borderColor: '#E8DDD4',
  },
  badgePremium: {
    backgroundColor: '#EFF5F0',
    borderColor: PREMIUM_GOLD,
  },
  badgeLoading: {
    minWidth: 36,
    paddingHorizontal: 12,
  },
  standardText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  premiumText: {
    fontSize: 14,
    fontWeight: '700',
    color: PREMIUM_GOLD_DARK,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
});
