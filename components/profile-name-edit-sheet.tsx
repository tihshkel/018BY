import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppBottomSheet, AppButton, AppInput } from '@/components/ui';
import { spacing } from '@/constants/design-tokens';

type ProfileNameEditSheetProps = {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  isSaving?: boolean;
};

export function ProfileNameEditSheet({
  visible,
  initialName,
  onClose,
  onSave,
  isSaving = false,
}: ProfileNameEditSheetProps) {
  const [draftName, setDraftName] = useState(initialName);

  useEffect(() => {
    if (visible) {
      setDraftName(initialName);
    }
  }, [visible, initialName]);

  const trimmed = draftName.trim();
  const canSave = trimmed.length > 0 && trimmed !== initialName.trim() && !isSaving;

  const footer = useMemo(
    () => (
      <AppButton
        testID="profile-name-save"
        title="Сохранить"
        onPress={() => {
          if (!canSave) return;
          void onSave(trimmed);
        }}
        loading={isSaving}
        disabled={!canSave}
      />
    ),
    [canSave, isSaving, onSave, trimmed],
  );

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Изменить имя"
      subtitle="Как к вам обращаться в приложении"
      scroll={false}
      footer={footer}
    >
      <AppInput
        testID="profile-name-input"
        value={draftName}
        onChangeText={setDraftName}
        placeholder="Введите ваше имя"
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus={visible}
        returnKeyType="done"
        blurOnSubmit={false}
        onSubmitEditing={() => {
          if (canSave) {
            void onSave(trimmed);
          }
        }}
        containerStyle={styles.input}
      />
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    marginBottom: spacing.sm,
  },
});
