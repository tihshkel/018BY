/**
 * Mood radio circle fills for diary MyDay pages.
 * Brown: 6 smiley rings — one per form option.
 * Purple A5: 9 smiley rings on the page — form options match all 9 left→right.
 */

const BROWN_MOOD_OPTIONS = ['😢', '😕', '😐', '🙂', '😄', '🥰'];

/** Left→right stickers on purple «Твой день» page art. */
const PURPLE_MOOD_OPTIONS = ['🙂', '😢', '😐', '😊', '😄', '😅', '😠', '😕', '😆'];

/** @deprecated use BROWN_MOOD_OPTIONS / PURPLE_MOOD_OPTIONS */
const MOOD_OPTIONS = BROWN_MOOD_OPTIONS;

const BROWN_MOOD_FILL = '#E8B4A0';
/** Pink fill matching purple «Твой день» accents (gratitude bar). */
const PURPLE_MOOD_FILL = '#E8B4A0';

/**
 * Mood fills sit under the printed stroke: diameter = outer ring, bleed < 1
 * so the ink border stays visible around the fill.
 * Align nudge is applied in mapMoodCircleFillToViewport (not here).
 */
const MOOD_DIAMETER_BLEED = 0.98;

/** cx, cy, diameter — normalized 0–1, ring centers from PNG mid-line bbox. */
const BROWN_MOOD_CIRCLE_COORDS = [
  { cx: 0.3557, cy: 0.6071, diameter: 0.0435 },
  { cx: 0.4249, cy: 0.6083, diameter: 0.0437 },
  { cx: 0.4928, cy: 0.6104, diameter: 0.0421 },
  { cx: 0.5643, cy: 0.6086, diameter: 0.0421 },
  { cx: 0.6359, cy: 0.6071, diameter: 0.0424 },
  { cx: 0.7063, cy: 0.6084, diameter: 0.0431 },
];

/** All 9 purple rings (PNG page_009 @ 2219×2927) — outer stroke bbox. */
const PURPLE_MOOD_CIRCLE_COORDS = [
  { cx: 0.1359, cy: 0.6105, diameter: 0.0412 },
  { cx: 0.2003, cy: 0.6110, diameter: 0.0410 },
  { cx: 0.2636, cy: 0.6107, diameter: 0.0408 },
  { cx: 0.3279, cy: 0.6107, diameter: 0.0401 },
  { cx: 0.3914, cy: 0.6109, diameter: 0.0412 },
  { cx: 0.4581, cy: 0.6104, diameter: 0.0410 },
  { cx: 0.5228, cy: 0.6104, diameter: 0.0403 },
  { cx: 0.5886, cy: 0.6109, diameter: 0.0406 },
  { cx: 0.6604, cy: 0.6105, diameter: 0.0412 },
];

const BROWN_MY_DAY_PAGES = [
  16, 20, 23, 25, 28, 33, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
];

const PURPLE_MY_DAY_PAGES = [9, 11, 13, 15, 17, 19, 23, 34, 35, 36, 37, 38, 39];

function moodOptionsForAlbum(lineGuideId) {
  return lineGuideId === 'diary_interior_purple'
    ? PURPLE_MOOD_OPTIONS
    : BROWN_MOOD_OPTIONS;
}

function moodCircleCoordsForAlbum(lineGuideId) {
  return lineGuideId === 'diary_interior_purple'
    ? PURPLE_MOOD_CIRCLE_COORDS
    : BROWN_MOOD_CIRCLE_COORDS;
}

function buildMoodFillsForPage(lineGuideId, pageNumber, fillColor) {
  const fieldId = `${lineGuideId}_p${pageNumber}_mood`;
  const coords = moodCircleCoordsForAlbum(lineGuideId);
  const options = moodOptionsForAlbum(lineGuideId);

  return options.map((option, index) => {
    const coord = coords[index];
    return {
      id: `${lineGuideId}_p${pageNumber}_mood_${index}`,
      fieldId,
      option,
      fillColor,
      fillOpacity: 0.55,
      diameterBleed: MOOD_DIAMETER_BLEED,
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
  BROWN_MOOD_OPTIONS,
  PURPLE_MOOD_OPTIONS,
  BROWN_MOOD_CIRCLE_COORDS,
  PURPLE_MOOD_CIRCLE_COORDS,
  BROWN_MY_DAY_PAGES,
  PURPLE_MY_DAY_PAGES,
  moodOptionsForAlbum,
  buildMoodFillsForPage,
  buildDiaryMoodOptionFillsManifest,
};
