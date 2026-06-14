import React from 'react';
import { StyleSheet, View } from 'react-native';

import { PageFormFields } from '@/components/album/page-form-fields';
import { AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';
import type { AlbumPageField } from '@/types/album-page-schema';

type SpecialFormProps = {
  fields: AlbumPageField[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  lineGuideId: string;
  sourcePageNumber: number;
};

export function FamilyTreeForm(props: SpecialFormProps) {
  const { fields, values, onChange, lineGuideId, sourcePageNumber } = props;
  const childFields = fields.filter((f) => f.fieldId.includes('child_name'));
  const motherFields = fields.filter((f) => f.fieldId.includes('mother_'));
  const fatherFields = fields.filter((f) => f.fieldId.includes('father_'));

  return (
    <View style={styles.wrap}>
      <PageFormFields
        fields={childFields}
        values={values}
        onChange={onChange}
        sectionTitle="Ребенок"
        lineGuideId={lineGuideId}
        sourcePageNumber={sourcePageNumber}
      />
      <PageFormFields
        fields={motherFields}
        values={values}
        onChange={onChange}
        sectionTitle="Линия мамы"
        lineGuideId={lineGuideId}
        sourcePageNumber={sourcePageNumber}
      />
      <PageFormFields
        fields={fatherFields}
        values={values}
        onChange={onChange}
        sectionTitle="Линия папы"
        lineGuideId={lineGuideId}
        sourcePageNumber={sourcePageNumber}
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
      />
      <PageFormFields
        fields={lowerFields}
        values={values}
        onChange={onChange}
        sectionTitle="Нижняя челюсть"
        lineGuideId={lineGuideId}
        sourcePageNumber={sourcePageNumber}
      />
      <PageFormFields
        fields={extraFields}
        values={values}
        onChange={onChange}
        sectionTitle="Дополнительно"
        lineGuideId={lineGuideId}
        sourcePageNumber={sourcePageNumber}
      />
    </View>
  );
}

export function GrowthWeightForm(props: SpecialFormProps) {
  const { fields, values, onChange, lineGuideId, sourcePageNumber } = props;

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
