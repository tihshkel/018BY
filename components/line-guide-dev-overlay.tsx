import { isLineSlotDebugEnabled } from '@/constants/line-slot-debug';
import { buildLineSlotsContext, type GetLineSlotsParams } from '@/utils/textLineSlots';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

type LineGuideDevOverlayProps = GetLineSlotsParams;

/** Подсветка зон строк (совпадает с hit-test). Только EXPO_PUBLIC_SHOW_LINE_SLOT_DEBUG=1 */
export function LineGuideDevOverlay(props: LineGuideDevOverlayProps) {
  if (!isLineSlotDebugEnabled()) return null;

  const { slots } = useMemo(() => buildLineSlotsContext(props), [
    props.lineGuideId,
    props.page,
    props.viewportWidth,
    props.viewportHeight,
    props.sourceWidth,
    props.sourceHeight,
  ]);

  if (slots.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {slots.map((slot) => (
        <View
          key={`line-${slot.index}`}
          style={[
            styles.slotRect,
            {
              top: slot.y,
              left: slot.x,
              width: slot.width,
              height: slot.lineHeight,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  slotRect: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 120, 0.55)',
    backgroundColor: 'rgba(255, 0, 120, 0.08)',
  },
});
