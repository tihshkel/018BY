import React, { useEffect, useRef, useState } from 'react';
import {
  InteractionManager,
  Platform,
  StyleSheet,
  type TextInput,
} from 'react-native';

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
  const [inputKey, setInputKey] = useState(0);
  const initialNameRef = useRef(initialName);
  const inputRef = useRef<TextInput>(null);

  initialNameRef.current = initialName;

  useEffect(() => {
    if (!visible) return;

    setDraftName(initialNameRef.current);
    setInputKey((key) => key + 1);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(
        () => inputRef.current?.focus(),
        Platform.OS === 'android' ? 400 : 0,
      );
    });

    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [visible]);

  const trimmed = draftName.trim();
  const canSave = trimmed.length > 0 && trimmed !== initialName.trim() && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    await onSave(trimmed);
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Изменить имя"
      subtitle="Как к вам обращаться в приложении"
      scroll
      keyboardAvoiding
      footer={
        <AppButton
          testID="profile-name-save"
          title="Сохранить"
          onPress={() => void handleSave()}
          loading={isSaving}
          disabled={!canSave}
        />
      }
    >
      <AppInput
        key={`profile-name-input-${inputKey}`}
        ref={inputRef}
        testID="profile-name-input"
        value={draftName}
        onChangeText={setDraftName}
        placeholder="Введите ваше имя"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        blurOnSubmit={false}
        editable={!isSaving}
        {...(Platform.OS === 'android'
          ? { includeFontPadding: false, textAlignVertical: 'center' as const }
          : {})}
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
