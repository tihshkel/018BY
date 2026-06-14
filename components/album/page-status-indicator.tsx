import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/design-tokens';
import type { PageStatus } from '@/types/album-page-schema';

type PageStatusIndicatorProps = {
  status: PageStatus;
  size?: number;
};

export function PageStatusIndicator({ status, size = 36 }: PageStatusIndicatorProps) {
  const radius = size / 2;
  const iconSize = Math.round(size * 0.55);

  if (status === 'filled') {
    return (
      <View style={[styles.circle, { width: size, height: size, borderRadius: radius, backgroundColor: colors.statusFilled }]}>
        <Ionicons name="checkmark" size={iconSize} color={colors.white} />
      </View>
    );
  }

  if (status === 'continue') {
    return (
      <View style={[styles.circle, { width: size, height: size, borderRadius: radius, backgroundColor: colors.statusContinue }]}>
        <Ionicons name="pencil" size={iconSize - 2} color={colors.white} />
      </View>
    );
  }

  if (status === 'draft') {
    return (
      <View style={[styles.circle, { width: size, height: size, borderRadius: radius, backgroundColor: colors.statusDraft }]}>
        <Ionicons name="document-text-outline" size={iconSize - 2} color={colors.white} />
      </View>
    );
  }

  if (status === 'locked') {
    return (
      <View style={[styles.circle, { width: size, height: size, borderRadius: radius, backgroundColor: colors.statusLocked }]}>
        <Ionicons name="lock-closed" size={iconSize - 4} color={colors.white} />
      </View>
    );
  }

  if (status === 'excluded') {
    return (
      <View style={[styles.circle, { width: size, height: size, borderRadius: radius, backgroundColor: colors.statusExcluded }]}>
        <Ionicons name="close" size={iconSize} color={colors.white} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.circle,
        styles.emptyCircle,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      <Ionicons name="add" size={iconSize} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
});
