import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState, type RefObject } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { BlankPageThumbnail } from '@/components/album/blank-page-thumbnail';
import { PageListItem } from '@/components/album/page-list-item';
import { AppButton, AppCenterModal, AppInput, AppText } from '@/components/ui';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';
import type { AlbumPageSchema, PageInstance, PageStatus, PageValues } from '@/types/album-page-schema';
import type { SectionProgress } from '@/utils/albumProgress';
import { isBlankTemplateLineGuide } from '@/utils/photoPageTemplateManifest';

const VISIBLE_PAGE_LIMIT = 12;

type SectionPageRow = {
  instance: PageInstance;
  title: string;
  subtitle?: string;
  status: PageStatus;
  thumbnailUri?: string;
  schema?: AlbumPageSchema;
  pageValues?: PageValues;
  canShowMenu: boolean;
  canDuplicate: boolean;
  canDeleteCopy: boolean;
  canReorder: boolean;
  canChangeTemplate?: boolean;
  globalIndex: number;
};

type AlbumSectionAccordionProps = {
  sectionProgress: SectionProgress;
  pages: SectionPageRow[];
  pageColumnCount?: number;
  pageItemWidth?: number;
  pageGridGap?: number;
  onOpenPage: (instanceId: string) => void;
  onDuplicate?: (instanceId: string) => void;
  onDeleteCopy?: (instanceId: string, title: string) => void;
  onRename?: (instanceId: string, title: string) => void;
  onChangeTemplate?: (instanceId: string) => void;
  onMoveUp?: (instanceId: string) => void;
  onMoveDown?: (instanceId: string) => void;
  onReorderPage?: (instanceId: string, toIndex: number) => void;
  totalPages?: number;
  reorderDisabled?: boolean;
  onToggleExcluded?: (instanceId: string, excluded: boolean) => void;
  defaultExpanded?: boolean;
  highlightInstanceId?: string;
  onHighlightMeasured?: (y: number) => void;
  scrollContentRef?: RefObject<View | null>;
  /** false — не держать decoded PNG страниц, пока список не на экране. */
  showPageImages?: boolean;
};

