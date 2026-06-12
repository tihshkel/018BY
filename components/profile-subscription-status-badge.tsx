import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PREMIUM_GOLD = '#D4AF37';
const PREMIUM_GOLD_DARK = '#9A7B0A';

type ProfileSubscriptionStatusBadgeProps = {
  isPremium: boolean;
  isLoading?: boolean;
  onPress?: () => void;
};

export function ProfileSubscriptionStatusBadge({
  isPremium,
  isLoading = false,
  onPress,
}: ProfileSubscriptionStatusBadgeProps) {
  const content = isLoading ? (
    <ActivityIndicator size="small" color={colors.textSecondary} />
  ) : isPremium ? (
    <>
      <MaterialCommunityIcons name="crown" size={14} color={PREMIUM_GOLD_DARK} />
      <Text style={styles.premiumText}>Премиум</Text>
    </>
  ) : (
    <Text style={styles.standardText}>Стандарт</Text>
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
        accessibilityRole="button"
        accessibilityLabel={isPremium ? 'Статус Премиум' : 'Статус Стандарт'}
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
    borderWidth: 1.5,
  },
  badgeStandard: {
    backgroundColor: colors.background,
    borderColor: '#E8DDD4',
  },
  badgePremium: {
    backgroundColor: '#FFF8DC',
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
