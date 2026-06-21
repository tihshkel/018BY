import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeSectionHeader } from '@/components/home/home-section-header';
import { AppButton, AppCard, AppHeader, AppScreen, AppText } from '@/components/ui';
import { requiresPrintSubscription } from '@/constants/subscription';
import { colors, radii, spacing, surfaces } from '@/constants/design-tokens';
import { useExportSubscription } from '@/contexts/export-subscription-context';
import { useAlbumProject } from '@/hooks/use-album-project';
import {
  getExportFormatOptions,
  getExportFormatSummaryNote,
  getExportReviewDownloadLabel,
  getExportReviewListHeading,
  type ExportFormatType,
} from '@/utils/exportFormatOptions';
import {
  buildElectronicExportFileName,
  buildExportSelection,
  getExportSelectionStorageKey,
  readChildNameFromProject,
} from '@/utils/exportPageSelection';
import { getPageStatusLabel } from '@/utils/pageStatus';
import {
  getTabletContentShell,
  getTabletSectionWrap,
  useResponsiveLayout,
} from '@/utils/responsive';

const FOOTER_CLEARANCE = 148;

function FormatIcon({
  type,
  selected,
}: {
  type: ExportFormatType;
  selected: boolean;
}) {
  const name =
    type === 'electronic'
      ? 'tablet-portrait-outline'
      : type === 'hard'
        ? 'book'
        : 'book-outline';

  return (
    <View style={[styles.formatIcon, selected && styles.formatIconSelected]}>
      <Ionicons
        name={name}
        size={20}
        color={selected ? colors.primary : colors.textPrimary}
      />
    </View>
  );
}

