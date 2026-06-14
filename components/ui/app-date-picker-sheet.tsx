import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

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
    if (event.type === 'dismissed') {
      if (Platform.OS === 'android') {
        onClose();
        setAndroidStep('date');
      }
      return;
    }
    if (!date) return;

    if (Platform.OS === 'android' && mode === 'datetime') {
      if (androidStep === 'date') {
        setDraft((prev) => {
          const next = new Date(date);
          next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
          return next;
        });
        setAndroidStep('time');
        return;
      }
      setDraft((prev) => {
        const next = new Date(prev);
        next.setHours(date.getHours(), date.getMinutes(), 0, 0);
        onChange(next);
        return next;
      });
      onClose();
      setAndroidStep('date');
      return;
    }

    if (Platform.OS === 'android') {
      onChange(date);
      onClose();
      return;
    }

    setDraft(date);
  };

  const handleDone = () => {
    onChange(draft);
    onClose();
  };

  if (Platform.OS === 'android' && visible && mode !== 'datetime') {
    const isTime = mode === 'time';
    return (
      <DateTimePicker
        value={value}
        mode={isTime ? 'time' : 'date'}
        display={isTime ? 'default' : 'calendar'}
        {...(!isTime ? { minimumDate, maximumDate } : {})}
        onChange={handleChange}
      />
    );
  }

  if (Platform.OS === 'android' && visible && mode === 'datetime') {
    if (androidStep === 'date') {
      return (
        <DateTimePicker
          key="android-date"
          value={draft}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      );
    }
    return (
      <DateTimePicker
        key="android-time"
        value={draft}
        mode="time"
        display="default"
        onChange={handleChange}
      />
    );
  }

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      scroll={false}
      footer={
        <AppButton title="Готово" onPress={handleDone} />
      }
    >
      <View style={styles.pickerWrap}>
        <DateTimePicker
          value={draft}
          mode={mode === 'datetime' ? 'datetime' : mode === 'time' ? 'time' : 'date'}
          display={mode === 'date' ? 'inline' : 'spinner'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
          locale="ru-RU"
          themeVariant={'light' as const}
          accentColor={colors.primary}
          textColor={colors.textPrimary}
        />
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

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed' || !date) return;
      onChange(date);
      return;
    }
    if (date && event.type !== 'dismissed') {
      onChange(date);
    }
  };

  if (Platform.OS === 'android') {
    return (
      <View style={styles.inlineContainer}>
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      </View>
    );
  }

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
    alignItems: 'center',
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
  },
});
