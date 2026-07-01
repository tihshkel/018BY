#!/usr/bin/env node
/**
 * Regenerates scripts/diary-purple-slot-overrides-data.json from purple diary PDF.
 * Run: node scripts/build-diary-purple-slot-overrides.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const py = `import fitz, json
from pathlib import Path

pdf = fitz.open(${JSON.stringify(path.join(projectRoot, 'in albums/09.06.26_Блок фиолетовый_180х240_print.pdf'))})

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

def slot_dict(stroke_y, x, w, h, i, inputKind=None):
    if inputKind is None:
        inputKind = 'block' if w >= 0.62 else 'line'
    return {
        'x': round(x, 4),
        'y': round(stroke_y, 4),
        'width': round(w, 4),
        'height': round(h, 4),
        'hasLabel': False,
        'inputKind': inputKind,
        'continuationGroup': i + 1,
    }

def questionnaire_slots(pnum, y_gap=0.038, y_min=0.12):
    page = pdf[pnum - 1]
    W, H = page.rect.width, page.rect.height
    strokes = []
    for d in page.get_drawings():
        r = d['rect']
        w, h = r.width / W, (r.y1 - r.y0) / H
        if w < 0.15 or h > 0.035:
            continue
        stroke_y = r.y1 / H
        if stroke_y < y_min or stroke_y > 0.95:
            continue
        strokes.append((stroke_y, r.x0 / W, w, max(h, 0.028)))
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
        slots.append(slot_dict(stroke_y, x, w, h, i))
    return slots

def finalize_answer_slots(slots, prefer_line=False):
    for i, s in enumerate(slots):
        s['continuationGroup'] = i + 1
        s['hasLabel'] = False
        if prefer_line or s['width'] < 0.62:
            s['inputKind'] = 'line'
        else:
            s['inputKind'] = 'block'
    return slots

def diary_owner_slots():
    return [
        slot_dict(0.4800, 0.6355, 0.1915, 0.028, 0, 'line'),
        slot_dict(0.5592, 0.4624, 0.3661, 0.028, 1, 'line'),
    ]

def diary_rules_slots():
    return [slot_dict(0.219, 0.0895, 0.5003, 0.028, 0, 'line')]

def girl_profile_slots():
    all_rows = questionnaire_slots(5, y_gap=0.034, y_min=0.225)
    main = [s for s in all_rows if s['y'] <= 0.72][:11]
    career_rows = [s for s in all_rows if s['y'] >= 0.755 and s['width'] > 0.5]
    slots = list(main)
    if career_rows:
        slots.append({**career_rows[0], 'inputKind': 'line'})
    return finalize_answer_slots(slots[:12])

def parent_profile_slots(pnum):
    slots = questionnaire_slots(pnum, y_gap=0.034, y_min=0.20)
    answer = slots[:12]
    wish_blocks = [s for s in slots if s['width'] > 0.6 and s['y'] >= 0.78][:2]
    wishes = []
    for block in wish_blocks:
        wishes.append(block)
        wishes.append({**block, 'y': round(block['y'] - 0.036, 4), 'inputKind': 'block'})
    return finalize_answer_slots(answer + wishes[:4])

def hobby_slots():
    slots = questionnaire_slots(8, y_gap=0.034, y_min=0.15)
    filtered = []
    for s in slots:
        if (
            s['y'] >= 0.34 and s['y'] <= 0.39
            and s['x'] >= 0.65 and s['width'] <= 0.25
        ):
            continue
        filtered.append(s)
    return finalize_answer_slots(filtered[:12])

def my_day_slots(pnum=9):
    page = pdf[pnum - 1]
    W, H = page.rect.width, page.rect.height
    strokes = []
    for d in page.get_drawings():
        r = d['rect']
        w, h = r.width / W, (r.y1 - r.y0) / H
        strokes.append((r.y1 / H, r.x0 / W, w, h))

    def pick_line(y_min, y_max, min_w=0.12, max_w=0.45):
        for sy, x, w, h in sorted(strokes):
            if y_min <= sy <= y_max and min_w <= w <= max_w:
                return slot_dict(sy, x, w, 0.028, 0, 'line')
        return None

    # «За сегодня» (day_story): calibrated on page_009_my-day_300dpi.png (2219×2927).
    # User text start top-left: x=944, y=635. Slot norm.y is the bottom stroke of the line band.
    my_day_story_ref_w = 2219.0
    my_day_story_ref_h = 2927.0
    my_day_story_x = round(944 / my_day_story_ref_w, 4)
    my_day_story_top = round(635 / my_day_story_ref_h, 4)
    my_day_story_h = 0.032
    my_day_story_row_gap = 0.0356
    my_day_story_width = round(0.9192 - my_day_story_x, 4)
    my_day_story_first_bottom = round(my_day_story_top + my_day_story_h, 4)

    mood = pick_line(0.54, 0.62, 0.12, 0.45)
    smile_lines = sorted([(sy, x, w) for sy, x, w, h in strokes if w > 0.6 and sy > 0.72])[:4]

    slots = []
    for i in range(5):
        sy = round(my_day_story_first_bottom + i * my_day_story_row_gap, 4)
        slots.append(
            slot_dict(sy, my_day_story_x, my_day_story_width, my_day_story_h, len(slots), 'block')
        )
    if mood:
        slots.append(mood)
    for sy, x, w in smile_lines:
        slots.append(slot_dict(sy, x, w, 0.032, len(slots), 'line'))
    for i, s in enumerate(slots):
        s['continuationGroup'] = i + 1
        s['hasLabel'] = False
    return slots

def pets_slots():
    rows = questionnaire_slots(10, y_gap=0.034, y_min=0.18)
    singles = sorted(
        [s for s in rows if s['y'] < 0.48 and s['width'] >= 0.35],
        key=lambda s: s['y'],
    )[:5]
    stories = sorted(
        [s for s in rows if s['y'] >= 0.48 and s['width'] > 0.6],
        key=lambda s: s['y'],
    )[:3]
    return finalize_answer_slots(singles + stories)

def social_slots():
    slots = questionnaire_slots(12, y_gap=0.034, y_min=0.25)
    return finalize_answer_slots([s for s in slots if s['width'] >= 0.35][:6], prefer_line=True)

def mood_slots():
    slots = questionnaire_slots(14, y_gap=0.034, y_min=0.28)
    return finalize_answer_slots([s for s in slots if s['y'] >= 0.28][:9])

def school_slots():
    slots = questionnaire_slots(22, y_gap=0.034, y_min=0.30)
    return finalize_answer_slots([s for s in slots if s['y'] >= 0.31][:9])

def sunday_slots():
    slots = questionnaire_slots(27, y_gap=0.034, y_min=0.20)
    wide = [s for s in slots if s['width'] > 0.55 and s['y'] < 0.55][:5]
    return finalize_answer_slots(wide if len(wide) >= 5 else slots[:5])

def friend_questionnaire_slots(pnum):
    main_y_max = 0.695
    rows = questionnaire_slots(pnum, y_gap=0.034, y_min=0.15)
    ref_main = [
        s for s in questionnaire_slots(28, y_gap=0.034, y_min=0.15) if s['y'] < main_y_max
    ][:16]

    main_rows = sorted([s for s in rows if s['y'] < main_y_max], key=lambda s: s['y'])
    lower_rows = sorted([s for s in rows if s['y'] >= main_y_max], key=lambda s: s['y'])

    singles = []
    for i in range(16):
        if i < len(main_rows):
            singles.append(main_rows[i])
        elif i < len(ref_main):
            singles.append({**ref_main[i], 'continuationGroup': i + 1})

    wish_candidates = [s for s in lower_rows if s['width'] > 0.55]
    wishes = wish_candidates[:1] if wish_candidates else (lower_rows[:1] if lower_rows else [])
    social = [s for s in lower_rows if s not in wishes][:3]

    if not wishes and ref_main:
        ref_lower = sorted(
            [s for s in questionnaire_slots(28, y_gap=0.034, y_min=0.15) if s['y'] >= main_y_max],
            key=lambda s: s['y'],
        )
        ref_wish = [s for s in ref_lower if s['width'] > 0.55][:1]
        wishes = ref_wish[:1]
        if not social:
            social = [s for s in ref_lower if s not in wishes][:3]

    if wishes and len(social) < 3:
        anchor = wishes[0]
        anchor_y = anchor['y']
        anchor_x = min(anchor['x'], 0.088)
        anchor_w = max(anchor['width'], 0.55)
        while len(social) < 3:
            y = round(anchor_y + 0.042 * (1 + len(social)), 4)
            if y > 0.945:
                break
            social.append(
                slot_dict(y, anchor_x, anchor_w, 0.028, 16 + len(wishes) + len(social), 'line')
            )

    return finalize_answer_slots(singles[:16] + wishes[:1] + social[:3])

def weekly_page_26_slots():
    raw = [
        (0.0865, 0.2229, 0.8318),
        (0.0865, 0.2669, 0.8318),
        (0.0865, 0.3108, 0.619),
        (0.0865, 0.3548, 0.5706),
        (0.0893, 0.3988, 0.5923),
        (0.0865, 0.6709, 0.8318),
        (0.0865, 0.7148, 0.8318),
        (0.0865, 0.7588, 0.8318),
        (0.0865, 0.8028, 0.619),
        (0.0865, 0.8468, 0.5706),
    ]
    return finalize_answer_slots(
        [slot_dict(y, x, w, 0.028, i, 'line') for i, (x, y, w) in enumerate(raw)],
        prefer_line=True,
    )

MY_DAY = [9, 11, 13, 15, 17, 19, 23, 34, 35, 36, 37, 38, 39]
WEEKLY = [24, 25]
FRIENDS = [28, 29, 30, 31, 32, 33]

purple = {
    '1': diary_owner_slots(),
    '3': diary_rules_slots(),
    '5': girl_profile_slots(),
    '6': parent_profile_slots(6),
    '7': parent_profile_slots(7),
    '8': hobby_slots(),
    '9': my_day_slots(9),
    '10': pets_slots(),
    '12': social_slots(),
    '14': mood_slots(),
    '16': finalize_answer_slots(questionnaire_slots(16, y_gap=0.034, y_min=0.20)[:9]),
    '18': finalize_answer_slots(questionnaire_slots(18, y_gap=0.034, y_min=0.20)[:11]),
    '22': school_slots(),
    '26': weekly_page_26_slots(),
    '27': sunday_slots(),
}
for p in MY_DAY:
    if p != 9:
        purple[str(p)] = my_day_slots(p)
for p in WEEKLY:
    purple[str(p)] = finalize_answer_slots(
        questionnaire_slots(p, y_gap=0.022, y_min=0.12)[:12],
        prefer_line=True,
    )
for p in FRIENDS:
    purple[str(p)] = friend_questionnaire_slots(p)

out = ${JSON.stringify(path.join(__dirname, 'diary-purple-slot-overrides-data.json'))}
Path(out).write_text(json.dumps(purple, indent=2), encoding='utf-8')
print('Wrote', out, 'pages', len(purple))
`;

const venvPy = path.join(projectRoot, '.venv/bin/python3');
const pyCmd = fs.existsSync(venvPy) ? venvPy : 'python3';
execSync(pyCmd, { input: py, cwd: projectRoot, stdio: ['pipe', 'inherit', 'inherit'] });
