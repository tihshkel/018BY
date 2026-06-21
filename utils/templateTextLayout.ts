import type { ContentRect } from '@/utils/imageContentRect';
import { mapSourceNormToViewport } from '@/utils/imageContentRect';
import type { TemplateFrame } from '@/utils/photoPageTemplateManifest';

export function mapTemplateFrameToViewport(
  frame: TemplateFrame,
  contentRect: ContentRect,
): { x: number; y: number; width: number; height: number } {
  return mapSourceNormToViewport(frame.x, frame.y, frame.w, frame.h, contentRect);
}

export function estimateTemplateFontSize(frameHeight: number, viewportHeight: number): number {
  const pxHeight = frameHeight * viewportHeight;
  return Math.max(12, Math.min(22, Math.round(pxHeight * 0.55)));
}
