import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AndroidInlineCalendar } from '@/components/ui/android-inline-calendar';
import { AppBottomSheet } from '@/components/ui/app-bottom-sheet';
import { AppButton } from '@/components/ui/app-button';
import { colors, radii, spacing } from '@/constants/design-tokens';

export type AppDatePickerMode = 'date' | 'datetime' | 'time';

export interface AppDatePickerSheetProps {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  mode?: AppDatePickerMode;
  minimumDate?: Date;
  maximumDate?: Date;
  title?: string;
}

export function AppDatePickerSheet({
  visible,
  value,
  onChange,
  onClose,
  mode = 'date',
  minimumDate,
  maximumDate,
  title = 'Выберите дату',
}: AppDatePickerSheetProps) {
  const [draft, setDraft] = useState(value);
  const [androidStep, setAndroidStep] = useState<'date' | 'time'>('date');

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setAndroidStep('date');
    }
  }, [visible, value]);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed' || !date) return;

    if (Platform.OS === 'android' && mode === 'datetime' && androidStep === 'time') {
      setDraft((prev) => {
        const next = new Date(prev);
        next.setHours(date.getHours(), date.getMinutes(), 0, 0);
        return next;
      });
      return;
    }

    setDraft(date);
  };

  const handleDone = () => {
    onChange(draft);
    onClose();
  };

  const showInlineDate =
    mode === 'date' ||
    (Platform.OS === 'android' && mode === 'datetime' && androidStep === 'date');

  const pickerMode =
    Platform.OS === 'android' && mode === 'datetime' && androidStep === 'time'
      ? 'time'
      : mode === 'datetime'
        ? 'datetime'
        : 'time';

  const footer =
    Platform.OS === 'android' && mode === 'datetime' && androidStep === 'date' ? (
      <AppButton title="Далее" onPress={() => setAndroidStep('time')} />
    ) : (
      <AppButton title="Готово" onPress={handleDone} />
    );

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      scroll={false}
      footer={footer}
    >
      <View style={styles.pickerWrap}>
        {showInlineDate ? (
          <AppInlineDatePicker
            value={draft}
            onChange={setDraft}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        ) : (
          <DateTimePicker
            value={draft}
            mode={pickerMode}
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handleChange}
            locale="ru-RU"
            themeVariant={'light' as const}
            accentColor={colors.primary}
            textColor={colors.textPrimary}
          />
        )}
      </View>
    </AppBottomSheet>
  );
}

export interface AppInlineDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  visible?: boolean;
}

export function AppInlineDatePicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
  visible = true,
}: AppInlineDatePickerProps) {
  if (!visible) return null;

  if (Platform.OS === 'android') {
    return (
      <View style={styles.inlineContainer}>
        <AndroidInlineCalendar
          value={value}
          onChange={onChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed' || !date) return;
    onChange(date);
  };

  return (
    <View style={styles.inlineContainer}>
      <DateTimePicker
        value={value}
        mode="date"
        display="inline"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={handleChange}
        locale="ru-RU"
        themeVariant={'light' as const}
        accentColor={colors.primary}
        textColor={colors.textPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pickerWrap: {
    alignItems: 'stretch',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  inlineContainer: {
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...(Platform.OS === 'android' ? { minHeight: 320 } : null),
  },
});
