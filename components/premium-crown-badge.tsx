import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

const CROWN_GOLD = '#D4AF37';

type PremiumCrownBadgeProps = {
  size?: number;
  style?: ViewStyle;
};

export function PremiumCrownBadge({ size = 22, style }: PremiumCrownBadgeProps) {
  return (
    <View style={[styles.badge, style]} accessibilityLabel="Премиум">
      <Ionicons name="star" size={size} color={CROWN_GOLD} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
  },
});
