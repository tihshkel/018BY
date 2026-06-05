import type { TextLineSlot } from '@/utils/textLineSlots';
import {
  distributeTextWithinContinuationGroup,
  getFirstLineInputValue,
  getTemplateLineTextTop,
  getTemplateLineTypography,
  mergeFirstLineEdit,
  truncateTextToSlotWidth,
} from '@/utils/templateLineText';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
  lineGuideId?: string;
  textAlign?: TextAlign;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onSelectionChange?: (event: { nativeEvent: { selection: { start: number; end: number } } }) => void;
  selection?: { start: number; end: number };
  inputRef?: React.RefObject<TextInput | null>;
  autoFocus?: boolean;
};

/**
 * Редактор строк макета: TextInput только на первой строке группы, Text на продолжениях.
 * В TextInput — только первая строка (iOS иначе сжимает длинный value в одну линию).
 */
export function TemplateLineEditor({
  slot,
  groupSlots,
  allSlots,
  value,
  color,
  fontFamily,
  fontSize,
  lineGuideId,
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

  const slotsToRender = groupSlots.length > 0 ? groupSlots : [slot];
  const startSlot = slotsToRender[0] ?? slot;
  const startSlotIndex = startSlot.index;

  const segmentBySlotIndex = useMemo(() => {
    const { segments } = distributeTextWithinContinuationGroup({
      text: value,
      startSlotIndex,
      slots: allSlots,
      fontSize,
      lineGuideId,
    });
    const map = new Map<number, string>();
    for (const segment of segments) {
      map.set(
        segment.slotIndex,
        truncateTextToSlotWidth(segment.content, allSlots[segment.slotIndex]!, fontSize, lineGuideId)
      );
    }
    return map;
  }, [allSlots, fontSize, lineGuideId, startSlotIndex, value]);

  const inputValue = useMemo(
    () =>
      getFirstLineInputValue({
        text: value,
        startSlotIndex,
        slots: allSlots,
        fontSize,
        lineGuideId,
      }),
    [allSlots, fontSize, lineGuideId, startSlotIndex, value]
  );

  const handleInputChange = useCallback(
    (newText: string) => {
      onChangeText(
        mergeFirstLineEdit({
          newFirstLine: newText,
          previousText: value,
          startSlotIndex,
          slots: allSlots,
          fontSize,
          lineGuideId,
        })
      );
    },
    [allSlots, fontSize, lineGuideId, onChangeText, startSlotIndex, value]
  );

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [autoFocus, inputRef, startSlotIndex]);

  return (
    <>
      {slotsToRender.map((lineSlot) => {
        const textTop = getTemplateLineTextTop(lineSlot, fontSize, lineGuideId);
        const lineTypography = getTemplateLineTypography(
          fontSize,
          lineSlot.lineHeight,
          lineSlot.inputKind,
          lineGuideId
        );
        const lineText = segmentBySlotIndex.get(lineSlot.index) ?? '';
        const isInputSlot = lineSlot.index === startSlotIndex;

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
            {isInputSlot ? (
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  {
                    color,
                    fontSize: lineTypography.fontSize,
                    fontFamily: fontFamilyStyle,
                    lineHeight: lineTypography.lineHeight,
                    height: lineTypography.inputHeight,
                    width: lineSlot.width,
                    textAlign,
                  },
                ]}
                value={inputValue}
                onChangeText={handleInputChange}
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
                {...(Platform.OS === 'ios' ? { paddingTop: 0, paddingBottom: 0 } : {})}
                {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
              />
            ) : (
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
                ellipsizeMode="clip"
              >
                {lineText}
              </Text>
            )}
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
  },
});
