import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBottomSheet, AppButton, AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';

export type ProjectActionSheetStep = 'menu' | 'confirmDelete';

type ProjectActionSheetProps = {
  visible: boolean;
  projectTitle: string;
  step: ProjectActionSheetStep;
  onRequestClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteConfirm: () => void;
  onDeleteConfirmCancel: () => void;
};

export function ProjectActionSheet({
  visible,
  projectTitle,
  step,
  onRequestClose,
  onEdit,
  onDelete,
  onDeleteConfirm,
  onDeleteConfirmCancel,
}: ProjectActionSheetProps) {
  const isConfirm = step === 'confirmDelete';

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onRequestClose}
      title={isConfirm ? 'Удалить проект?' : projectTitle}
      subtitle={
        isConfirm
          ? `Проект «${projectTitle}» будет удалён без возможности восстановления.`
          : 'Выберите действие'
      }
      scroll={false}
      footer={
        isConfirm ? (
          <View style={styles.footer}>
            <AppButton title="Удалить" onPress={onDeleteConfirm} />
            <AppButton title="Отмена" variant="ghost" onPress={onDeleteConfirmCancel} />
          </View>
        ) : (
          <View style={styles.footer}>
            <AppButton title="Редактировать" onPress={onEdit} />
            <AppButton
              title="Удалить"
              variant="outline"
              onPress={onDelete}
              style={styles.deleteOutlineBtn}
            />
            <AppButton title="Отмена" variant="ghost" onPress={onRequestClose} />
          </View>
        )
      }
    >
      {isConfirm ? (
        <AppText variant="bodySm" style={styles.hint}>
          Это действие нельзя отменить.
        </AppText>
      ) : null}
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing.sm,
  },
  hint: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  deleteOutlineBtn: {
    borderColor: colors.error,
  },
});
