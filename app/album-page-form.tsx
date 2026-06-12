import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PageFormFields } from '@/components/album/page-form-fields';
import { AppButton, AppHeader, AppScreen, AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';
import { useAlbumProject } from '@/hooks/use-album-project';
import { createEmptyPageValues } from '@/utils/pageStorage';

export default function AlbumPageFormScreen() {
  const { id, instanceId, celebration, coverType, interiorType } = useLocalSearchParams<{
    id?: string;
    instanceId?: string;
    celebration?: string;
    coverType?: string;
    interiorType?: string;
  }>();

  const project = useAlbumProject({
    projectId: id,
    celebration,
    coverType,
    interiorType,
  });

  const instance = useMemo(
    () => project.instances.find((i) => i.instanceId === instanceId),
    [project.instances, instanceId]
  );
  const schema = instance ? project.getSchemaForInstance(instance) : undefined;

  const storedValues = instanceId
    ? project.pageValuesMap[instanceId] ?? createEmptyPageValues()
    : createEmptyPageValues();

  const [draftFields, setDraftFields] = useState<Record<string, string>>(storedValues.fields);

  const persistFields = useCallback(
    (fields: Record<string, string>) => {
      if (!instanceId) return;
      project.updatePageValues(instanceId, (prev) => ({
        ...prev,
        fields,
      }));
    },
    [instanceId, project]
  );

  const handleFieldChange = useCallback(
    (fieldId: string, value: string) => {
      setDraftFields((prev) => {
        const nextFields = { ...prev, [fieldId]: value };
        persistFields(nextFields);
        return nextFields;
      });
    },
    [persistFields]
  );

  if (project.isLoading || !instance || !schema) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  const fields = schema.fields ?? [];

  const handleNext = async () => {
    if (!instanceId) return;
    await project.savePageValuesNow(instanceId, {
      ...storedValues,
      fields: draftFields,
    });

    if (schema.photoBlocks?.length) {
      router.push({
        pathname: '/album-page-photos',
        params: { id, instanceId, celebration, coverType, interiorType },
      } as unknown as Href);
      return;
    }

    router.push({
      pathname: '/album-page-preview',
      params: { id, instanceId, celebration, coverType, interiorType, mode: 'final' },
    } as unknown as Href);
  };

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <AppHeader title="Заполните страницу" />

      <AppText variant="titleSm" style={styles.pageTitle}>
        {project.getInstanceTitle(instance)}
      </AppText>

      <PageFormFields fields={fields} values={draftFields} onChange={handleFieldChange} />

      {fields.length === 0 ? (
        <AppText variant="bodySm" style={styles.emptyHint}>
          На этой странице нет текстовых полей. Перейдите к добавлению фото.
        </AppText>
      ) : null}

      <AppButton title="Далее" onPress={handleNext} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    color: colors.textSecondary,
  },
  emptyHint: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
