import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  AppDatePickerSheet,
  AppInlineDatePicker,
} from '@/components/ui/app-date-picker-sheet';
import { AppText } from '@/components/ui/app-text';
import {
  formatAlbumDate,
  clampDateToBounds,
  resolveAlbumPickerDate,
} from '@/utils/albumDateFormat';
import {
  clampFieldInput,
} from '@/utils/albumFieldLimits';
import {
  getFieldKeyboardType,
  getFieldMaxLength,
} from '@/utils/albumFieldInput';
import type { AlbumPageField } from '@/types/album-page-schema';
import {
  colors,
  radii,
  sansFont,
  spacing,
} from '@/constants/design-tokens';

const MIN_ALBUM_DATE = new Date(1920, 0, 1);
const MAX_ALBUM_DATE = new Date(2100, 11, 31);

export type AppDateFieldPresentation = 'sheet' | 'inline';

export interface AppDateFieldProps {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  presentation?: AppDateFieldPresentation;
  placeholder?: string;
  accessibilityLabel?: string;
  /** Внутри другой модалки: календарь сразу в контенте, без второго sheet. */
  embedded?: boolean;
  /** Album form: string value + field schema */
  stringValue?: string;
  onStringChange?: (value: string) => void;
  field?: AlbumPageField;
  characterLimit?: number;
  onInputFocus?: () => void;
}

function formatDisplayDate(date: Date, mode: 'date' | 'datetime'): string {
  if (mode === 'datetime') {
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function AppDateField({
  label,
  value,
  onChange,
  mode = 'date',
  minimumDate,
  maximumDate,
  presentation = 'sheet',
  placeholder = 'дд.мм.гггг',
  accessibilityLabel,
  embedded = false,
  stringValue,
  onStringChange,
  field,
  characterLimit,
  onInputFocus,
}: AppDateFieldProps) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(embedded);

  const effectivePresentation = embedded ? 'inline' : presentation;
  const inlineVisible = embedded || inlineOpen;

  const displayText = useMemo(
    () => (stringValue !== undefined ? stringValue : formatDisplayDate(value, mode)),
    [stringValue, value, mode]
  );

  const minDate = minimumDate ?? (field?.type === 'date' ? MIN_ALBUM_DATE : undefined);
  const maxDate = maximumDate ?? (field?.type === 'date' ? MAX_ALBUM_DATE : undefined);

  const pickerDate = useMemo(() => {
    if (stringValue !== undefined) {
      return resolveAlbumPickerDate(stringValue, minDate, maxDate);
    }
    return clampDateToBounds(value, minDate, maxDate);
  }, [stringValue, value, minDate, maxDate]);

  const handleDateChange = (date: Date) => {
    onChange(date);
    if (onStringChange && field) {
      onStringChange(clampFieldInput(field, formatAlbumDate(date), characterLimit));
    } else if (onStringChange) {
      onStringChange(formatAlbumDate(date));
    }
    // После выбора даты скрываем календарь (кроме embedded — там он всегда в контенте).
    if (!embedded) {
      setInlineOpen(false);
      setSheetVisible(false);
    }
  };

  const openPicker = () => {
    if (embedded) return;
    if (effectivePresentation === 'inline') {
      setInlineOpen((prev) => !prev);
      return;
    }
    setSheetVisible(true);
  };

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="caption" style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <View style={styles.inputRow}>
        {onStringChange ? (
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            value={stringValue ?? ''}
            onChangeText={(text) => {
              if (!field) {
                onStringChange(text);
                return;
              }
              onStringChange(clampFieldInput(field, text, characterLimit));
            }}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            keyboardType={getFieldKeyboardType('date')}
            maxLength={characterLimit ?? getFieldMaxLength('date')}
            inputMode="numeric"
            accessibilityLabel={accessibilityLabel ?? label}
            onFocus={onInputFocus}
          />
        ) : embedded ? null : (
          <Pressable
            style={styles.dateButton}
            onPress={openPicker}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label ?? 'Выбрать дату'}
          >
            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
            <AppText variant="body" style={styles.dateText}>
              {displayText || placeholder}
            </AppText>
            <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
          </Pressable>
        )}

        {onStringChange ? (
          <Pressable
            style={styles.calendarButton}
            onPress={openPicker}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Открыть календарь: ${label ?? ''}`}
          >
            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      {effectivePresentation === 'inline' ? (
        <AppInlineDatePicker
          visible={inlineVisible}
          value={pickerDate}
          onChange={handleDateChange}
          minimumDate={minDate}
          maximumDate={maxDate}
        />
      ) : (
        <AppDatePickerSheet
          visible={sheetVisible}
          value={pickerDate}
          onChange={handleDateChange}
          onClose={() => setSheetVisible(false)}
          mode={mode}
          minimumDate={minDate}
          maximumDate={maxDate}
          title={label ?? 'Выберите дату'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    color: colors.textSecondary,
  },
  inputRow: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: sansFont('regular'),
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  calendarButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 14,
    backgroundColor: colors.white,
  },
  dateText: {
    flex: 1,
    color: colors.textPrimary,
  },
});
