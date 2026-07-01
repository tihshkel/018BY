import React, { useMemo, useRef, memo, useCallback } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppDateField } from '@/components/ui/app-date-field';
import { AppText } from '@/components/ui/app-text';
import { useAppScreenScrollToField } from '@/components/ui/app-screen';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';
import type { AlbumPageField, FieldTextStyle } from '@/types/album-page-schema';
import { isSquareBlankLineGuide } from '@/utils/albumImages';
import { parseAlbumDate } from '@/utils/albumDateFormat';
import {
  clampFieldInput,
  countFieldCharacters,
  getFieldCharacterLimit,
} from '@/utils/albumFieldLimits';
import { getFieldKeyboardTypeForField } from '@/utils/albumFieldInput';
import { getMeasurementDigitLimit } from '@/utils/albumMeasurementFields';

type PageFormFieldsProps = {
  fields: AlbumPageField[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  fieldTextStyles?: Record<string, FieldTextStyle>;
  onFieldStyleChange?: (fieldId: string, patch: Partial<FieldTextStyle>) => void;
  sectionTitle?: string;
  lineGuideId: string;
  sourcePageNumber: number;
};

const MIN_FIELD_FONT_SIZE = 10;
const MAX_FIELD_FONT_SIZE = 28;

const ALIGN_OPTIONS: {
  id: 'left' | 'center' | 'right';
  icon: 'format-align-left' | 'format-align-center' | 'format-align-right';
  label: string;
}[] = [
  { id: 'left', icon: 'format-align-left', label: 'По левому краю' },
  { id: 'center', icon: 'format-align-center', label: 'По центру' },
  { id: 'right', icon: 'format-align-right', label: 'По правому краю' },
];

export function TextFieldStyleToolbar({
  style,
  defaultAlign,
  onChange,
}: {
  style?: FieldTextStyle;
  defaultAlign: 'left' | 'center' | 'right';
  onChange: (patch: Partial<FieldTextStyle>) => void;
}) {
  const textAlign = style?.textAlign ?? defaultAlign;
  const fontSize = style?.fontSize ?? 14;

  return (
    <View style={styles.toolbar}>
      <View style={styles.alignGroup}>
        {ALIGN_OPTIONS.map((option) => {
          const selected = textAlign === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => onChange({ textAlign: option.id })}
              style={[styles.alignButton, selected && styles.alignButtonSelected]}
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
            >
              <MaterialIcons
                name={option.icon}
                size={20}
                color={selected ? colors.primary : colors.textSecondary}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.fontSizeGroup}>
        <Pressable
          onPress={() => onChange({ fontSize: Math.max(MIN_FIELD_FONT_SIZE, fontSize - 1) })}
          style={styles.fontSizeButton}
          accessibilityLabel="Уменьшить шрифт"
        >
          <AppText variant="caption">A−</AppText>
        </Pressable>
        <AppText variant="caption" style={styles.fontSizeValue}>
          {fontSize} pt
        </AppText>
        <Pressable
          onPress={() => onChange({ fontSize: Math.min(MAX_FIELD_FONT_SIZE, fontSize + 1) })}
          style={styles.fontSizeButton}
          accessibilityLabel="Увеличить шрифт"
        >
          <AppText variant="caption">A+</AppText>
        </Pressable>
      </View>
    </View>
  );
}

type TypedFormFieldProps = {
  field: AlbumPageField;
  value: string;
  onChange: (value: string) => void;
  characterLimit?: number;
  onInputFocus?: () => void;
};

function FieldCharacterCounter({
  value,
  limit,
}: {
  value: string;
  limit?: number;
}) {
  if (limit == null) return null;

  const count = countFieldCharacters(value);
  const isNearLimit = count >= Math.max(1, limit - 5);
  const isAtLimit = count >= limit;

  return (
    <AppText
      variant="caption"
      style={[
        styles.counter,
        isNearLimit && styles.counterNearLimit,
        isAtLimit && styles.counterAtLimit,
      ]}
    >
      {count} / {limit}
    </AppText>
  );
}

function handleTypedInput(
  field: AlbumPageField,
  text: string,
  onChange: (value: string) => void,
  characterLimit?: number
) {
  onChange(clampFieldInput(field, text, characterLimit));
}

const MIN_ALBUM_DATE = new Date(1920, 0, 1);
const MAX_ALBUM_DATE = new Date(2100, 11, 31);

function DateFormField({
  field,
  value,
  onChange,
  characterLimit,
  onInputFocus,
}: TypedFormFieldProps) {
  const pickerValue = useMemo(() => parseAlbumDate(value) ?? new Date(), [value]);

  return (
    <AppDateField
      presentation="inline"
      value={pickerValue}
      onChange={() => undefined}
      stringValue={value}
      onStringChange={onChange}
      field={field}
      characterLimit={characterLimit}
      minimumDate={MIN_ALBUM_DATE}
      maximumDate={MAX_ALBUM_DATE}
      placeholder={field.placeholder ?? 'дд.мм.гггг'}
      accessibilityLabel={field.label}
      onInputFocus={onInputFocus}
    />
  );
}

function RadioFormField({ field, value, onChange }: TypedFormFieldProps) {
  const options = field.options ?? [];

  return (
    <View style={styles.radioGroup}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.radioRow, selected && styles.radioRowSelected]}
          >
            <View style={[styles.radioDot, selected && styles.radioDotSelected]} />
            <AppText variant="body">{option}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const TypedFormField = memo(function TypedFormField({
  field,
  value,
  onChange,
  characterLimit,
  onInputFocus,
}: TypedFormFieldProps) {
  const isMultiline = field.templateLineCount > 1;

  return (
    <View>
      <TextInput
        style={[styles.input, isMultiline && styles.inputMultiline]}
        value={value}
        onChangeText={(text) => handleTypedInput(field, text, onChange, characterLimit)}
        placeholder={field.placeholder ?? field.label}
        placeholderTextColor={colors.placeholder}
        keyboardType={getFieldKeyboardTypeForField(field)}
        maxLength={characterLimit}
        multiline={isMultiline}
        textAlignVertical={isMultiline ? 'top' : 'center'}
        inputMode={
          getMeasurementDigitLimit(field) != null || field.type === 'number' || field.type === 'time'
            ? 'numeric'
            : 'text'
        }
        accessibilityLabel={field.label}
        onFocus={onInputFocus}
      />
      <FieldCharacterCounter value={value} limit={characterLimit} />
    </View>
  );
});

const AlbumFormField = memo(function AlbumFormField({
  field,
  value,
  fieldId,
  onFieldChange,
  characterLimit,
  fieldStyle,
  onFieldStyleChange,
  showTextStyleToolbar,
}: {
  field: AlbumPageField;
  value: string;
  fieldId: string;
  onFieldChange: (fieldId: string, value: string) => void;
  characterLimit?: number;
  fieldStyle?: FieldTextStyle;
  onFieldStyleChange?: (fieldId: string, patch: Partial<FieldTextStyle>) => void;
  showTextStyleToolbar?: boolean;
}) {
  const fieldRef = useRef<View>(null);
  const scrollToField = useAppScreenScrollToField();

  const handleInputFocus = () => {
    scrollToField?.(fieldRef);
  };

  const onChange = useCallback(
    (text: string) => onFieldChange(fieldId, text),
    [fieldId, onFieldChange]
  );

  const defaultAlign =
    field.fieldId.endsWith('_title') || field.label === 'Заголовок' ? 'center' : 'left';
  const showToolbar =
    showTextStyleToolbar &&
    onFieldStyleChange &&
    field.type !== 'date' &&
    field.type !== 'radio';

  return (
    <View ref={fieldRef} style={styles.field} collapsable={false}>
      <AppText variant="caption" style={styles.label}>
        {field.label}
      </AppText>
      {showToolbar ? (
        <TextFieldStyleToolbar
          style={fieldStyle}
          defaultAlign={defaultAlign}
          onChange={(patch) => onFieldStyleChange(fieldId, patch)}
        />
      ) : null}
      {field.type === 'date' ? (
        <View>
          <DateFormField
            field={field}
            value={value}
            onChange={onChange}
            characterLimit={characterLimit}
            onInputFocus={handleInputFocus}
          />
          <FieldCharacterCounter value={value} limit={characterLimit} />
        </View>
      ) : field.type === 'radio' ? (
        <RadioFormField field={field} value={value} onChange={onChange} />
      ) : (
        <TypedFormField
          field={field}
          value={value}
          onChange={onChange}
          characterLimit={characterLimit}
          onInputFocus={handleInputFocus}
        />
      )}
    </View>
  );
});

export const PageFormFields = memo(function PageFormFields({
  fields,
  values,
  onChange,
  fieldTextStyles,
  onFieldStyleChange,
  sectionTitle,
  lineGuideId,
  sourcePageNumber,
}: PageFormFieldsProps) {
  const showTextStyleToolbar = isSquareBlankLineGuide(lineGuideId);
  const fieldLimits = useMemo(() => {
    const limits: Record<string, number | undefined> = {};
    for (const field of fields) {
      limits[field.fieldId] = getFieldCharacterLimit({
        field,
        lineGuideId,
        sourcePageNumber,
      });
    }
    return limits;
  }, [fields, lineGuideId, sourcePageNumber]);

  if (fields.length === 0) return null;

  return (
    <View style={styles.section}>
      {sectionTitle ? (
        <AppText variant="titleSm" style={styles.sectionTitle}>
          {sectionTitle}
        </AppText>
      ) : null}
      {fields.map((field) => {
        const characterLimit = fieldLimits[field.fieldId];
        const value = values[field.fieldId] ?? '';

        return (
          <AlbumFormField
            key={field.fieldId}
            field={field}
            fieldId={field.fieldId}
            value={value}
            onFieldChange={onChange}
            characterLimit={characterLimit}
            fieldStyle={fieldTextStyles?.[field.fieldId]}
            onFieldStyleChange={onFieldStyleChange}
            showTextStyleToolbar={showTextStyleToolbar}
          />
        );
      })}
    </View>
  );
});

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
  inputMultiline: {
    minHeight: 88,
    paddingTop: 12,
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 4,
    color: colors.placeholder,
  },
  counterNearLimit: {
    color: colors.textSecondary,
  },
  counterAtLimit: {
    color: colors.primaryPressed,
    fontFamily: sansFont('semibold'),
  },
  radioGroup: {
    gap: 4,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  radioRowSelected: {
    backgroundColor: colors.primarySurface,
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  radioDotSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  alignGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  alignButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  alignButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  fontSizeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fontSizeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fontSizeValue: {
    color: colors.textSecondary,
    minWidth: 44,
    textAlign: 'center',
  },
});