export function AlbumSectionAccordion({
  sectionProgress,
  pages,
  pageColumnCount = 1,
  pageItemWidth,
  pageGridGap = spacing.sm,
  onOpenPage,
  onDuplicate,
  onDeleteCopy,
  onRename,
  onChangeTemplate,
  onMoveUp,
  onMoveDown,
  onReorderPage,
  totalPages = 0,
  reorderDisabled = false,
  onToggleExcluded,
  defaultExpanded = false,
  highlightInstanceId,
  onHighlightMeasured,
  scrollContentRef,
  showPageImages = true,
}: AlbumSectionAccordionProps) {
  const containsHighlight = highlightInstanceId
    ? pages.some((row) => row.instance.instanceId === highlightInstanceId)
    : false;
  const [expanded, setExpanded] = useState(defaultExpanded || containsHighlight);
  const [showAll, setShowAll] = useState(containsHighlight);
  const [renameModal, setRenameModal] = useState<{ instanceId: string; title: string } | null>(
    null
  );
  const [renameValue, setRenameValue] = useState('');

  const visiblePages = showAll || pages.length <= VISIBLE_PAGE_LIMIT
    ? pages
    : pages.slice(0, VISIBLE_PAGE_LIMIT);

  const openMenu = (row: SectionPageRow) => {
    const actions: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [];

    if (onDuplicate && row.canDuplicate) {
      actions.push({
        text: 'Дублировать',
        onPress: () => onDuplicate(row.instance.instanceId),
      });
    }
    if (onRename) {
      actions.push({
        text: 'Переименовать',
        onPress: () => {
          setRenameValue(row.title);
          setRenameModal({ instanceId: row.instance.instanceId, title: row.title });
        },
      });
    }
    if (onChangeTemplate && row.canChangeTemplate) {
      actions.push({
        text: 'Сменить шаблон',
        onPress: () => onChangeTemplate(row.instance.instanceId),
      });
    }
    if (onMoveUp && row.canReorder) {
      actions.push({
        text: 'Переместить выше',
        onPress: () => onMoveUp(row.instance.instanceId),
      });
    }
    if (onMoveDown && row.canReorder) {
      actions.push({
        text: 'Переместить ниже',
        onPress: () => onMoveDown(row.instance.instanceId),
      });
    }
    if (onToggleExcluded) {
      const excluded = row.status === 'excluded';
      actions.push({
        text: excluded ? 'Вернуть в альбом' : 'Не использовать в электронной версии',
        onPress: () => onToggleExcluded(row.instance.instanceId, !excluded),
      });
    }
    if (row.canDeleteCopy && onDeleteCopy) {
      actions.push({
        text: 'Удалить копию',
        style: 'destructive',
        onPress: () => onDeleteCopy(row.instance.instanceId, row.title),
      });
    }
    actions.push({ text: 'Отмена', style: 'cancel' });

    Alert.alert(row.title, 'Дополнительные действия', actions);
  };

  const progressWidth = `${sectionProgress.percent}%`;
  const usePageGrid = pageColumnCount > 1 && pageItemWidth != null;

  return (
    <View style={styles.section}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={styles.headerText}>
          <AppText variant="body" style={styles.sectionTitle}>
            {sectionProgress.title}
          </AppText>
          <AppText variant="caption" style={styles.sectionMeta}>
            Заполнено {sectionProgress.filledCount} из {sectionProgress.totalCount} ·{' '}
            {sectionProgress.percent}%
          </AppText>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth as `${number}%` }]} />
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.textSecondary}
        />
      </Pressable>

      {expanded ? (
        <View style={[styles.body, usePageGrid && styles.bodyGrid, usePageGrid && { gap: pageGridGap }]}>
          {visiblePages.map((row) => {
            const isHighlighted = row.instance.instanceId === highlightInstanceId;
            return (
            <HighlightedPageRow
              key={row.instance.instanceId}
              enabled={isHighlighted}
              scrollContentRef={scrollContentRef}
              onHighlightMeasured={onHighlightMeasured}
            >
            <View
              style={usePageGrid ? [styles.gridItem, { width: pageItemWidth }] : undefined}
            >
              <PageListItem
                pageNumber={row.instance.order}
                title={row.title}
                subtitle={row.subtitle}
                status={row.status}
                thumbnailUri={showPageImages ? row.thumbnailUri : undefined}
                thumbnailNode={
                  showPageImages &&
                  row.schema &&
                  row.pageValues &&
                  isBlankTemplateLineGuide(row.schema.lineGuideId) ? (
                    <BlankPageThumbnail
                      schema={row.schema}
                      values={row.pageValues}
                      status={row.status}
                      imageUri={row.thumbnailUri}
                    />
                  ) : undefined
                }
                onPress={() => onOpenPage(row.instance.instanceId)}
                onMenuPress={row.canShowMenu ? () => openMenu(row) : undefined}
                onChangeTemplate={
                  row.canChangeTemplate && onChangeTemplate
                    ? () => onChangeTemplate(row.instance.instanceId)
                    : undefined
                }
                canChangeTemplate={row.canChangeTemplate}
                showChevron
                compact={usePageGrid}
                canReorder={row.canReorder}
                itemIndex={row.globalIndex}
                itemsCount={totalPages}
                onReorder={
                  row.canReorder && onReorderPage
                    ? (toIndex) => onReorderPage(row.instance.instanceId, toIndex)
                    : undefined
                }
                reorderDisabled={reorderDisabled}
                isHighlighted={isHighlighted}
              />
            </View>
            </HighlightedPageRow>
            );
          })}

          {!showAll && pages.length > VISIBLE_PAGE_LIMIT ? (
            <Pressable
              onPress={() => setShowAll(true)}
              style={({ pressed }) => [
                styles.showAll,
                usePageGrid && styles.showAllFullWidth,
                pressed && styles.showAllPressed,
              ]}
            >
              <AppText variant="caption" style={styles.showAllText}>
                Показать все {pages.length} страниц
              </AppText>
              <Ionicons name="chevron-down" size={16} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <AppCenterModal
        visible={!!renameModal}
        onClose={() => setRenameModal(null)}
        title="Переименовать страницу"
        footer={
          <View style={styles.modalActions}>
            <AppButton
              title="Отмена"
              variant="outline"
              onPress={() => setRenameModal(null)}
              style={styles.modalBtn}
            />
            <AppButton
              title="Сохранить"
              onPress={() => {
                if (renameModal && onRename) {
                  onRename(renameModal.instanceId, renameValue);
                }
                setRenameModal(null);
              }}
              style={styles.modalBtn}
            />
          </View>
        }
      >
        <AppInput
          value={renameValue}
          onChangeText={setRenameValue}
          placeholder="Название страницы"
          autoFocus
        />
      </AppCenterModal>
    </View>
  );
}

function HighlightedPageRow({
  children,
  enabled,
  scrollContentRef,
  onHighlightMeasured,
}: {
  children: React.ReactNode;
  enabled: boolean;
  scrollContentRef?: RefObject<View | null>;
  onHighlightMeasured?: (y: number) => void;
}) {
  const rowRef = useRef<View>(null);

  useEffect(() => {
    if (!enabled || !scrollContentRef?.current || !onHighlightMeasured) return;
    const timer = setTimeout(() => {
      rowRef.current?.measureLayout(
        scrollContentRef.current as View,
        (_x, y) => onHighlightMeasured(y),
        () => {},
      );
    }, 280);
    return () => clearTimeout(timer);
  }, [enabled, onHighlightMeasured, scrollContentRef]);

  if (!enabled) {
    return <>{children}</>;
  }

  return <View ref={rowRef}>{children}</View>;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerPressed: {
    opacity: 0.92,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontFamily: sansFont('semibold'),
    fontWeight: '600',
  },
  sectionMeta: {
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primarySurface,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  body: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  bodyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    marginBottom: 0,
  },
  showAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  showAllFullWidth: {
    width: '100%',
    flexBasis: '100%',
  },
  showAllPressed: {
    opacity: 0.85,
  },
  showAllText: {
    color: colors.primary,
    fontFamily: sansFont('medium'),
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
});
