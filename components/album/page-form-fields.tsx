import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';
import type { AlbumPageField } from '@/types/album-page-schema';
import { formatAlbumDate, parseAlbumDate } from '@/utils/albumDateFormat';
import {
  getFieldKeyboardType,
  getFieldMaxLength,
  sanitizeFieldInput,
} from '@/utils/albumFieldInput';

type PageFormFieldsProps = {
  fields: AlbumPageField[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  sectionTitle?: string;
};

type TypedFormFieldProps = {
  field: AlbumPageField;
  value: string;
  onChange: (value: string) => void;
};

const MIN_ALBUM_DATE = new Date(1920, 0, 1);
const MAX_ALBUM_DATE = new Date(2100, 11, 31);

function handleTypedInput(field: AlbumPageField, text: string, onChange: (value: string) => void) {
  onChange(sanitizeFieldInput(field.type, text));
}

function DateFormField({ field, value, onChange }: TypedFormFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerValue = useMemo(() => parseAlbumDate(value) ?? new Date(), [value]);

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'dismissed' || !date) return;
    onChange(formatAlbumDate(date));
  };

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, styles.inputWithIcon]}
          value={value}
          onChangeText={(text) => handleTypedInput(field, text, onChange)}
          placeholder={field.placeholder ?? 'дд.мм.гггг'}
          placeholderTextColor={colors.placeholder}
          keyboardType={getFieldKeyboardType('date')}
          maxLength={getFieldMaxLength('date')}
          inputMode="numeric"
          accessibilityLabel={field.label}
        />
        <Pressable
          style={styles.calendarButton}
          onPress={() => setShowPicker((prev) => !prev)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Открыть календарь: ${field.label}`}
        >
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {showPicker ? (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display={Platform.select({
              ios: 'inline',
              android: 'calendar',
              default: 'default',
            })}
            minimumDate={MIN_ALBUM_DATE}
            maximumDate={MAX_ALBUM_DATE}
            onChange={handlePickerChange}
            locale="ru-RU"
            themeVariant="light"
            textColor={Platform.OS === 'ios' ? colors.textPrimary : undefined}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              style={styles.pickerDoneButton}
              onPress={() => setShowPicker(false)}
              accessibilityRole="button"
              accessibilityLabel="Готово"
            >
              <AppText variant="bodySm" style={styles.pickerDoneText}>
                Готово
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function TypedFormField({ field, value, onChange }: TypedFormFieldProps) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={(text) => handleTypedInput(field, text, onChange)}
      placeholder={field.placeholder ?? field.label}
      placeholderTextColor={colors.placeholder}
      keyboardType={getFieldKeyboardType(field.type)}
      maxLength={getFieldMaxLength(field.type)}
      inputMode={field.type === 'number' || field.type === 'time' ? 'numeric' : 'text'}
      accessibilityLabel={field.label}
    />
  );
}

export function PageFormFields({
  fields,
  values,
  onChange,
  sectionTitle,
}: PageFormFieldsProps) {
  if (fields.length === 0) return null;

  return (
    <View style={styles.section}>
      {sectionTitle ? (
        <AppText variant="titleSm" style={styles.sectionTitle}>
          {sectionTitle}
        </AppText>
      ) : null}
      {fields.map((field) => (
        <View key={field.fieldId} style={styles.field}>
          <AppText variant="caption" style={styles.label}>
            {field.label}
          </AppText>
          {field.type === 'date' ? (
            <DateFormField
              field={field}
              value={values[field.fieldId] ?? ''}
              onChange={(text) => onChange(field.fieldId, text)}
            />
          ) : (
            <TypedFormField
              field={field}
              value={values[field.fieldId] ?? ''}
              onChange={(text) => onChange(field.fieldId, text)}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  field: {
    marginBottom: spacing.sm,
  },
  label: {
    marginBottom: 6,
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
  pickerContainer: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  pickerDoneButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.primarySurface,
  },
  pickerDoneText: {
    color: colors.primary,
    fontFamily: sansFont('semibold'),
  },
});
