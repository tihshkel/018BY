import type { Annotation } from '@/components/pdf-annotations';
import { getContinuationGroupSlots } from '@/utils/templateLineText';
import {
  findAnnotationForContinuationGroup,
  findAnnotationForSlot,
  getLineSlotGroups,
  type TextLineSlot,
} from '@/utils/textLineSlots';

export type TemplateLineFieldAnnotation = Pick<
  Annotation,
  'type' | 'page' | 'templateLineStart' | 'content'
>;

export type TemplateLineFieldTarget = {
  page: number;
  startSlotIndex: number;
  continuationGroup: number;
  isEmpty: boolean;
};

export type TemplateLineFieldNavigationState = {
  canGoBack: boolean;
  canGoNext: boolean;
  nextWouldDismiss: boolean;
};

export function isFieldEmpty(
  annotations: TemplateLineFieldAnnotation[],
  page: number,
  slots: TextLineSlot[],
  startSlotIndex: number
): boolean {
  const { groupSlots } = getContinuationGroupSlots(slots, startSlotIndex);

  for (const slot of groupSlots) {
    const segment = findAnnotationForSlot(
      annotations as Annotation[],
      page,
      slot.index
    );
    if (segment?.content?.trim()) return false;
  }

  const groupAnnotation = findAnnotationForContinuationGroup(
    annotations as Annotation[],
    page,
    slots,
    startSlotIndex
  );
  if (groupAnnotation?.content?.trim()) return false;

  return true;
}

export function getPageFieldTargets(
  slots: TextLineSlot[],
  annotations: TemplateLineFieldAnnotation[],
  page: number,
  liveFieldOverride?: { startSlotIndex: number; isEmpty: boolean }
): TemplateLineFieldTarget[] {
  const groups = getLineSlotGroups(slots);
  const targets: TemplateLineFieldTarget[] = [];

  for (const groupSlots of groups) {
    if (groupSlots.length === 0) continue;

    const startSlotIndex = groupSlots[0]!.index;
    const isEmpty =
      liveFieldOverride?.startSlotIndex === startSlotIndex
        ? liveFieldOverride.isEmpty
        : isFieldEmpty(annotations, page, slots, startSlotIndex);

    targets.push({
      page,
      startSlotIndex,
      continuationGroup: groupSlots[0]!.continuationGroup,
      isEmpty,
    });
  }

  return targets.sort((a, b) => a.startSlotIndex - b.startSlotIndex);
}

export function getAlbumFieldTargets(
  totalPages: number,
  getSlotsForPage: (page: number) => TextLineSlot[],
  annotations: TemplateLineFieldAnnotation[],
  liveFieldOverride?: { page: number; startSlotIndex: number; isEmpty: boolean }
): TemplateLineFieldTarget[] {
  const targets: TemplateLineFieldTarget[] = [];

  for (let page = 1; page <= totalPages; page += 1) {
    const slots = getSlotsForPage(page);
    if (slots.length === 0) continue;

    const pageTargets = getPageFieldTargets(
      slots,
      annotations,
      page,
      liveFieldOverride?.page === page
        ? {
            startSlotIndex: liveFieldOverride.startSlotIndex,
            isEmpty: liveFieldOverride.isEmpty,
          }
        : undefined
    );
    targets.push(...pageTargets);
  }

  return targets.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return a.startSlotIndex - b.startSlotIndex;
  });
}

function resolveCurrentFieldIndex(
  targets: TemplateLineFieldTarget[],
  currentPage: number,
  currentStartSlotIndex: number
): number {
  return targets.findIndex(
    (target) => target.page === currentPage && target.startSlotIndex === currentStartSlotIndex
  );
}

export function findNextEmptyFieldTarget(
  targets: TemplateLineFieldTarget[],
  currentPage: number,
  currentStartSlotIndex: number
): TemplateLineFieldTarget | null {
  const currentIndex = resolveCurrentFieldIndex(targets, currentPage, currentStartSlotIndex);
  if (currentIndex < 0) {
    return targets.find((target) => target.isEmpty) ?? null;
  }

  for (let index = currentIndex + 1; index < targets.length; index += 1) {
    if (targets[index]!.isEmpty) {
      return targets[index]!;
    }
  }

  return null;
}

export function findPreviousFieldTarget(
  targets: TemplateLineFieldTarget[],
  currentPage: number,
  currentStartSlotIndex: number
): TemplateLineFieldTarget | null {
  const currentIndex = resolveCurrentFieldIndex(targets, currentPage, currentStartSlotIndex);
  if (currentIndex <= 0) return null;
  return targets[currentIndex - 1] ?? null;
}

export function getFieldNavigationState(
  targets: TemplateLineFieldTarget[],
  currentPage: number,
  currentStartSlotIndex: number
): TemplateLineFieldNavigationState {
  const currentIndex = resolveCurrentFieldIndex(targets, currentPage, currentStartSlotIndex);
  const nextEmpty = findNextEmptyFieldTarget(targets, currentPage, currentStartSlotIndex);

  return {
    canGoBack: currentIndex > 0,
    canGoNext: nextEmpty != null || currentIndex < targets.length - 1,
    nextWouldDismiss: nextEmpty == null,
  };
}

export function getPageFieldNavigationState(
  slots: TextLineSlot[],
  annotations: TemplateLineFieldAnnotation[],
  page: number,
  currentStartSlotIndex: number,
  liveFieldOverride?: { startSlotIndex: number; isEmpty: boolean }
): TemplateLineFieldNavigationState {
  const targets = getPageFieldTargets(slots, annotations, page, liveFieldOverride);
  return getFieldNavigationState(targets, page, currentStartSlotIndex);
}
