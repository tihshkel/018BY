import {
  buildLineSlotsContext,
  hitTestLineSlot,
  resolveContentRectForPage,
  type GetLineSlotsParams,
  type TextLineSlot,
} from '@/utils/textLineSlots';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type LineSlotPressablesProps = {
  slotParams: GetLineSlotsParams;
  enabled: boolean;
  onSlotPress: (slotIndex: number) => void;
};

function getSlotPressableRect(
  slot: TextLineSlot,
  slotParams: GetLineSlotsParams,
  hitBounds: { top: number; height: number }
): { left: number; top: number; width: number; height: number } {
  let left = slot.x;
  let width = slot.width;

  if (
    slotParams.lineGuideId === 'diary_interior_purple' &&
    !slot.hasLabel &&
    slot.normY != null &&
    slot.normY < 0.42
  ) {
    const rect = resolveContentRectForPage(slotParams);
    const minLeft = rect.offsetX + rect.width * 0.12;
    if (left > minLeft + 2) {
      width += left - minLeft;
      left = minLeft;
    }
  }

  return { left, top: hitBounds.top, width, height: hitBounds.height };
}

function getSlotHitBounds(
  slot: TextLineSlot,
  slots: TextLineSlot[],
  minHitPx = 28
): { top: number; height: number } {
  if (slot.lineHeight >= minHitPx) {
    return { top: slot.y, height: slot.lineHeight };
  }

  const prev = slots[slot.index - 1];
  const next = slots[slot.index + 1];
  const slotBottom = slot.y + slot.lineHeight;

  const gapAbove = prev ? Math.max(0, slot.y - (prev.y + prev.lineHeight)) : Infinity;
  const gapBelow = next ? Math.max(0, next.y - slotBottom) : Infinity;

  const needExpand = minHitPx - slot.lineHeight;
  const expandUp = Math.min(needExpand / 2, gapAbove / 2);
  const expandDown = Math.min(needExpand - expandUp, gapBelow / 2);

  return {
    top: slot.y - expandUp,
    height: slot.lineHeight + expandUp + expandDown,
  };
}

/**
 * Невидимые зоны тапа по строкам шаблона (поверх PNG, под аннотациями).
 * Каждая строка — отдельная зона; индекс слота передаётся напрямую (без повторного hit-test).
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
        const hitBounds = getSlotHitBounds(slot, slots);
        const pressable = getSlotPressableRect(slot, slotParams, hitBounds);

        return (
          <Pressable
            key={`slot-hit-${slot.index}`}
            style={[
              styles.hitArea,
              {
                left: pressable.left,
                top: pressable.top,
                width: pressable.width,
                height: pressable.height,
              },
            ]}
            onPress={() => onSlotPress(slot.index)}
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
  return hitTestLineSlot({ x, y, slots, slotParams }) !== null;
}

const styles = StyleSheet.create({
  hitArea: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
});
