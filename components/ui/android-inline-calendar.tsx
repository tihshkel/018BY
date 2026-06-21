import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const;

export interface AndroidInlineCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthStart(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const next = new Date(year, month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

function isDayDisabled(
  day: Date,
  minimumDate?: Date,
  maximumDate?: Date
): boolean {
  const normalized = stripTime(day);
  if (minimumDate && normalized < stripTime(minimumDate)) return true;
  if (maximumDate && normalized > stripTime(maximumDate)) return true;
  return false;
}

function isMonthNavDisabled(
  year: number,
  month: number,
  direction: -1 | 1,
  minimumDate?: Date,
  maximumDate?: Date
): boolean {
  const target = addMonths(year, month, direction);
  const start = monthStart(target.year, target.month);
  const end = new Date(target.year, target.month + 1, 0);

  if (minimumDate && end < stripTime(minimumDate)) return true;
  if (maximumDate && start > stripTime(maximumDate)) return true;
  return false;
}

export function AndroidInlineCalendar({
  value,
  onChange,
  minimumDate,
  maximumDate,
}: AndroidInlineCalendarProps) {
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  useEffect(() => {
    setViewYear(value.getFullYear());
    setViewMonth(value.getMonth());
  }, [value]);

  const today = useMemo(() => stripTime(new Date()), []);

  const weeks = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const cells: Array<Date | null> = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(viewYear, viewMonth, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const rows: Array<Array<Date | null>> = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [viewMonth, viewYear]);

  const goToMonth = (delta: -1 | 1) => {
    if (isMonthNavDisabled(viewYear, viewMonth, delta, minimumDate, maximumDate)) {
      return;
    }
    const next = addMonths(viewYear, viewMonth, delta);
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  const handleSelectDay = (day: Date) => {
    if (isDayDisabled(day, minimumDate, maximumDate)) return;
    onChange(day);
  };

  const canGoPrev = !isMonthNavDisabled(viewYear, viewMonth, -1, minimumDate, maximumDate);
  const canGoNext = !isMonthNavDisabled(viewYear, viewMonth, 1, minimumDate, maximumDate);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={() => goToMonth(-1)}
          disabled={!canGoPrev}
          style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Предыдущий месяц"
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={canGoPrev ? colors.textPrimary : colors.tabInactive}
          />
        </Pressable>

        <AppText variant="body" style={styles.monthTitle}>
          {MONTHS[viewMonth]} {viewYear}
        </AppText>

        <Pressable
          onPress={() => goToMonth(1)}
          disabled={!canGoNext}
          style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Следующий месяц"
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={canGoNext ? colors.textPrimary : colors.tabInactive}
          />
        </Pressable>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((label) => (
          <AppText key={label} variant="caption" style={styles.weekday}>
            {label}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((day, dayIndex) => {
              if (!day) {
                return <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.dayCell} />;
              }

              const selected = isSameDay(day, value);
              const isToday = isSameDay(day, today);
              const disabled = isDayDisabled(day, minimumDate, maximumDate);

              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => handleSelectDay(day)}
                  disabled={disabled}
                  style={styles.dayCell}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                  accessibilityLabel={day.toLocaleDateString('ru-RU')}
                >
                  <View
                    style={[
                      styles.dayInner,
                      isToday && !selected && styles.dayToday,
                      selected && styles.daySelected,
                      disabled && styles.dayDisabled,
                    ]}
                  >
                    <AppText
                      variant="body"
                      style={[
                        styles.dayText,
                        selected && styles.dayTextSelected,
                        disabled && styles.dayTextDisabled,
                      ]}
                    >
                      {day.getDate()}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  monthTitle: {
    fontFamily: sansFont('semibold'),
    color: colors.textPrimary,
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
    fontFamily: sansFont('medium'),
  },
  grid: {
    gap: 4,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayInner: {
    width: '100%',
    height: '100%',
    maxWidth: 40,
    maxHeight: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  daySelected: {
    backgroundColor: colors.primary,
  },
  dayDisabled: {
    opacity: 0.35,
  },
  dayText: {
    color: colors.textPrimary,
    fontFamily: sansFont('regular'),
  },
  dayTextSelected: {
    color: colors.white,
    fontFamily: sansFont('semibold'),
  },
  dayTextDisabled: {
    color: colors.textSecondary,
  },
});
