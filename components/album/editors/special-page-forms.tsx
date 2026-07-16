import React from 'react';
import { StyleSheet, View } from 'react-native';

import { PageFormFields } from '@/components/album/page-form-fields';
import { AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';
import type { AlbumPageField, FieldTextStyle } from '@/types/album-page-schema';

type SpecialFormProps = {
  fields: AlbumPageField[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  fieldTextStyles?: Record<string, FieldTextStyle>;
  onFieldStyleChange?: (fieldId: string, patch: Partial<FieldTextStyle>) => void;
  lineGuideId: string;
  sourcePageNumber: number;
  fontId?: string | null;
};

function styleProps(props: SpecialFormProps) {
  return {
    fieldTextStyles: props.fieldTextStyles,
    onFieldStyleChange: props.onFieldStyleChange,
    fontId: props.fontId,
  };
}

export function FamilyTreeForm(props: SpecialFormProps) {
  const { fields, values, onChange, lineGuideId, sourcePageNumber } = props;
  const childFields = fields.filter((f) => f.fieldId.includes('_child_'));
  const motherFields = fields.filter((f) => f.fieldId.includes('_mother_'));
  const fatherFields = fields.filter((f) => f.fieldId.includes('_father_'));
  const shared = styleProps(props);

  return (
    <View style={styles.wrap}>
      <PageFormFields
        fields={childFields}
        values={values}
        onChange={onChange}
        sectionTitle="Ребенок"
        lineGuideId={lineGuideId}
        sourcePageNumber={sourcePageNumber}
        {...shared}
      />
      <PageFormFields
        fields={motherFields}
        values={values}
        onChange={onChange}
        sectionTitle="Линия мамы"
        lineGuideId={lineGuideId}
        sourcePageNumber={sourcePageNumber}
        {...shared}
      />
      <PageFormFields
        fields={fatherFields}
        values={values}
        onChange={onChange}
        sectionTitle="Линия папы"
        lineGuideId={lineGuideId}
        sourcePageNumber={sourcePageNumber}
        {...shared}
      />
    </View>
  );
}

export function TeethForm(props: SpecialFormProps) {
  const { fields, values, onChange, lineGuideId, sourcePageNumber } = props;
  const upperFields = fields.filter((f) => f.fieldId.includes('upper_'));
  const lowerFields = fields.filter((f) => f.fieldId.includes('lower_'));
  const extraFields = fields.filter(
    (f) => !f.fieldId.includes('upper_') && !f.fieldId.includes('lower_')
  );
  const shared = styleProps(props);

  return (
    <View style={styles.wrap}>
      <AppText variant="bodySm" style={styles.hint}>
        Заполните даты — они автоматически появятся возле нужных зубов на странице.
      </AppText>
      <PageFormFields
        fields={upperFields}
        values={values}
        onChange={onChange}
        sectionTitle="Верхняя челюсть"
        lineGuideId={lineGuideId}
        sourcePageNumber={sourcePageNumber}
        {...shared}
      />
      <PageFormFields
        fields={lowerFields}
        values={values}
        onChange={onChange}
        sectionTitle="Нижняя челюсть"
        lineGuideId={lineGuideId}
        sourcePageNumber={sourcePageNumber}
        {...shared}
      />
      <PageFormFields
        fields={extraFields}
        values={values}
        onChange={onChange}
        sectionTitle="Дополнительно"
        lineGuideId={lineGuideId}
        sourcePageNumber={sourcePageNumber}
        {...shared}
      />
    </View>
  );
}

export function GrowthWeightForm(props: SpecialFormProps) {
  const { fields, values, onChange, lineGuideId, sourcePageNumber } = props;
  const shared = styleProps(props);

  const monthGroups: AlbumPageField[][] = [];
  for (let month = 1; month <= 12; month += 1) {
    const key = `_month_${String(month).padStart(2, '0')}_`;
    monthGroups.push(fields.filter((f) => f.fieldId.includes(key)));
  }

  return (
    <View style={styles.wrap}>
      {monthGroups.map((group, index) => {
        if (group.length === 0) return null;
        const label = index === 11 ? '1 год' : `${index + 1} месяц`;
        return (
          <PageFormFields
            key={label}
            fields={group}
            values={values}
            onChange={onChange}
            sectionTitle={label}
            lineGuideId={lineGuideId}
            sourcePageNumber={sourcePageNumber}
            {...shared}
          />
        );
      })}
    </View>
  );
}

export function MonthPageForm(props: SpecialFormProps) {
  return <PageFormFields {...props} />;
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  hint: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});
