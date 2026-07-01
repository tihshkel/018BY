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

def my_day_slots():
    page = pdf[15]
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

    date = pick_line(0.18, 0.25)
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
    slots = questionnaire_slots(31, y_gap=0.034, y_min=0.30)
    filtered = [s for s in slots if s['y'] >= 0.31]
    return finalize_answer_slots(filtered[:9])

def mood_slots():
    slots = questionnaire_slots(24, y_gap=0.034, y_min=0.28)
    return finalize_answer_slots(slots[:9])

def travel_slots():
    page = pdf[20]
    W, H = page.rect.width, page.rect.height
    strokes = []
    for d in page.get_drawings():
        r = d['rect']
        w = r.width / W
        h = (r.y1 - r.y0) / H
        sy = r.y1 / H
        if sy < 0.24 or sy > 0.92:
            continue
        if w < 0.55 or h > 0.04:
            continue
        strokes.append((sy, r.x0 / W, w, max(h, 0.028)))
    strokes.sort()
    rows = []
    for sy, x, w, h in strokes:
        if not rows or sy - rows[-1]['y'] > 0.025:
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
    return finalize_answer_slots(rows[:8])

def hobby_slots():
    slots = questionnaire_slots(13, y_gap=0.034, y_min=0.15)
    # Drop micro tail on «остаёшься одна» question row only.
    filtered = []
    for s in slots:
        if (
            s['y'] >= 0.34 and s['y'] <= 0.39
            and s['x'] >= 0.65 and s['width'] <= 0.25
        ):
            continue
        filtered.append(s)
    for i, s in enumerate(filtered[:12]):
        s['continuationGroup'] = i + 1
        s['inputKind'] = 'block' if s['width'] >= 0.62 else 'line'
    return filtered[:12]

def friend_questionnaire_slots(pnum):
    slots = questionnaire_slots(pnum, y_gap=0.034, y_min=0.11)
    first_y = slots[0]['y'] if slots else 0.1643
    name_y = round(max(0.118, first_y - 0.041), 4)
    name_slot = {
        'x': 0.1484,
        'y': name_y,
        'width': 0.789,
        'height': 0.028,
        'hasLabel': False,
        'inputKind': 'block',
        'continuationGroup': 0,
    }
    result = [name_slot] + slots
    for i, s in enumerate(result):
        s['continuationGroup'] = i + 1
    return result

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
    '15': questionnaire_slots(15),
    '16': my_day_slots(),
    '17': questionnaire_slots(17),
    '21': travel_slots(),
    '24': mood_slots(),
    '31': school_slots(),
    '38': questionnaire_slots(38, y_gap=0.032, y_min=0.14),
}
for p in MY_DAY:
    if p != 16:
        brown[str(p)] = my_day_slots()
for p in WEEKLY:
    brown[str(p)] = questionnaire_slots(p, y_gap=0.022, y_min=0.12)
brown['37'] = weekly_with_note_slots()
for p in FRIENDS:
    brown[str(p)] = friend_questionnaire_slots(p)

out = ${JSON.stringify(path.join(__dirname, 'diary-brown-slot-overrides-data.json'))}
Path(out).write_text(json.dumps(brown, indent=2), encoding='utf-8')
print('Wrote', out, 'pages', len(brown))
`;

const venvPy = path.join(projectRoot, '.venv/bin/python3');
const pyCmd = fs.existsSync(venvPy) ? venvPy : 'python3';
execSync(pyCmd, { input: py, cwd: projectRoot, stdio: ['pipe', 'inherit', 'inherit'] });
