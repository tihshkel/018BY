import { buildLineSlotsContext, hitTestLineSlot, type GetLineSlotsParams } from '@/utils/textLineSlots';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type LineSlotPressablesProps = {
  slotParams: GetLineSlotsParams;
  enabled: boolean;
  onSlotPress: (x: number, y: number) => void;
};

/**
 * Невидимые зоны тапа по строкам шаблона (поверх PNG, под аннотациями).
 * Для многострочных групп — одна общая зона на весь блок.
 */
export function LineSlotPressables({
  slotParams,
  enabled,
  onSlotPress,
}: LineSlotPressablesProps) {
  const slots = useMemo(() => {
    const { slots: builtSlots } = buildLineSlotsContext(slotParams);
    return builtSlots;
  }, [
    slotParams.lineGuideId,
    slotParams.page,
    slotParams.viewportWidth,
    slotParams.viewportHeight,
    slotParams.sourceWidth,
    slotParams.sourceHeight,
  ]);

  if (!enabled || slots.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {slots.map((slot) => {
        const minHitPx = 28;
        const expandHit = slot.lineHeight < 24;
        const hitHeight = expandHit ? Math.max(slot.lineHeight, minHitPx) : slot.lineHeight;
        const hitTop = expandHit
          ? slot.y - Math.max(0, (hitHeight - slot.lineHeight) / 2)
          : slot.y;

        return (
          <Pressable
            key={`slot-hit-${slot.index}`}
            style={[
              styles.hitArea,
              {
                left: slot.x,
                top: hitTop,
                width: slot.width,
                height: hitHeight,
              },
            ]}
            onPress={(event) => {
              const { locationX, locationY } = event.nativeEvent;
              onSlotPress(slot.x + locationX, hitTop + locationY);
            }}
          />
        );
      })}
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
