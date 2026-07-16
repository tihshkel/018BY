#!/usr/bin/env node
/**
 * Regenerates scripts/diary-brown-slot-overrides-data.json from brown diary PDF.
 * Run: node scripts/build-diary-brown-slot-overrides.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const py = `import fitz, json
from pathlib import Path

pdf = fitz.open(${JSON.stringify(path.join(projectRoot, 'in albums/09.06.26_Блок коричневый _180х240_print.pdf'))})

def filter_label_tails(strokes, y_gap=0.038):
    filtered = []
    for stroke_y, sx, sw, sh in strokes:
        if sw < 0.35:
            wider_nearby = any(
                abs(other_y - stroke_y) < y_gap and ow > sw + 0.12
                for other_y, _, ow, _ in strokes
            )
            if wider_nearby:
                continue
        filtered.append((stroke_y, sx, sw, sh))
    return filtered

def questionnaire_slots(pnum, y_gap=0.038, y_min=0.12):
  page = pdf[pnum-1]
  W,H = page.rect.width, page.rect.height
  strokes = []
  for d in page.get_drawings():
    r = d['rect']
    w, h = r.width/W, (r.y1-r.y0)/H
    if w < 0.15 or h > 0.035:
      continue
    stroke_y = r.y1/H
    if stroke_y < y_min or stroke_y > 0.95:
      continue
    strokes.append((stroke_y, r.x0/W, w, max(h, 0.028)))
  strokes.sort()
  strokes = filter_label_tails(strokes, y_gap)
  rows = []
  for s in strokes:
    if not rows or s[0] - rows[-1][0][0] > y_gap:
      rows.append([s])
    else:
      rows[-1].append(s)
  slots = []
  for i, row in enumerate(rows):
    stroke_y, x, w, h = max(row, key=lambda t: (t[2], t[1]))
    slots.append({
      'x': round(x, 4),
      'y': round(stroke_y, 4),
      'width': round(w, 4),
      'height': round(h, 4),
      'hasLabel': False,
      'inputKind': 'block' if w > 0.62 else 'line',
      'continuationGroup': i + 1,
    })
  return slots

def diary_rules_slots():
    page = pdf[2]
    W, H = page.rect.width, page.rect.height
    candidates = []
    for d in page.get_drawings():
        r = d['rect']
        w = r.width / W
        h = (r.y1 - r.y0) / H
        stroke_y = r.y1 / H
        if w < 0.12 or w > 0.38 or h > 0.01 or stroke_y < 0.7 or stroke_y > 0.85:
            continue
        candidates.append((stroke_y, r.x0 / W, w))
    if candidates:
        stroke_y, x, w = min(candidates, key=lambda t: (t[1], -t[2]))
    else:
        stroke_y, x, w = 0.7644, 0.09, 0.3126
    return [{
        'x': round(x, 4),
        'y': round(stroke_y, 4),
        'width': round(w, 4),
        'height': 0.028,
        'hasLabel': False,
        'inputKind': 'line',
        'continuationGroup': 1,
    }]

def girl_profile_slots(pnum=6, y_min=0.225):
    all_rows = questionnaire_slots(pnum, y_gap=0.034, y_min=y_min)
    main = [s for s in all_rows if s['y'] <= 0.78]
    career = None
    page = pdf[pnum - 1]
    W, H = page.rect.width, page.rect.height
    for d in page.get_drawings():
        r = d['rect']
        w = r.width / W
        stroke_y = r.y1 / H
        if stroke_y < 0.755 or stroke_y > 0.795:
            continue
        if r.x0 / W < 0.65 or w < 0.08 or w > 0.2:
            continue
        career = {
            'x': round(r.x0 / W, 4),
            'y': round(stroke_y, 4),
            'width': round(w, 4),
            'height': 0.028,
        }
        break
    slots = list(main)
    if career and all(abs(career['y'] - s['y']) > 0.01 for s in slots):
        slots.append(career)
    slots = slots[:12]
    for i, s in enumerate(slots):
        s['continuationGroup'] = i + 1
        s['hasLabel'] = False
        s['inputKind'] = 'block' if s['width'] >= 0.62 else 'line'
    return slots

def grandparent_profile_slots(pnum):
    slots = questionnaire_slots(pnum, y_gap=0.034, y_min=0.24)
    filtered = []
    for s in slots:
        if s['width'] < 0.35:
            continue
        if s['x'] < 0.24 and s['width'] < 0.55:
            continue
        filtered.append(s)
    filtered = filtered[:9]
    for i, s in enumerate(filtered):
        s['continuationGroup'] = i + 1
        s['hasLabel'] = False
        s['inputKind'] = 'block' if s['width'] >= 0.62 else 'line'
    return filtered

def diary_owner_slots():
    return [{
        'x': 0.1761,
        'y': 0.5298,
        'width': 0.6484,
        'height': 0.028,
        'hasLabel': False,
        'inputKind': 'line',
        'continuationGroup': 1,
    }]

def parent_profile_slots(pnum):
  slots = questionnaire_slots(pnum, y_gap=0.034, y_min=0.20)
  if len(slots) >= 17:
    return slots[:12] + slots[13:17]
  if len(slots) >= 16:
    return slots[:16]
  return slots

def weekly_schedule_slots(pnum):
    """Day boxes: thin writing lines only, with left inset so text is not flush to the border."""
    page = pdf[pnum - 1]
    W, H = page.rect.width, page.rect.height
    LEFT_INSET = 0.042
    strokes = []
    for d in page.get_drawings():
        r = d['rect']
        w = r.width / W
        h = (r.y1 - r.y0) / H
        sy = r.y1 / H
        x = r.x0 / W
        if h > 0.005 or w < 0.35 or sy < 0.15 or sy > 0.93:
            continue
        strokes.append((sy, x, w))
    strokes = sorted(set(strokes))

    slots = []
    for i, (sy, x, w) in enumerate(strokes):
        x_in = round(x + LEFT_INSET, 4)
        w_in = round(max(0.2, min(w - LEFT_INSET, 0.98 - x_in)), 4)
        slots.append({
            'x': x_in,
            'y': round(sy, 4),
            'width': w_in,
            'height': 0.028,
            'hasLabel': False,
            'inputKind': 'line',
            'continuationGroup': i + 1,
        })
    return slots

def weekly_with_note_slots():
    slots = questionnaire_slots(37, y_gap=0.022, y_min=0.10)
    if len(slots) >= 15:
        slots = list(slots)
        slots.append({
            'x': 0.1126,
            'y': 0.902,
            'width': 0.7958,
            'height': 0.032,
            'hasLabel': False,
            'inputKind': 'block',
            'continuationGroup': 16,
        })
    return slots

def detect_my_day_mood_faces(pnum):
    """9 smiley face centers on My Day pages (largest teal face fill per column)."""
    page = pdf[pnum - 1]
    W, H = page.rect.width, page.rect.height
    page_aspect = H / W  # convert height-norm → width-norm diameter
    candidates = []
    for d in page.get_drawings():
        r = d['rect']
        w, h = r.width / W, r.height / H
        if w <= 0 or h <= 0 or d.get('type') != 'f' or not d.get('fill'):
            continue
        cx = (r.x0 + r.x1) / 2 / W
        cy = (r.y0 + r.y1) / 2 / H
        if not (0.58 <= cy <= 0.64 and 0.12 <= cx <= 0.88):
            continue
        aspect = max(w, h) / min(w, h)
        if aspect > 1.45 or not (0.035 <= max(w, h) <= 0.065):
            continue
        # Face fill bbox is slightly wide; average with height for a rounder disk.
        diameter = (w + h * page_aspect) / 2
        candidates.append({
            'cx': cx,
            'cy': cy,
            'diameter': diameter,
            'area': w * h,
        })
    candidates.sort(key=lambda f: f['cx'])
    uniq = []
    for f in candidates:
        if not uniq or abs(f['cx'] - uniq[-1]['cx']) > 0.03:
            uniq.append(f)
        elif f['area'] > uniq[-1]['area']:
            uniq[-1] = f
    # Small optical nudge: PDF face-fill centroid sits a touch right/low of the ring.
    return [
        {
            'cx': round(f['cx'] - 0.0015, 4),
            'cy': round(f['cy'] - 0.001, 4),
            'diameter': round(f['diameter'] * 0.96, 4),
        }
        for f in uniq[:9]
    ]

def my_day_slots(pnum=16):
    page = pdf[pnum - 1]
    W, H = page.rect.width, page.rect.height
    strokes = []
    for d in page.get_drawings():
        r = d['rect']
        w, h = r.width / W, (r.y1 - r.y0) / H
        strokes.append((r.y1 / H, r.x0 / W, w, h))

    def pick_line(y_min, y_max, min_w=0.15, max_w=0.35):
        for sy, x, w, h in sorted(strokes):
            if y_min <= sy <= y_max and min_w <= w <= max_w:
                return {
                    'x': round(x, 4),
                    'y': round(sy, 4),
                    'width': round(w, 4),
                    'height': 0.028,
                    'inputKind': 'line',
                }
        return None

    def pick_date_line():
        # Printed layout: title «Твой день» → thin divider → vector «(ДАТА)» below it.
        # Do NOT use the peach fills around y≈0.19–0.22 (those sit on «КАК ПРОШЁЛ…»).
        title_cands = [
            (sy, x, w)
            for sy, x, w, h in strokes
            if 0.130 <= sy <= 0.155 and w >= 0.25 and h <= 0.008
        ]
        if title_cands:
            _sy, x, w = min(title_cands, key=lambda t: abs(t[0] - 0.142))
        else:
            x, w = 0.3377, 0.3261

        # Baseline = bottom of the printed «(ДАТА)» glyph fill (peach vector text).
        date_glyph_bottom = None
        for d in page.get_drawings():
            if d.get('type') != 'f' or not d.get('fill'):
                continue
            r = d['rect']
            gw, gh = r.width / W, (r.y1 - r.y0) / H
            cy = (r.y0 + r.y1) / 2 / H
            if 0.148 <= cy <= 0.175 and 0.03 <= gw <= 0.12 and 0.01 <= gh <= 0.03:
                date_glyph_bottom = r.y1 / H
                break
        stroke_y = round(date_glyph_bottom if date_glyph_bottom is not None else 0.1665, 4)
        return {
            'x': round(x, 4),
            'y': stroke_y,
            'width': round(w, 4),
            'height': 0.028,
            'inputKind': 'line',
        }

    date = pick_date_line()
    mood = pick_line(0.54, 0.58)
    story_lines = sorted([(sy, x, w) for sy, x, w, h in strokes if w > 0.75 and 0.28 < sy < 0.53])[:5]
    smile_lines = sorted([(sy, x, w) for sy, x, w, h in strokes if w > 0.75 and sy > 0.72])[:4]

    slots = []
    slots.append({**date, 'hasLabel': False, 'continuationGroup': 1})
    for sy, x, w in story_lines:
        slots.append({
            'x': round(x, 4),
            'y': round(sy, 4),
            'width': round(w, 4),
            'height': 0.032,
            'hasLabel': False,
            'inputKind': 'block',
            'continuationGroup': 2,
        })
    slots.append({**mood, 'hasLabel': False, 'continuationGroup': 3})
    for sy, x, w in smile_lines:
        slots.append({
            'x': round(x, 4),
            'y': round(sy, 4),
            'width': round(w, 4),
            'height': 0.032,
            'hasLabel': False,
            'inputKind': 'line',
            'continuationGroup': 4,
        })
    return slots

def finalize_answer_slots(slots, prefer_line=True):
    for i, s in enumerate(slots):
        s['continuationGroup'] = i + 1
        s['hasLabel'] = False
        if prefer_line or s['width'] < 0.62:
            s['inputKind'] = 'line'
        else:
            s['inputKind'] = 'block'
    return slots

def school_slots():
    """Brown p31: answer underlines only (thin strokes), not question-glyph fills."""
    page = pdf[30]
    W, H = page.rect.width, page.rect.height
    strokes = []
    for d in page.get_drawings():
        r = d['rect']
        w = r.width / W
        h = (r.y1 - r.y0) / H
        sy = r.y1 / H
        x = r.x0 / W
        if w < 0.08 or h > 0.005 or sy < 0.28 or sy > 0.96:
            continue
        strokes.append((sy, x, w))
    strokes.sort()

    inline_min_x = [
        (0.310, 0.335, 0.61),   # likesStudying
        (0.405, 0.430, 0.53),   # favoriteSubject
        (0.470, 0.495, 0.39),   # favoriteTeacher
        (0.535, 0.560, 0.60),   # classSize
        (0.610, 0.635, 0.64),   # classmateFriends
        (0.685, 0.715, 0.82),   # schoolEvents (short end tail)
        (0.860, 0.885, 0.51),   # schoolMemory
    ]

    slots = []
    for sy, x, w in strokes:
        for min_y, max_y, min_x in inline_min_x:
            if min_y <= sy <= max_y:
                right = x + w
                if x < min_x:
                    x = min_x
                    w = max(0.08, right - x)
                break
        slots.append({
            'x': round(x, 4),
            'y': round(sy, 4),
            'width': round(min(w, 0.98 - x), 4),
            'height': 0.028,
            'hasLabel': False,
            'inputKind': 'line',
            'inlineLabelTail': x >= 0.30,
        })

    # Field line counts match printed layout: 2,1,1,2,2,2,1,3
    group_counts = [2, 1, 1, 2, 2, 2, 1, 3]
    idx = 0
    gid = 1
    for count in group_counts:
        for i in range(count):
            if idx < len(slots):
                slots[idx]['continuationGroup'] = gid
                if count > 1 and i > 0:
                    slots[idx]['inlineLabelTail'] = False
                idx += 1
        gid += 1
    while idx < len(slots):
        slots[idx]['continuationGroup'] = gid
        slots[idx]['inlineLabelTail'] = False
        idx += 1
        gid += 1

    return slots[:14]

def mood_slots():
    """Brown p24: Q&A answer tails + numbered list lines (thin strokes only)."""
    page = pdf[23]
    W, H = page.rect.width, page.rect.height
    strokes = []
    for d in page.get_drawings():
        r = d['rect']
        w = r.width / W
        h = (r.y1 - r.y0) / H
        sy = r.y1 / H
        x = r.x0 / W
        if w < 0.12 or h > 0.005 or sy < 0.27 or sy > 0.92:
            continue
        strokes.append((sy, x, w))
    strokes.sort()

    # After printed questions / after numbered circles (cx≈0.124).
    inline_min_x = [
        (0.285, 0.305, 0.47),
        (0.325, 0.350, 0.37),
        (0.370, 0.395, 0.50),
        (0.415, 0.440, 0.51),
        (0.460, 0.485, 0.59),
        (0.500, 0.525, 0.56),
    ]
    LIST_MIN_X = 0.155  # just after pink number circles

    slots = []
    for sy, x, w in strokes:
        if sy >= 0.60:
            # Numbered list lines — sit just after pink circles.
            right = x + w
            x = LIST_MIN_X
            w = max(0.2, right - x)
        else:
            for min_y, max_y, min_x in inline_min_x:
                if min_y <= sy <= max_y:
                    right = x + w
                    if x < min_x:
                        x = min_x
                        w = max(0.12, right - x)
                    break
        slots.append({
            'x': round(x, 4),
            'y': round(sy, 4),
            'width': round(min(w, 0.98 - x), 4),
            'height': 0.028,
            'hasLabel': False,
            'inputKind': 'line',
            'inlineLabelTail': sy < 0.60,
            'continuationGroup': len(slots) + 1,
        })

    return slots[:11]

def travel_slots():
    """Brown p21: answer underlines only (thin strokes), not question-glyph fills."""
    page = pdf[20]
    W, H = page.rect.width, page.rect.height
    strokes = []
    for d in page.get_drawings():
        r = d['rect']
        w = r.width / W
        h = (r.y1 - r.y0) / H
        sy = r.y1 / H
        x = r.x0 / W
        # Real writing lines are hairline strokes. Question text is a taller fill
        # (h≈0.02) and must not become an answer slot — that shifted every field.
        if w < 0.08 or h > 0.005 or sy < 0.16 or sy > 0.95:
            continue
        strokes.append((sy, x, w))
    strokes.sort()

    # Keep tails from starting over the printed question when OCR stroke is early.
    inline_min_x = [
        (0.165, 0.190, 0.45),   # likesTravel
        (0.310, 0.340, 0.52),   # likedMost
        (0.385, 0.410, 0.39),   # flewPlane
        (0.420, 0.450, 0.46),   # traveledTrain
        (0.460, 0.485, 0.78),   # favoriteTransport
        (0.540, 0.570, 0.69),   # beenToSea
        (0.615, 0.645, 0.58),   # travelWith
        (0.655, 0.685, 0.58),   # futureTrip
        (0.740, 0.770, 0.69),   # impressions
    ]

    slots = []
    for sy, x, w in strokes:
        for min_y, max_y, min_x in inline_min_x:
            if min_y <= sy <= max_y:
                right = x + w
                if x < min_x:
                    x = min_x
                    w = max(0.08, right - x)
                break
        slots.append({
            'x': round(x, 4),
            'y': round(sy, 4),
            'width': round(min(w, 0.98 - x), 4),
            'height': 0.028,
            'hasLabel': False,
            'inputKind': 'line',
            'inlineLabelTail': x >= 0.30,
        })

    # Field line counts: 1,2,2,1,1,2,2,1,2,4
    group_counts = [1, 2, 2, 1, 1, 2, 2, 1, 2, 4]
    idx = 0
    gid = 1
    for count in group_counts:
        for i in range(count):
            if idx < len(slots):
                slots[idx]['continuationGroup'] = gid
                if count > 1 and i > 0:
                    slots[idx]['inlineLabelTail'] = False
                idx += 1
        gid += 1
    while idx < len(slots):
        slots[idx]['continuationGroup'] = gid
        slots[idx]['inlineLabelTail'] = False
        idx += 1
        gid += 1

    return slots[:18]

def pets_slots():
    slots = questionnaire_slots(17, y_gap=0.028, y_min=0.22)
    filtered = [s for s in slots if s['y'] <= 0.90]
    return finalize_answer_slots(filtered[:12], prefer_line=True)

def style_slots():
    # Keep short inline tails after labels (filter_label_tails would drop them).
    page = pdf[25]
    W, H = page.rect.width, page.rect.height
    strokes = []
    for d in page.get_drawings():
        r = d['rect']
        w, h = r.width / W, (r.y1 - r.y0) / H
        sy = r.y1 / H
        if w < 0.2 or h > 0.04 or sy < 0.25 or sy > 0.96:
            continue
        strokes.append((sy, r.x0 / W, w, max(h, 0.028)))
    strokes.sort()
    rows = []
    for sy, x, w, h in strokes:
        if not rows or sy - rows[-1]['y'] > 0.022:
            rows.append({
                'x': round(x, 4),
                'y': round(sy, 4),
                'width': round(w, 4),
                'height': round(h, 4),
            })
        elif w > rows[-1]['width']:
            rows[-1].update({
                'x': round(x, 4),
                'y': round(sy, 4),
                'width': round(w, 4),
                'height': round(h, 4),
            })
    return finalize_answer_slots(rows[:16], prefer_line=True)

def food_slots():
    """Brown p38 «Еда»: answer underlines only (thin strokes), not question fills."""
    page = pdf[37]
    W, H = page.rect.width, page.rect.height
    strokes = []
    for d in page.get_drawings():
        r = d['rect']
        w = r.width / W
        h = (r.y1 - r.y0) / H
        sy = r.y1 / H
        x = r.x0 / W
        if w < 0.15 or h > 0.005 or sy < 0.20 or sy > 0.92:
            continue
        strokes.append((sy, x, w))
    strokes.sort()

    slots = []
    for sy, x, w in strokes:
        slots.append({
            'x': round(x, 4),
            'y': round(sy, 4),
            'width': round(min(w, 0.98 - x), 4),
            'height': 0.028,
            'hasLabel': False,
            'inputKind': 'line',
            'inlineLabelTail': x >= 0.30,
        })

    # food×2, sweet×2, sweetTooth, recipe×2, cafe, future×5
    group_counts = [2, 2, 1, 2, 1, 5]
    idx = 0
    gid = 1
    for count in group_counts:
        for i in range(count):
            if idx < len(slots):
                slots[idx]['continuationGroup'] = gid
                if count > 1 and i > 0:
                    slots[idx]['inlineLabelTail'] = False
                idx += 1
        gid += 1
    while idx < len(slots):
        slots[idx]['continuationGroup'] = gid
        slots[idx]['inlineLabelTail'] = False
        idx += 1
        gid += 1

    return slots[:13]

def dreams_slots():
    """Brown p15 «Мечты»: peach cells — left×3, tall right, bottom secret×2."""
    page = pdf[14]
    W, H = page.rect.width, page.rect.height
    strokes = []
    for d in page.get_drawings():
        r = d['rect']
        w = r.width / W
        h = (r.y1 - r.y0) / H
        sy = r.y1 / H
        x = r.x0 / W
        color = d.get('color')
        # White hairlines inside peach dream cells.
        if color != (1.0, 1.0, 1.0):
            continue
        if sy < 0.18 or sy > 0.92 or w < 0.12 or h > 0.01:
            continue
        strokes.append((sy, x, w))
    strokes.sort(key=lambda t: (round(t[0], 3), t[1]))
    rows = []
    for sy, x, w in strokes:
        if not rows or abs(rows[-1]['y'] - sy) > 0.015 or abs(rows[-1]['x'] - x) > 0.05:
            rows.append({
                'x': round(x, 4),
                'y': round(sy, 4),
                'width': round(w, 4),
                'height': 0.028,
            })

    left = sorted([s for s in rows if s['x'] < 0.4], key=lambda s: s['y'])
    right = sorted([s for s in rows if s['x'] >= 0.4], key=lambda s: s['y'])
    # PDF has a single white hairline in the secret peach cell (lower half).
    bottom = [s for s in left if s['y'] >= 0.85][:1]
    left_main = [s for s in left if s['y'] < 0.85]
    if not bottom:
        bottom = [{'x': 0.1554, 'y': 0.8947, 'width': 0.4806, 'height': 0.028}]

    ordered = left_main[:9] + right[:12] + bottom
    # Groups: dream1/2/3 (3 each), dreamNotes (12), secretDream (1)
    group_counts = [3, 3, 3, 12, 1]
    idx = 0
    gid = 1
    for count in group_counts:
        for _ in range(count):
            if idx < len(ordered):
                ordered[idx]['continuationGroup'] = gid
                ordered[idx]['hasLabel'] = False
                ordered[idx]['inputKind'] = 'block'
                idx += 1
        gid += 1
    while idx < len(ordered):
        ordered[idx]['continuationGroup'] = gid
        ordered[idx]['hasLabel'] = False
        ordered[idx]['inputKind'] = 'block'
        idx += 1
        gid += 1
    return ordered[:22]

def hobby_slots():
    """Brown p13: answer underlines only (thin strokes), not question-glyph fills."""
    page = pdf[12]
    W, H = page.rect.width, page.rect.height
    strokes = []
    for d in page.get_drawings():
        r = d['rect']
        w = r.width / W
        h = (r.y1 - r.y0) / H
        sy = r.y1 / H
        x = r.x0 / W
        # Skip question fills (h≈0.02) and tiny end-of-question remnants.
        if w < 0.20 or h > 0.005 or sy < 0.20 or sy > 0.94:
            continue
        strokes.append((sy, x, w))
    strokes.sort()

    slots = []
    for sy, x, w in strokes:
        slots.append({
            'x': round(x, 4),
            'y': round(sy, 4),
            'width': round(min(w, 0.98 - x), 4),
            'height': 0.028,
            'hasLabel': False,
            'inputKind': 'line',
            'inlineLabelTail': x >= 0.28,
        })

    # hobbies×2, sport, alone, 7 favorites, music×2, company×2, recess×3
    group_counts = [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 3]
    idx = 0
    gid = 1
    for count in group_counts:
        for i in range(count):
            if idx < len(slots):
                slots[idx]['continuationGroup'] = gid
                if count > 1 and i > 0:
                    slots[idx]['inlineLabelTail'] = False
                idx += 1
        gid += 1
    while idx < len(slots):
        slots[idx]['continuationGroup'] = gid
        slots[idx]['inlineLabelTail'] = False
        idx += 1
        gid += 1

    return slots[:18]

def friend_questionnaire_slots(pnum):
    # First detected stroke is already «Имя:» — do not prepend a synthetic slot
    # (that caused answers to shift one line up in preview/export).
    slots = questionnaire_slots(pnum, y_gap=0.034, y_min=0.11)
    for i, s in enumerate(slots):
        s['continuationGroup'] = i + 1
    return slots

MY_DAY = [16,20,23,25,28,33,45,46,47,48,49,50,51,52,53,54,55,56]
WEEKLY = [34,35,36,37]
FRIENDS = [39,40,41,42,43,44]
brown = {
    '1': diary_owner_slots(),
    '3': diary_rules_slots(),
    '6': girl_profile_slots(),
    '7': parent_profile_slots(7),
    '8': parent_profile_slots(8),
    '11': grandparent_profile_slots(11),
    '12': grandparent_profile_slots(12),
    '13': hobby_slots(),
    '15': dreams_slots(),
    '17': pets_slots(),
    '21': travel_slots(),
    '24': mood_slots(),
    '26': style_slots(),
    '31': school_slots(),
    '38': food_slots(),
}
mood_circles = {}
for p in MY_DAY:
    brown[str(p)] = my_day_slots(p)
    faces = detect_my_day_mood_faces(p)
    if len(faces) != 9:
        raise SystemExit(f'My Day p{p}: expected 9 mood faces, got {len(faces)}')
    mood_circles[str(p)] = faces
for p in WEEKLY:
    if p == 37:
        continue
    brown[str(p)] = weekly_schedule_slots(p)
brown['37'] = weekly_with_note_slots()
for p in FRIENDS:
    brown[str(p)] = friend_questionnaire_slots(p)

out = ${JSON.stringify(path.join(__dirname, 'diary-brown-slot-overrides-data.json'))}
Path(out).write_text(json.dumps(brown, indent=2), encoding='utf-8')
mood_out = ${JSON.stringify(path.join(__dirname, 'diary-brown-mood-circles-data.json'))}
Path(mood_out).write_text(json.dumps(mood_circles, indent=2), encoding='utf-8')
print('Wrote', out, 'pages', len(brown))
print('Wrote', mood_out, 'mood pages', len(mood_circles))
`;

const venvPy = path.join(projectRoot, '.venv/bin/python3');
const pyCmd = fs.existsSync(venvPy) ? venvPy : 'python3';
execSync(pyCmd, { input: py, cwd: projectRoot, stdio: ['pipe', 'inherit', 'inherit'] });
