import type { TextLineSlot } from '@/utils/textLineSlots';
import {
  distributeTextWithinContinuationGroup,
  getActiveEditSlotIndex,
  getTemplateLineTextTop,
  getTemplateLineTypography,
  getWishSlotInputKind,
  mergeActiveLineEdit,
  truncateTextToSlotWidth,
} from '@/utils/templateLineText';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { InputAccessoryView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

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
  inputAccessoryViewID?: string;
  keyboardToolbar?: React.ReactNode;
};

/**
 * Редактор строк макета: TextInput на активной строке (последняя с текстом), остальное — Text.
 * В TextInput — только текущая строка (iOS иначе сжимает длинный value в одну линию).
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
  inputAccessoryViewID,
  keyboardToolbar,
}: TemplateLineEditorProps) {
  const localInputRef = useRef<TextInput>(null);
  const inputRef = externalInputRef ?? localInputRef;
  const fontFamilyStyle = fontFamily !== 'default' ? fontFamily : undefined;

  const slotsToRender = groupSlots.length > 0 ? groupSlots : [slot];
  const startSlot = slotsToRender[0] ?? slot;
  const startSlotIndex = startSlot.index;

  const { segments, segmentBySlotIndex } = useMemo(() => {
    const distributed = distributeTextWithinContinuationGroup({
      text: value,
      startSlotIndex,
      slots: allSlots,
      fontSize,
      lineGuideId,
    });
    const map = new Map<number, string>();
    for (const segment of distributed.segments) {
      map.set(
        segment.slotIndex,
        truncateTextToSlotWidth(segment.content, allSlots[segment.slotIndex]!, fontSize, lineGuideId)
      );
    }
    return { segments: distributed.segments, segmentBySlotIndex: map };
  }, [allSlots, fontSize, lineGuideId, startSlotIndex, value]);

  const activeInputSlotIndex = useMemo(
    () => getActiveEditSlotIndex(segments, startSlotIndex),
    [segments, startSlotIndex]
  );

  const inputValue = segmentBySlotIndex.get(activeInputSlotIndex) ?? '';

  const handleInputChange = useCallback(
    (newText: string) => {
      onChangeText(
        mergeActiveLineEdit({
          newLineText: newText,
          previousText: value,
          editSlotIndex: activeInputSlotIndex,
          startSlotIndex,
          slots: allSlots,
          fontSize,
          lineGuideId,
        })
      );
    },
    [activeInputSlotIndex, allSlots, fontSize, lineGuideId, onChangeText, startSlotIndex, value]
  );

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [autoFocus, inputRef, activeInputSlotIndex]);

  return (
    <>
      {Platform.OS === 'ios' && inputAccessoryViewID && keyboardToolbar ? (
        <InputAccessoryView nativeID={inputAccessoryViewID}>
          {keyboardToolbar}
        </InputAccessoryView>
      ) : null}
      {slotsToRender.map((lineSlot) => {
        const textTop = getTemplateLineTextTop(lineSlot, fontSize, lineGuideId);
        const lineTypography = getTemplateLineTypography(
          fontSize,
          lineSlot.lineHeight,
          getWishSlotInputKind(lineSlot, lineGuideId),
          lineGuideId
        );
        const lineText = segmentBySlotIndex.get(lineSlot.index) ?? '';
        const isInputSlot = lineSlot.index === activeInputSlotIndex;
        const inputTopInset = Math.max(0, lineTypography.inputHeight - lineTypography.lineHeight);

        return (
          <View
            key={lineSlot.index}
            style={[
              styles.host,
              {
                left: lineSlot.x,
                top: textTop - inputTopInset,
                width: lineSlot.width,
                height: lineTypography.inputHeight,
              },
            ]}
            pointerEvents={isInputSlot ? 'box-none' : 'none'}
          >
            {isInputSlot ? (
              <TextInput
                key={activeInputSlotIndex}
                ref={inputRef}
                style={[
                  styles.input,
                  {
                    color,
                    fontSize: lineTypography.fontSize,
                    fontFamily: fontFamilyStyle,
                    lineHeight: lineTypography.lineHeight,
                    height: lineTypography.lineHeight,
                    top: inputTopInset,
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
                {...(Platform.OS === 'ios' && inputAccessoryViewID
                  ? { inputAccessoryViewID }
                  : {})}
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
                    top: inputTopInset,
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
    overflow: 'visible',
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
