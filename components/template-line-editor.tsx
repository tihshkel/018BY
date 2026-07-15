import type { TextLineSlot } from '@/utils/textLineSlots';
import {
  distributeTextWithinFieldLines,
  getActiveEditSlotIndex,
  getTemplateBlockTextInsets,
  getTemplateLineReadOnlyTextLayout,
  mergeActiveLineEdit,
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
  fontId?: string;
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
 * Редактор строк макета: TextInput на активной строке (последняя с текстом), остальное — Text.
 * В TextInput — только текущая строка (iOS иначе сжимает длинный value в одну линию).
 */
export const TemplateLineEditor = React.memo(function TemplateLineEditor({
  slot,
  groupSlots,
  allSlots,
  value,
  color,
  fontFamily,
  fontId,
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
  const startSlotIndex = slot.index;

  const { segments, segmentBySlotIndex } = useMemo(() => {
    const distributed = distributeTextWithinFieldLines({
      text: value,
      startSlotIndex,
      lineCount: slotsToRender.length,
      slots: allSlots,
      fontSize,
      lineGuideId,
      fontId,
    });
    const map = new Map<number, string>();
    for (const segment of distributed.segments) {
      map.set(segment.slotIndex, segment.content);
    }
    return { segments: distributed.segments, segmentBySlotIndex: map };
  }, [allSlots, fontId, fontSize, lineGuideId, startSlotIndex, value]);

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
          fontId,
          lineCount: slotsToRender.length,
        })
      );
    },
    [
      activeInputSlotIndex,
      allSlots,
      fontId,
      fontSize,
      lineGuideId,
      onChangeText,
      slotsToRender.length,
      startSlotIndex,
      value,
    ]
  );

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [autoFocus, inputRef, activeInputSlotIndex]);

  return (
    <>
      {slotsToRender.map((lineSlot) => {
        const lineText = segmentBySlotIndex.get(lineSlot.index) ?? '';
        const readOnlyLayout = getTemplateLineReadOnlyTextLayout({
          slot: lineSlot,
          fontSize,
          lineGuideId,
          fontId,
          allSlots,
          fieldStartIndex: startSlotIndex,
          textContent: lineText,
        });
        const isInputSlot = lineSlot.index === activeInputSlotIndex;
        const textInsets = getTemplateBlockTextInsets(lineSlot, lineGuideId);

        return (
          <View
            key={lineSlot.index}
            style={[
              styles.host,
              {
                left: lineSlot.x,
                top: readOnlyLayout.containerTop,
                width: lineSlot.width,
                height: readOnlyLayout.containerHeight,
                overflow: readOnlyLayout.overflow,
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
                    fontSize: readOnlyLayout.fontSize,
                    fontFamily: fontFamilyStyle,
                    lineHeight: readOnlyLayout.textLineHeight,
                    height: Math.min(
                      readOnlyLayout.containerHeight,
                      Math.max(
                        readOnlyLayout.textLineHeight,
                        readOnlyLayout.containerHeight - readOnlyLayout.textTop,
                      ),
                    ),
                    top: readOnlyLayout.textTop,
                    left: textInsets.left,
                    width: textInsets.width,
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
                    fontSize: readOnlyLayout.fontSize,
                    fontFamily: fontFamilyStyle,
                    lineHeight: readOnlyLayout.textLineHeight,
                    top: readOnlyLayout.textTop,
                    left: textInsets.left,
                    width: textInsets.width,
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
});

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    zIndex: 100000,
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
