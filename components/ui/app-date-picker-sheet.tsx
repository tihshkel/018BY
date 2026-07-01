import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppBottomSheet } from '@/components/ui/app-bottom-sheet';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing } from '@/constants/design-tokens';
import { clampDateToBounds } from '@/utils/albumDateFormat';

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

function formatInlineDateLabel(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function openAndroidDatePicker({
  value,
  minimumDate,
  maximumDate,
  onChange,
}: {
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onChange: (date: Date) => void;
}) {
  DateTimePickerAndroid.open({
    value,
    mode: 'date',
    display: 'calendar',
    minimumDate,
    maximumDate,
    onChange: (event, date) => {
      if (event.type === 'dismissed' || !date) return;
      onChange(clampDateToBounds(date, minimumDate, maximumDate));
    },
  });
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
      setDraft(clampDateToBounds(value, minimumDate, maximumDate));
      setAndroidStep('date');
    }
  }, [visible, value, minimumDate, maximumDate]);

  const safeValue = useMemo(
    () => clampDateToBounds(value, minimumDate, maximumDate),
    [value, minimumDate, maximumDate],
  );
  const safeDraft = useMemo(
    () => clampDateToBounds(draft, minimumDate, maximumDate),
    [draft, minimumDate, maximumDate],
  );

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
        value={safeValue}
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
          value={safeDraft}
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
        value={safeDraft}
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
      footer={<AppButton title="Готово" onPress={handleDone} />}
    >
      <View style={styles.pickerWrap}>
        <DateTimePicker
          value={safeDraft}
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

function AndroidInlineDatePicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
  visible = true,
}: AppInlineDatePickerProps) {
  const safeValue = useMemo(
    () => clampDateToBounds(value, minimumDate, maximumDate),
    [value, minimumDate, maximumDate],
  );
  const autoOpenedRef = useRef(false);

  const openPicker = useCallback(() => {
    openAndroidDatePicker({
      value: safeValue,
      minimumDate,
      maximumDate,
      onChange,
    });
  }, [safeValue, minimumDate, maximumDate, onChange]);

  useEffect(() => {
    if (!visible) {
      autoOpenedRef.current = false;
      void DateTimePickerAndroid.dismiss('date');
      return;
    }

    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;

    const timer = setTimeout(() => {
      openPicker();
    }, 400);

    return () => clearTimeout(timer);
  }, [visible, openPicker]);

  if (!visible) return null;

  return (
    <Pressable
      style={styles.androidInlineButton}
      onPress={openPicker}
      accessibilityRole="button"
      accessibilityLabel="Выбрать дату"
    >
      <Ionicons name="calendar-outline" size={24} color={colors.primary} />
      <View style={styles.androidInlineTextWrap}>
        <AppText variant="body" style={styles.androidInlineDate}>
          {formatInlineDateLabel(safeValue)}
        </AppText>
        <AppText variant="caption" style={styles.androidInlineHint}>
          Нажмите, чтобы изменить дату
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
    </Pressable>
  );
}

function IosInlineDatePicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
}: AppInlineDatePickerProps) {
  const safeValue = useMemo(
    () => clampDateToBounds(value, minimumDate, maximumDate),
    [value, minimumDate, maximumDate],
  );

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date && event.type !== 'dismissed') {
      onChange(date);
    }
  };

  return (
    <View style={styles.inlineContainer}>
      <DateTimePicker
        value={safeValue}
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

export function AppInlineDatePicker(props: AppInlineDatePickerProps) {
  const { visible = true } = props;

  if (!visible) return null;

  if (Platform.OS === 'android') {
    return <AndroidInlineDatePicker {...props} visible={visible} />;
  }

  return <IosInlineDatePicker {...props} />;
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
  androidInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
  },
  androidInlineTextWrap: {
    flex: 1,
    gap: 4,
  },
  androidInlineDate: {
    color: colors.textPrimary,
  },
  androidInlineHint: {
    color: colors.textSecondary,
  },
});
