import React, { useCallback } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppButton, AppCard, AppText } from '@/components/ui';
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

export function BirthdayFreePageEditor({
  schema,
  customFields,
  onChange,
  allowFieldCrud = false,
}: BirthdayFreePageEditorProps) {
  const defs = schema.customFieldDefs;
  const fields = customFields.length > 0 ? customFields : buildDefaultCustomFields(defs);

  const updateField = useCallback(
    (fieldId: string, patch: Partial<BirthdayCustomFieldValue>) => {
      onChange(
        fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
      );
    },
    [fields, onChange],
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
        Название и значение каждого поля можно изменить под вашу историю.
      </AppText>

      {fields.map((field, index) => {
        const def = getDefForField(defs, field.id);
        const labelLimit = def?.maxLabelLength ?? 40;
        const valueLimit = def?.maxValueLength ?? (field.fieldType === 'long_text' ? 300 : 120);

        return (
          <View key={field.id} style={styles.fieldBlock}>
            <View style={styles.fieldHeader}>
              <AppText variant="caption" style={styles.fieldIndex}>
                {def?.defaultLabel ?? `Поле ${index + 1}`}
              </AppText>
              {allowFieldCrud && fields.length > 1 ? (
                <Pressable onPress={() => removeField(field.id)} hitSlop={8}>
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
                updateField(field.id, { label: clampCustomFieldLabel(text, labelLimit) })
              }
              placeholder={def?.defaultLabel ?? 'Название поля'}
              placeholderTextColor={colors.textSecondary}
              maxLength={labelLimit}
            />

            <AppText variant="caption" style={styles.inputLabel}>
              Значение
            </AppText>
            <TextInput
              style={[styles.input, field.fieldType === 'long_text' && styles.inputMultiline]}
              value={field.value}
              onChangeText={(text) =>
                updateField(field.id, {
                  value: clampCustomFieldValue(text, field.fieldType),
                })
              }
              placeholder="Введите текст"
              placeholderTextColor={colors.textSecondary}
              multiline={field.fieldType === 'long_text'}
              maxLength={valueLimit}
            />
            <AppText variant="caption" style={styles.counter}>
              {field.value.length} / {valueLimit}
            </AppText>
          </View>
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
