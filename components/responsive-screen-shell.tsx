import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { spacing } from '@/constants/design-tokens';
import {
  getTabletContentShell,
  getTabletSectionWrap,
  ONBOARDING_CONTENT_MAX_WIDTH,
  useResponsiveLayout,
} from '@/utils/responsive';

type ResponsiveScreenShellProps = {
  children: React.ReactNode;
  maxContentWidth?: number;
  style?: StyleProp<ViewStyle>;
};

export function ResponsiveScreenShell({
  children,
  maxContentWidth = ONBOARDING_CONTENT_MAX_WIDTH,
  style,
}: ResponsiveScreenShellProps) {
  const layout = useResponsiveLayout(maxContentWidth);
  const shellStyle =
    getTabletContentShell(layout) ??
    getTabletSectionWrap(layout, { phonePadding: spacing.lg, tabletPadding: 0 });

  return <View style={[{ flex: 1 }, shellStyle, style]}>{children}</View>;
}