export default function ExportReviewScreen() {
  const { id, celebration, coverType, interiorType } = useLocalSearchParams<{
    id?: string;
    celebration?: string;
    coverType?: string;
    interiorType?: string;
  }>();

  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout(640);
  const shellStyle =
    getTabletContentShell(layout) ?? getTabletSectionWrap(layout, spacing.md);
  const { isSubscribed, isIapEnabled, priceLabel } = useExportSubscription();

  const [selectedFormat, setSelectedFormat] = useState<ExportFormatType>('electronic');

  const project = useAlbumProject({
    projectId: id,
    celebration,
    coverType,
    interiorType,
  });

  const formatOptions = useMemo(
    () => getExportFormatOptions(celebration),
    [celebration],
  );

  const selectedFormatOption = useMemo(
    () => formatOptions.find((option) => option.type === selectedFormat) ?? formatOptions[0],
    [formatOptions, selectedFormat],
  );

  const selection = useMemo(
    () =>
      buildExportSelection({
        instances: project.instances,
        pageValuesMap: project.pageValuesMap,
        getSchema: project.getSchemaForInstance,
        getTitle: project.getInstanceTitle,
      }),
    [project.instances, project.pageValuesMap, project],
  );

  const isPrintLocked =
    isIapEnabled &&
    requiresPrintSubscription(selectedFormat) &&
    !isSubscribed;

  const handleDownload = async () => {
    if (!project.projectId || !selectedFormatOption) return;

    await AsyncStorage.setItem(
      getExportSelectionStorageKey(project.projectId),
      JSON.stringify(selection.includedInstanceIds),
    );

    const baseParams = {
      id: project.projectId,
      celebration,
      coverType,
      interiorType,
    };

    if (selectedFormatOption.type === 'electronic') {
      router.push({
        pathname: '/export-pdf',
        params: {
          ...baseParams,
          mode: 'electronic',
          fileName: buildElectronicExportFileName(
            readChildNameFromProject(
              project.instances,
              project.pageValuesMap,
              project.lineGuideId,
            ),
          ),
        },
      } as unknown as Href);
      return;
    }

    router.push({
      pathname: '/export-pdf',
      params: {
        ...baseParams,
        format: selectedFormatOption.id,
      },
    } as unknown as Href);
  };

  if (project.isLoading) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <AppScreen edges={['top']} style={styles.screen}>
        <View style={shellStyle}>
          <AppHeader title="Экспорт альбома" showBack onBack={() => router.back()} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            shellStyle,
            { paddingBottom: spacing.lg + insets.bottom + FOOTER_CLEARANCE },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.intro}>
            <AppText variant="stepLabel">ФОРМАТ ЭКСПОРТА</AppText>
            <AppText variant="bodySm" style={styles.introText}>
              Выберите, как сохранить альбом — для просмотра на устройстве или для печати
            </AppText>
          </View>

          <View style={styles.section}>
            <HomeSectionHeader title="Формат альбома" />
            <View style={styles.formatList}>
              {formatOptions.map((option) => {
                const selected = option.type === selectedFormat;
                const isPremium = requiresPrintSubscription(option.type);
                const locked = isIapEnabled && isPremium && !isSubscribed;

                return (
                  <AppCard
                    key={option.id}
                    testID={`export-format-${option.type}`}
                    selected={selected}
                    onPress={() => setSelectedFormat(option.type)}
                    style={styles.formatCard}
                  >
                    <View style={styles.formatRow}>
                      <FormatIcon type={option.type} selected={selected} />
                      <View style={styles.formatText}>
                        <View style={styles.formatTitleRow}>
                          <AppText
                            variant="bodySm"
                            style={[styles.formatName, selected && styles.formatNameSelected]}
                          >
                            {option.name}
                          </AppText>
                          {isPremium ? (
                            <View style={styles.premiumBadge}>
                              <Ionicons
                                name={locked ? 'lock-closed' : 'star'}
                                size={11}
                                color={colors.primary}
                              />
                              <AppText variant="caption" style={styles.premiumBadgeText}>
                                {locked && priceLabel ? priceLabel : 'Премиум'}
                              </AppText>
                            </View>
                          ) : null}
                        </View>
                        <AppText variant="caption" style={styles.formatDescription}>
                          {option.description}
                        </AppText>
                        <AppText variant="caption" style={styles.formatMeta}>
                          {option.size} · {option.orientation}
                        </AppText>
                      </View>
                      <View
                        style={[
                          styles.formatRadio,
                          selected && styles.formatRadioSelected,
                        ]}
                      >
                        {selected ? <View style={styles.formatRadioDot} /> : null}
                      </View>
                    </View>
                  </AppCard>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <HomeSectionHeader title="Сводка" />
            <AppCard style={styles.summaryCard}>
              <AppText variant="bodySm" style={styles.summaryTitle}>
                Будет скачано: {selection.totalIncluded} страниц
              </AppText>
              <View style={styles.summaryStats}>
                <SummaryLine label="Заполнено полностью" value={selection.filledCount} />
                <SummaryLine label="Заполнено частично" value={selection.partialCount} />
                <SummaryLine label="Статичные страницы" value={selection.requiredCount} />
                <SummaryLine label="Исключено пользователем" value={selection.excludedCount} />
              </View>
              <View style={styles.summaryNote}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                <AppText variant="caption" style={styles.summaryNoteText}>
                  {getExportFormatSummaryNote(selectedFormat)}
                </AppText>
              </View>
            </AppCard>
          </View>

          <View style={styles.section}>
            <HomeSectionHeader title={getExportReviewListHeading(selectedFormat)} />
            <AppCard style={styles.pagesCard}>
              {selection.rows.map((row, index) => (
                <View
                  key={row.instanceId}
                  style={[
                    styles.pageRow,
                    index < selection.rows.length - 1 && styles.pageRowBorder,
                  ]}
                >
                  <Ionicons
                    name={
                      row.included
                        ? row.reason === 'required_static'
                          ? 'lock-closed'
                          : 'checkmark-circle'
                        : row.reason === 'excluded'
                          ? 'close-circle'
                          : 'ellipse-outline'
                    }
                    size={20}
                    color={
                      row.included
                        ? colors.statusFilled
                        : row.reason === 'excluded'
                          ? colors.statusExcluded
                          : colors.statusEmpty
                    }
                  />
                  <View style={styles.rowText}>
                    <AppText variant="bodySm">{row.title}</AppText>
                    <AppText variant="caption" style={styles.rowMeta}>
                      {row.included
                        ? row.reason === 'required_static'
                          ? row.status === 'locked'
                            ? 'без редактирования'
                            : 'обязательная страница'
                          : row.reason === 'partial'
                            ? 'частично заполнена'
                            : 'заполнена'
                        : row.reason === 'excluded'
                          ? 'не использовать'
                          : 'пустая, не войдёт в файл'}
                      {' · '}
                      {getPageStatusLabel(row.status)}
                    </AppText>
                  </View>
                  {row.reason === 'excluded' || (row.included && row.reason !== 'required_static') ? (
                    <Pressable
                      onPress={() =>
                        project.setPageExcluded(row.instanceId, row.reason !== 'excluded')
                      }
                      hitSlop={8}
                    >
                      <AppText variant="caption" style={styles.toggle}>
                        {row.reason === 'excluded' ? 'Вернуть' : 'Исключить'}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </AppCard>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, spacing.sm) },
          ]}
        >
          <View style={[styles.footerInner, shellStyle]}>
            {isPrintLocked ? (
              <AppText variant="caption" style={styles.paywallHint}>
                Для печати потребуется разовая покупка на следующем шаге
                {priceLabel ? ` (${priceLabel})` : ''}.
              </AppText>
            ) : null}
            <AppButton
              testID="export-start"
              title={getExportReviewDownloadLabel(selectedFormat)}
              onPress={() => void handleDownload()}
            />
            <AppButton title="Назад к альбому" variant="outline" onPress={() => router.back()} />
          </View>
        </View>
      </AppScreen>
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryLineRow}>
      <AppText variant="caption" style={styles.summaryLineLabel}>
        {label}
      </AppText>
      <AppText variant="caption" style={styles.summaryLineValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: surfaces.muted,
  },
  screen: {
    flex: 1,
    backgroundColor: surfaces.muted,
  },
  scroll: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  intro: {
    gap: 6,
  },
  introText: {
    color: colors.textSecondary,
    paddingRight: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  formatList: {
    gap: spacing.sm,
  },
  formatCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  formatIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: surfaces.muted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  formatIconSelected: {
    backgroundColor: colors.chipSelectedBg,
    borderColor: colors.primary,
  },
  formatText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  formatTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  formatName: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  formatNameSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  formatDescription: {
    color: colors.textSecondary,
  },
  formatMeta: {
    color: colors.placeholder,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.chipSelectedBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  premiumBadgeText: {
    color: colors.primary,
    fontWeight: '500',
  },
  formatRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  formatRadioSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  formatRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  summaryCard: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  summaryTitle: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryStats: {
    gap: 6,
  },
  summaryLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryLineLabel: {
    color: colors.textSecondary,
    flex: 1,
  },
  summaryLineValue: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  summaryNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  summaryNoteText: {
    flex: 1,
    color: colors.textSecondary,
  },
  pagesCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pageRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowMeta: {
    color: colors.textSecondary,
  },
  toggle: {
    color: colors.primary,
    fontWeight: '500',
  },
  paywallHint: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  footer: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  footerInner: {
    width: '100%',
    gap: spacing.sm,
  },
});
