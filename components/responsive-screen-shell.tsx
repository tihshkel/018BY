import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

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
    getTabletSectionWrap(layout, { phonePadding: 0, tabletPadding: 0 });

  return <View style={[shellStyle, styles.root, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
