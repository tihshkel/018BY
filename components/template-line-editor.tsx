import type { TextLineSlot } from '@/utils/textLineSlots';
import {
  distributeTextWithinContinuationGroup,
  getActiveEditSlotIndex,
  getTemplateBlockTextInsets,
  getTemplateLineRowInsets,
  getTemplateLineTextTop,
  getTemplateLineTypography,
  getWishSlotInputKind,
  getSlotTemplateTextAlign,
  mergeActiveLineEdit,
  resolvePregnancyWeeklyFieldRowLayout,
  resolveTemplateLineRowLayout,
  resolveTemplateLineFontSize,
  resolveTemplateTextRenderBox,
  shouldClipPregnancyWeeklyFieldRow,
  truncateTextToSlotWidth,
} from '@/utils/templateLineText';
import { resolveMeasureTextWidth } from '@/utils/templateTextMeasure';
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

  const measureTextWidth = useMemo(
    () => resolveMeasureTextWidth(fontId),
    [fontId],
  );

  const { segments, segmentBySlotIndex } = useMemo(() => {
    const distributed = distributeTextWithinContinuationGroup({
      text: value,
      startSlotIndex,
      slots: allSlots,
      fontSize,
      lineGuideId,
      fontId,
      slotCount: slotsToRender.length,
      measureTextWidth,
    });
    const map = new Map<number, string>();
    for (const segment of distributed.segments) {
      const slotForSegment = allSlots[segment.slotIndex]!;
      const displayContent =
        lineGuideId === 'kids_48'
          ? segment.content
          : truncateTextToSlotWidth(
              segment.content,
              slotForSegment,
              fontSize,
              lineGuideId,
              fontId,
              measureTextWidth,
            );
      map.set(segment.slotIndex, displayContent);
    }
    return { segments: distributed.segments, segmentBySlotIndex: map };
  }, [
    allSlots,
    fontId,
    fontSize,
    lineGuideId,
    measureTextWidth,
    slotsToRender.length,
    startSlotIndex,
    value,
  ]);

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
          slotCount: slotsToRender.length,
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
        const textTop = getTemplateLineTextTop(
          lineSlot,
          fontSize,
          lineGuideId,
          allSlots,
          undefined,
          fontId,
        );
        const lineTypography = getTemplateLineTypography(
          fontSize,
          lineSlot.lineHeight,
          getWishSlotInputKind(lineSlot, lineGuideId),
          lineGuideId
        );
        const lineText = segmentBySlotIndex.get(lineSlot.index) ?? '';
        const isInputSlot = lineSlot.index === activeInputSlotIndex;
        const wishInputKind = getWishSlotInputKind(lineSlot, lineGuideId);
        const rowFontSize = resolveTemplateLineFontSize(
          lineText,
          lineSlot,
          fontSize,
          lineGuideId,
          fontId,
        );
        const rowLineHeight =
          lineTypography.lineHeight * (rowFontSize / lineTypography.fontSize);
        const rowTextAlign = getSlotTemplateTextAlign(lineSlot, lineGuideId, textAlign);
        const { viewportTopInset, textTopInset } = getTemplateLineRowInsets(
          lineSlot,
          rowFontSize,
          wishInputKind,
          lineGuideId
        );
        const usesWeeklyFieldLayout = shouldClipPregnancyWeeklyFieldRow(
          lineSlot,
          lineGuideId,
          allSlots,
        );
        const rowLayout = usesWeeklyFieldLayout
          ? resolveTemplateLineRowLayout({
              lineSlot,
              fontSize: rowFontSize,
              lineGuideId,
              lineSlots: allSlots,
              fieldStartIndex: startSlotIndex,
              fontId,
            })
          : null;
        const textInsets = getTemplateBlockTextInsets(lineSlot, lineGuideId, allSlots);
        const renderBox = usesWeeklyFieldLayout
          ? resolvePregnancyWeeklyFieldRowLayout(
              lineSlot,
              lineText,
              lineGuideId,
              allSlots,
              rowFontSize,
              fontId,
              measureTextWidth,
            )
          : resolveTemplateTextRenderBox(lineSlot, textInsets);

        return (
          <View
            key={lineSlot.index}
            style={[
              styles.host,
              {
                left: renderBox.viewLeft,
                top: rowLayout?.rowViewTop ?? textTop - viewportTopInset,
                width: renderBox.viewWidth,
                height: rowLayout?.rowViewHeight ?? lineTypography.inputHeight + viewportTopInset,
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
                    fontSize: rowFontSize,
                    fontFamily: fontFamilyStyle,
                    lineHeight: rowLineHeight,
                    height: rowLayout?.lineHeight ?? rowLineHeight,
                    top: rowLayout?.rowTextTop ?? textTopInset,
                    left: renderBox.textLeft,
                    width: renderBox.textWidth,
                    textAlign: rowTextAlign,
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
                autoCapitalize={lineSlot.hasLabel ? 'sentences' : 'none'}
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
                    fontSize: rowFontSize,
                    fontFamily: fontFamilyStyle,
                    lineHeight: rowLineHeight,
                    top: rowLayout?.rowTextTop ?? textTopInset,
                    left: renderBox.textLeft,
                    width: renderBox.textWidth,
                    textAlign: rowTextAlign,
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
