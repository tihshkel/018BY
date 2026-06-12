import React from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, sansFont } from '@/constants/design-tokens';
import type { PageStatus } from '@/types/album-page-schema';
import { getPageStatusLabel } from '@/utils/pageStatus';

const STATUS_TEXT_COLORS: Record<PageStatus, string> = {
  empty: colors.statusEmpty,
  draft: colors.statusDraft,
  filled: colors.statusFilled,
  locked: colors.statusEmpty,
};

type PageStatusBadgeProps = {
  status: PageStatus;
};

export function PageStatusBadge({ status }: PageStatusBadgeProps) {
  return (
    <AppText variant="caption" style={[styles.label, { color: STATUS_TEXT_COLORS[status] }]}>
      {getPageStatusLabel(status)}
    </AppText>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: sansFont('regular'),
    fontSize: 14,
    lineHeight: 18,
  },
});
