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
      startSlotIndex,
      continuationGroup: groupSlots[0]!.continuationGroup,
      isEmpty,
    });
  }

  return targets.sort((a, b) => a.startSlotIndex - b.startSlotIndex);
}

function resolveCurrentFieldIndex(
  targets: TemplateLineFieldTarget[],
  currentStartSlotIndex: number
): number {
  return targets.findIndex((target) => target.startSlotIndex === currentStartSlotIndex);
}

export function findNextEmptyFieldTarget(
  targets: TemplateLineFieldTarget[],
  currentStartSlotIndex: number
): TemplateLineFieldTarget | null {
  const currentIndex = resolveCurrentFieldIndex(targets, currentStartSlotIndex);
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
  currentStartSlotIndex: number
): TemplateLineFieldTarget | null {
  const currentIndex = resolveCurrentFieldIndex(targets, currentStartSlotIndex);
  if (currentIndex <= 0) return null;
  return targets[currentIndex - 1] ?? null;
}

export function getFieldNavigationState(
  slots: TextLineSlot[],
  annotations: TemplateLineFieldAnnotation[],
  page: number,
  currentStartSlotIndex: number,
  liveFieldOverride?: { startSlotIndex: number; isEmpty: boolean }
): TemplateLineFieldNavigationState {
  const targets = getPageFieldTargets(slots, annotations, page, liveFieldOverride);
  const currentIndex = resolveCurrentFieldIndex(targets, currentStartSlotIndex);
  const nextEmpty = findNextEmptyFieldTarget(targets, currentStartSlotIndex);

  return {
    canGoBack: currentIndex > 0,
    canGoNext: targets.length > 0,
    nextWouldDismiss: nextEmpty == null,
  };
}
