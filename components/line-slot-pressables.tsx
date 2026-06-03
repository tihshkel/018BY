import {
  buildLineSlotsContext,
  hitTestLineSlot,
  type GetLineSlotsParams,
} from '@/utils/textLineSlots';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type LineSlotPressablesProps = {
  slotParams: GetLineSlotsParams;
  enabled: boolean;
  onSlotPress: (x: number, y: number) => void;
};

/**
 * Невидимые зоны тапа по строкам шаблона (поверх PNG, под аннотациями).
 */
export function LineSlotPressables({
  slotParams,
  enabled,
  onSlotPress,
}: LineSlotPressablesProps) {
  const { slots } = useMemo(
    () => buildLineSlotsContext(slotParams),
    [
      slotParams.lineGuideId,
      slotParams.page,
      slotParams.viewportWidth,
      slotParams.viewportHeight,
      slotParams.sourceWidth,
      slotParams.sourceHeight,
    ]
  );

  if (!enabled || slots.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {slots.map((slot) => (
        <Pressable
          key={`slot-hit-${slot.index}`}
          style={[
            styles.hitArea,
            {
              left: slot.x,
              top: slot.y,
              width: slot.width,
              height: slot.lineHeight,
            },
          ]}
          onPress={() => onSlotPress(slot.x + slot.width / 2, slot.y + slot.lineHeight / 2)}
        />
      ))}
    </View>
  );
}

export function isPointOnLineSlot(
  x: number,
  y: number,
  slotParams: GetLineSlotsParams
): boolean {
  const { slots } = buildLineSlotsContext(slotParams);
  return hitTestLineSlot({ x, y, slots }) !== null;
}

const styles = StyleSheet.create({
  hitArea: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
});
