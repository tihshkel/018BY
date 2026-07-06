import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppButton, AppCard, AppText } from '@/components/ui';
import { useKeyboardAwareFieldRef } from '@/components/ui/app-screen';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';
import type {
  AlbumPageSchema,
  BirthdayCustomFieldDef,
  BirthdayCustomFieldValue,
} from '@/types/album-page-schema';
import {
  buildDefaultCustomFields,
  clampCustomFieldLabel,
  clampCustomFieldValue,
  createCustomField,
} from '@/utils/birthdayCustomFields';

type BirthdayFreePageEditorProps = {
  schema: AlbumPageSchema;
  customFields: BirthdayCustomFieldValue[];
  onChange: (fields: BirthdayCustomFieldValue[]) => void;
  allowFieldCrud?: boolean;
};

function getDefForField(
  defs: BirthdayCustomFieldDef[] | undefined,
  fieldId: string,
): BirthdayCustomFieldDef | undefined {
  return defs?.find((def) => def.id === fieldId);
}

function resolveEditorFields(
  customFields: BirthdayCustomFieldValue[],
  defs: BirthdayCustomFieldDef[] | undefined,
  allowFieldCrud: boolean,
): BirthdayCustomFieldValue[] {
  const base = customFields.length > 0 ? customFields : buildDefaultCustomFields(defs);
  if (allowFieldCrud || !defs?.length) {
    return base;
  }

  return base.map((field) => {
    const def = getDefForField(defs, field.id);
    if (!def) return field;
    return {
      ...field,
      label: def.defaultLabel,
      fieldType: def.fieldType,
    };
  });
}

export function BirthdayFreePageEditor({
  schema,
  customFields,
  onChange,
  allowFieldCrud = false,
}: BirthdayFreePageEditorProps) {
  const defs = schema.customFieldDefs;
  const fields = useMemo(
    () => resolveEditorFields(customFields, defs, allowFieldCrud),
    [allowFieldCrud, customFields, defs],
  );

  const updateField = useCallback(
    (fieldId: string, patch: Partial<BirthdayCustomFieldValue>) => {
      const nextPatch = { ...patch };
      if (!allowFieldCrud) {
        delete nextPatch.label;
        delete nextPatch.fieldType;
      }

      onChange(
        fields.map((field) => (field.id === fieldId ? { ...field, ...nextPatch } : field)),
      );
    },
    [allowFieldCrud, fields, onChange],
  );

  const addField = useCallback(() => {
    onChange([...fields, createCustomField('short_text')]);
  }, [fields, onChange]);

  const removeField = useCallback(
    (fieldId: string) => {
      onChange(fields.filter((field) => field.id !== fieldId));
    },
    [fields, onChange],
  );

  if (!defs?.length && fields.length === 0) return null;

  return (
    <AppCard style={styles.card}>
      <AppText variant="titleSm" style={styles.title}>
        Текстовые поля
      </AppText>
      <AppText variant="caption" style={styles.hint}>
        {allowFieldCrud
          ? 'Название и значение каждого поля можно изменить под вашу историю.'
          : 'Введите значения — они появятся на странице альбома.'}
      </AppText>

      {fields.map((field) => {
        const def = getDefForField(defs, field.id);
        const labelLimit = def?.maxLabelLength ?? 40;
        const valueLimit = def?.maxValueLength ?? (field.fieldType === 'long_text' ? 300 : 120);
        const displayLabel = def?.defaultLabel ?? field.label;

        return (
          <BirthdayFieldBlock
            key={field.id}
            field={field}
            def={def}
            displayLabel={displayLabel}
            labelLimit={labelLimit}
            valueLimit={valueLimit}
            allowFieldCrud={allowFieldCrud}
            canRemove={fields.length > 1}
            onRemove={() => removeField(field.id)}
            onUpdate={(patch) => updateField(field.id, patch)}
          />
        );
      })}

      {allowFieldCrud ? (
        <AppButton variant="secondary" onPress={addField} style={styles.addButton}>
          Добавить поле
        </AppButton>
      ) : null}
    </AppCard>
  );
}

type BirthdayFieldBlockProps = {
  field: BirthdayCustomFieldValue;
  def: BirthdayCustomFieldDef | undefined;
  displayLabel: string;
  labelLimit: number;
  valueLimit: number;
  allowFieldCrud: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onUpdate: (patch: Partial<BirthdayCustomFieldValue>) => void;
};

function BirthdayFieldBlock({
  field,
  def,
  displayLabel,
  labelLimit,
  valueLimit,
  allowFieldCrud,
  canRemove,
  onRemove,
  onUpdate,
}: BirthdayFieldBlockProps) {
  const { fieldRef, onInputFocus } = useKeyboardAwareFieldRef();

  return (
    <View ref={fieldRef} style={styles.fieldBlock} collapsable={false}>
      {allowFieldCrud ? (
        <>
          <View style={styles.fieldHeader}>
            <AppText variant="caption" style={styles.fieldIndex}>
              {displayLabel || 'Новое поле'}
            </AppText>
            {canRemove ? (
              <Pressable onPress={onRemove} hitSlop={8}>
                <AppText variant="caption" style={styles.removeLink}>
                  Удалить
                </AppText>
              </Pressable>
            ) : null}
          </View>

          <AppText variant="caption" style={styles.inputLabel}>
            Название поля
          </AppText>
          <TextInput
            style={styles.input}
            value={field.label}
            onChangeText={(text) =>
              onUpdate({ label: clampCustomFieldLabel(text, labelLimit) })
            }
            placeholder={def?.defaultLabel ?? 'Название поля'}
            placeholderTextColor={colors.textSecondary}
            maxLength={labelLimit}
            onFocus={onInputFocus}
          />
        </>
      ) : (
        <AppText variant="caption" style={styles.fixedLabel}>
          {displayLabel}
        </AppText>
      )}

      {allowFieldCrud ? (
        <AppText variant="caption" style={styles.inputLabel}>
          Значение
        </AppText>
      ) : null}
      <TextInput
        style={[styles.input, field.fieldType === 'long_text' && styles.inputMultiline]}
        value={field.value}
        onChangeText={(text) =>
          onUpdate({
            value: clampCustomFieldValue(text, field.fieldType, valueLimit),
          })
        }
        placeholder="Введите текст"
        placeholderTextColor={colors.textSecondary}
        multiline={field.fieldType === 'long_text'}
        maxLength={valueLimit}
        accessibilityLabel={displayLabel}
        onFocus={onInputFocus}
      />
      <AppText variant="caption" style={styles.counter}>
        {field.value.length} / {valueLimit}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
  },
  hint: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fieldBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  fieldIndex: {
    color: colors.textSecondary,
  },
  fixedLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  removeLink: {
    color: colors.error,
  },
  inputLabel: {
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: sansFont('regular'),
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    color: colors.textSecondary,
    marginTop: 4,
  },
  addButton: {
    marginTop: spacing.sm,
  },
});
