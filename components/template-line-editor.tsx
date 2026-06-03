import type { TextLineSlot } from '@/utils/textLineSlots';
import {
  distributeTextWithinContinuationGroup,
  getTemplateLineTextTop,
  getTemplateLineTypography,
} from '@/utils/templateLineText';
import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

type TextAlign = 'left' | 'center' | 'right';

type TemplateLineEditorProps = {
  slot: TextLineSlot;
  groupSlots: TextLineSlot[];
  allSlots: TextLineSlot[];
  value: string;
  color: string;
  fontSize: number;
  fontFamily: string | undefined;
  textAlign?: TextAlign;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onSelectionChange?: (event: { nativeEvent: { selection: { start: number; end: number } } }) => void;
  selection?: { start: number; end: number };
  inputRef?: React.RefObject<TextInput | null>;
  autoFocus?: boolean;
};

/**
 * Inline-редактор строк макета: живой перенос по слотам continuationGroup.
 * На каждой линии — свой фрагмент; ввод через прозрачный TextInput на первой строке.
 */
export function TemplateLineEditor({
  slot,
  groupSlots,
  allSlots,
  value,
  color,
  fontSize,
  fontFamily,
  textAlign = 'left',
  onChangeText,
  onSubmit,
  onSelectionChange,
  selection,
  inputRef: externalInputRef,
  autoFocus = true,
}: TemplateLineEditorProps) {
  const localInputRef = useRef<TextInput>(null);
  const inputRef = externalInputRef ?? localInputRef;
  const fontFamilyStyle = fontFamily !== 'default' ? fontFamily : undefined;

  const segmentBySlotIndex = useMemo(() => {
    const { segments } = distributeTextWithinContinuationGroup({
      text: value,
      startSlotIndex: slot.index,
      slots: allSlots,
      fontSize,
    });
    const map = new Map<number, string>();
    for (const segment of segments) {
      map.set(segment.slotIndex, segment.content);
    }
    return map;
  }, [allSlots, fontSize, slot.index, value]);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [autoFocus, slot.index]);

  const slotsToRender = groupSlots.length > 0 ? groupSlots : [slot];
  const startSlot = slotsToRender[0] ?? slot;

  return (
    <>
      {slotsToRender.map((lineSlot) => {
        const textTop = getTemplateLineTextTop(lineSlot, fontSize);
        const lineTypography = getTemplateLineTypography(fontSize, lineSlot.lineHeight, lineSlot.inputKind);
        const lineText = segmentBySlotIndex.get(lineSlot.index) ?? '';
        const isInputSlot = lineSlot.index === startSlot.index;

        return (
          <View
            key={lineSlot.index}
            style={[
              styles.host,
              {
                left: lineSlot.x,
                top: textTop,
                width: lineSlot.width,
                height: lineTypography.inputHeight,
              },
            ]}
            pointerEvents={isInputSlot ? 'box-none' : 'none'}
          >
            <Text
              style={[
                styles.lineText,
                {
                  color,
                  fontSize: lineTypography.fontSize,
                  fontFamily: fontFamilyStyle,
                  lineHeight: lineTypography.lineHeight,
                  width: lineSlot.width,
                  textAlign,
                },
              ]}
              numberOfLines={1}
            >
              {lineText}
            </Text>
            {isInputSlot ? (
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  {
                    color: 'transparent',
                    fontSize: lineTypography.fontSize,
                    fontFamily: fontFamilyStyle,
                    lineHeight: lineTypography.lineHeight,
                    height: lineTypography.inputHeight,
                    width: lineSlot.width,
                    textAlign,
                  },
                ]}
                value={value}
                onChangeText={onChangeText}
                onSubmitEditing={onSubmit}
                onBlur={onSubmit}
                onSelectionChange={onSelectionChange}
                {...(selection ? { selection } : {})}
                multiline={false}
                scrollEnabled={false}
                autoFocus={autoFocus}
                autoCorrect={false}
                placeholder=""
                selectionColor={color}
                underlineColorAndroid="transparent"
                selectTextOnFocus={false}
                caretHidden={false}
                {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
              />
            ) : null}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    zIndex: 100000,
    overflow: 'hidden',
  },
  lineText: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 0,
    margin: 0,
    textAlign: 'left',
    includeFontPadding: false,
  },
  input: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    textAlign: 'left',
    textAlignVertical: 'top',
    ...(Platform.OS === 'ios' ? { paddingTop: 0, paddingBottom: 0 } : {}),
  },
});
