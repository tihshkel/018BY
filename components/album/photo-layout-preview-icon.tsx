import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/constants/design-tokens';

type LayoutPreviewIconProps = {
  variantId: string;
  slots: number;
  selected?: boolean;
};

function slotStyle(selected?: boolean) {
  return [
    styles.slot,
    { backgroundColor: selected ? colors.primary : colors.border },
  ];
}

export function LayoutPreviewIcon({ variantId, slots, selected }: LayoutPreviewIconProps) {
  if (variantId === 'three_hero' || (slots === 3 && variantId.includes('three'))) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.row, { flex: 1.2 }]}>
          <View style={[slotStyle(selected), styles.flex]} />
        </View>
        <View style={[styles.row, { flex: 1 }]}>
          <View style={[slotStyle(selected), styles.flex]} />
          <View style={styles.gap} />
          <View style={[slotStyle(selected), styles.flex]} />
        </View>
      </View>
    );
  }

  if (
    variantId === 'four_grid' ||
    variantId === 'four_vertical' ||
    slots === 4
  ) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.row, { flex: 1 }]}>
          <View style={[slotStyle(selected), styles.flex]} />
          <View style={styles.gap} />
          <View style={[slotStyle(selected), styles.flex]} />
        </View>
        <View style={styles.gap} />
        <View style={[styles.row, { flex: 1 }]}>
          <View style={[slotStyle(selected), styles.flex]} />
          <View style={styles.gap} />
          <View style={[slotStyle(selected), styles.flex]} />
        </View>
      </View>
    );
  }

  if (variantId === 'two_vertical' || variantId.includes('vertical_separate')) {
    return (
      <View style={[styles.wrap, styles.row]}>
        <View style={[slotStyle(selected), styles.flex]} />
        <View style={styles.gap} />
        <View style={[slotStyle(selected), styles.flex]} />
      </View>
    );
  }

  if (slots === 2) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.row, { flex: 1 }]}>
          <View style={[slotStyle(selected), styles.flex]} />
        </View>
        <View style={styles.gap} />
        <View style={[styles.row, { flex: 1 }]}>
          <View style={[slotStyle(selected), styles.flex]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[slotStyle(selected), styles.flex]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 36,
    height: 28,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  flex: {
    flex: 1,
    borderRadius: 2,
  },
  gap: {
    width: 3,
    height: 3,
  },
  slot: {
    minHeight: 4,
    minWidth: 4,
  },
});
