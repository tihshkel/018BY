
import { LINE_GUIDES } from '@/constants/line-guides';

interface SnapYToNearestTemplateLineParams {
  lineGuideId?: string;
  page: number;
  y: number;
  viewportHeight: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getNearestNumber(params: { target: number; candidates: number[] }) {
  const { target, candidates } = params;

  if (candidates.length === 0) return target;

  let best = candidates[0];
  let bestDist = Math.abs(best - target);

  for (let i = 1; i < candidates.length; i += 1) {
    const next = candidates[i];
    const nextDist = Math.abs(next - target);
    if (nextDist < bestDist) {
      best = next;
      bestDist = nextDist;
    }
  }

  return best;
}

export function snapYToNearestTemplateLine(params: SnapYToNearestTemplateLineParams) {
  const { lineGuideId, page, y, viewportHeight } = params;

  if (!lineGuideId) return y;
  if (!isFiniteNumber(y)) return y;
  if (!isFiniteNumber(viewportHeight) || viewportHeight <= 0) return y;
  if (!isFiniteNumber(page) || page < 1) return y;

  const guideSet = (LINE_GUIDES as Record<string, Record<string, readonly number[]>>)[lineGuideId];
  if (!guideSet) return y;

  const normalizedLines = guideSet[String(page)];
  if (!normalizedLines || normalizedLines.length === 0) return y;

  const lineYs = normalizedLines
    .filter(isFiniteNumber)
    .map(value => value * viewportHeight)
    .filter(isFiniteNumber);

  if (lineYs.length === 0) return y;

  return getNearestNumber({ target: y, candidates: lineYs });
}

export function getTemplateTextLineMetrics(params: {
  lineGuideId?: string;
  page?: number | string;
  y: number;
  viewportHeight: number;
}) {
  const { lineGuideId, page, y, viewportHeight } = params;
  if (!lineGuideId) return null;
  if (!isFiniteNumber(y)) return null;
  if (!isFiniteNumber(viewportHeight) || viewportHeight <= 0) return null;
  if (typeof page !== 'number' || !isFiniteNumber(page) || page < 1) return null;

  const guideSet = (LINE_GUIDES as Record<string, Record<string, readonly number[]>>)[lineGuideId];
  if (!guideSet) return null;

  const normalizedLines = guideSet[String(page)];
  if (!normalizedLines || normalizedLines.length === 0) return null;

  const lineYs = normalizedLines
    .filter(isFiniteNumber)
    .map(value => value * viewportHeight)
    .filter(isFiniteNumber)
    .sort((a, b) => a - b);

  if (lineYs.length === 0) return null;

  // nearest line index
  let bestIndex = 0;
  let bestDist = Math.abs(lineYs[0] - y);
  for (let i = 1; i < lineYs.length; i += 1) {
    const dist = Math.abs(lineYs[i] - y);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  const snappedY = lineYs[bestIndex];
  const prev = bestIndex > 0 ? lineYs[bestIndex - 1] : null;
  const next = bestIndex < lineYs.length - 1 ? lineYs[bestIndex + 1] : null;

  let rawLineHeight: number | null = null;
  if (prev !== null && next !== null) rawLineHeight = (next - prev) / 2;
  else if (next !== null) rawLineHeight = next - snappedY;
  else if (prev !== null) rawLineHeight = snappedY - prev;

  const lineHeight =
    typeof rawLineHeight === 'number' && rawLineHeight > 0
      ? Math.min(Math.max(rawLineHeight, 10), 220)
      : null;

  return { snappedY, lineHeight };
}


