import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppBottomSheet,
  AppButton,
  AppInlineDatePicker,
  AppText,
} from '@/components/ui';
import { colors, radii, spacing } from '@/constants/design-tokens';

export function getAlbumCategoryDateBounds(isPastDateAllowed: boolean) {
  if (isPastDateAllowed) {
    const minimumDate = new Date();
    minimumDate.setFullYear(minimumDate.getFullYear() - 100);
    return { minimumDate, maximumDate: new Date() };
  }

  return {
    minimumDate: new Date(),
    maximumDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
  };
}

type AlbumDateSheetProps = {
  visible: boolean;
  title: string;
  description: string;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  onConfirm: () => void;
  isSaving?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function AlbumDateSheet({
  visible,
  title,
  description,
  value,
  onChange,
  onClose,
  onConfirm,
  isSaving = false,
  minimumDate,
  maximumDate,
}: AlbumDateSheetProps) {
  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={description}
      scroll={false}
      footer={
        <View style={styles.footer}>
          <AppButton
            title="Отмена"
            variant="outline"
            onPress={onClose}
            disabled={isSaving}
            fullWidth={false}
            style={styles.footerBtn}
          />
          <AppButton
            testID="cover-date-confirm"
            title={isSaving ? 'Сохраняем…' : 'Продолжить'}
            onPress={onConfirm}
            loading={isSaving}
            disabled={isSaving}
            fullWidth={false}
            style={styles.footerBtn}
          />
        </View>
      }
    >
      <View style={styles.pickerWrap}>
        <AppInlineDatePicker
          visible={visible}
          value={value}
          onChange={onChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      </View>
      <AppText variant="caption" style={styles.hint}>
        Дата используется для напоминаний и рекомендаций в приложении.
      </AppText>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  pickerWrap: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  hint: {
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerBtn: {
    flex: 1,
  },
});
