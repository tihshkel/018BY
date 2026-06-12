import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/design-tokens';
import type { PageStatus } from '@/types/album-page-schema';

type PageStatusIndicatorProps = {
  status: PageStatus;
};

export function PageStatusIndicator({ status }: PageStatusIndicatorProps) {
  if (status === 'filled') {
    return (
      <View style={[styles.circle, styles.filledCircle]}>
        <Ionicons name="checkmark" size={20} color={colors.white} />
      </View>
    );
  }

  if (status === 'draft') {
    return <View style={[styles.circle, styles.draftCircle]} />;
  }

  return <View style={[styles.circle, styles.emptyCircle]} />;
}

const styles = StyleSheet.create({
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledCircle: {
    backgroundColor: colors.statusFilled,
  },
  draftCircle: {
    backgroundColor: colors.statusDraftCircle,
  },
  emptyCircle: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
});
