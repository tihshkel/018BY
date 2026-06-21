import React from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';

import { AppBottomSheet, AppButton, AppText } from '@/components/ui';
import { colors, createShadow, radii, spacing } from '@/constants/design-tokens';

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

function ProjectActionButtons({
  step,
  onRequestClose,
  onEdit,
  onDelete,
  onDeleteConfirm,
  onDeleteConfirmCancel,
}: Omit<ProjectActionSheetProps, 'visible' | 'projectTitle'>) {
  const isConfirm = step === 'confirmDelete';

  if (isConfirm) {
    return (
      <View style={styles.footer}>
        <AppButton title="Удалить" onPress={onDeleteConfirm} />
        <AppButton title="Отмена" variant="ghost" onPress={onDeleteConfirmCancel} />
      </View>
    );
  }

  return (
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
  );
}

function AndroidProjectActionModal({
  visible,
  projectTitle,
  step,
  onRequestClose,
  ...buttonProps
}: ProjectActionSheetProps) {
  const isConfirm = step === 'confirmDelete';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={styles.androidOverlay}>
        <View style={styles.androidContent}>
          <AppText variant="title" style={styles.androidTitle}>
            {isConfirm ? 'Удалить проект?' : projectTitle}
          </AppText>
          <AppText variant="bodySm" style={styles.androidSubtitle}>
            {isConfirm
              ? `Проект «${projectTitle}» будет удалён без возможности восстановления.`
              : 'Выберите действие'}
          </AppText>
          {isConfirm ? (
            <AppText variant="bodySm" style={styles.hint}>
              Это действие нельзя отменить.
            </AppText>
          ) : null}
          <ProjectActionButtons step={step} onRequestClose={onRequestClose} {...buttonProps} />
        </View>
      </View>
    </Modal>
  );
}

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
  const buttonProps = {
    step,
    onRequestClose,
    onEdit,
    onDelete,
    onDeleteConfirm,
    onDeleteConfirmCancel,
  };

  if (Platform.OS === 'android') {
    return (
      <AndroidProjectActionModal
        visible={visible}
        projectTitle={projectTitle}
        {...buttonProps}
      />
    );
  }

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
      footer={<ProjectActionButtons {...buttonProps} />}
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
  androidOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  androidContent: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 320,
    gap: spacing.sm,
    ...createShadow('lg'),
  },
  androidTitle: {
    textAlign: 'center',
  },
  androidSubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
});
