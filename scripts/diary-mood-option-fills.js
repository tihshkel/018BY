/**
 * Mood radio circle fills for diary MyDay pages.
 * Purple A5: 9 smiley rings on PDF; MOOD_OPTIONS map to the middle 6 (indices 2–7).
 * Brown: 6 smiley rings — one per option.
 */

const MOOD_OPTIONS = ['😢', '😕', '😐', '🙂', '😄', '🥰'];

const BROWN_MOOD_FILL = '#E8B4A0';
const PURPLE_MOOD_FILL = '#D4B8E8';

/** cx, cy, diameter — normalized 0–1, ring centers from PDF vector detection. */
const BROWN_MOOD_CIRCLE_COORDS = [
  { cx: 0.3557, cy: 0.6071, diameter: 0.0435 },
  { cx: 0.4249, cy: 0.6083, diameter: 0.0437 },
  { cx: 0.4928, cy: 0.6104, diameter: 0.0421 },
  { cx: 0.5643, cy: 0.6086, diameter: 0.0421 },
  { cx: 0.6359, cy: 0.6071, diameter: 0.0424 },
  { cx: 0.7063, cy: 0.6084, diameter: 0.0431 },
];

/** Purple «Твой день»: 9 rings; options use indices 2–7 (skip 2 left + 1 right decorative). */
const PURPLE_MOOD_CIRCLE_COORDS = [
  { cx: 0.265, cy: 0.61, diameter: 0.0403 },
  { cx: 0.329, cy: 0.611, diameter: 0.0405 },
  { cx: 0.3918, cy: 0.6131, diameter: 0.039 },
  { cx: 0.4579, cy: 0.6113, diameter: 0.0391 },
  { cx: 0.5241, cy: 0.6099, diameter: 0.0393 },
  { cx: 0.5892, cy: 0.6112, diameter: 0.04 },
];

const BROWN_MY_DAY_PAGES = [
  16, 20, 23, 25, 28, 33, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
];

const PURPLE_MY_DAY_PAGES = [9, 11, 13, 15, 17, 19, 23, 34, 35, 36, 37, 38, 39];

function moodCircleCoordsForAlbum(lineGuideId) {
  return lineGuideId === 'diary_interior_purple'
    ? PURPLE_MOOD_CIRCLE_COORDS
    : BROWN_MOOD_CIRCLE_COORDS;
}

function buildMoodFillsForPage(lineGuideId, pageNumber, fillColor) {
  const fieldId = `${lineGuideId}_p${pageNumber}_mood`;
  const coords = moodCircleCoordsForAlbum(lineGuideId);

  return MOOD_OPTIONS.map((option, index) => {
    const coord = coords[index];
    return {
      id: `${lineGuideId}_p${pageNumber}_mood_${index}`,
      fieldId,
      option,
      fillColor,
      fillOpacity: 0.5,
      diameterBleed: 1,
      cx: coord.cx,
      cy: coord.cy,
      diameter: coord.diameter,
    };
  });
}

function buildDiaryMoodOptionFillsManifest() {
  const manifest = {};

  for (const page of BROWN_MY_DAY_PAGES) {
    manifest.diary_interior_brown = manifest.diary_interior_brown ?? {};
    manifest.diary_interior_brown[String(page)] = {
      optionFills: buildMoodFillsForPage('diary_interior_brown', page, BROWN_MOOD_FILL),
    };
  }

  for (const page of PURPLE_MY_DAY_PAGES) {
    manifest.diary_interior_purple = manifest.diary_interior_purple ?? {};
    manifest.diary_interior_purple[String(page)] = {
      optionFills: buildMoodFillsForPage('diary_interior_purple', page, PURPLE_MOOD_FILL),
    };
  }

  return manifest;
}

module.exports = {
  MOOD_OPTIONS,
  BROWN_MOOD_CIRCLE_COORDS,
  PURPLE_MOOD_CIRCLE_COORDS,
  BROWN_MY_DAY_PAGES,
  PURPLE_MY_DAY_PAGES,
  buildMoodFillsForPage,
  buildDiaryMoodOptionFillsManifest,
};
