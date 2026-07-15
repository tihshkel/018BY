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
    # Страница «Правила» — только чтение, без полей ввода.
    return []

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
    """Тот же макет, что анкета мамы/папы (12 полей + пожелания 4 строки)."""
    return parent_profile_slots(pnum)

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
    """12 ответов + «Пожелания хозяйке дневника:» (хвост после «:» + 3 строки)."""
    slots = questionnaire_slots(pnum, y_gap=0.034, y_min=0.20)
    answer = finalize_answer_slots(slots[:12])
    wish_strokes = [
        (y, x, w)
        for y, x, w in pdf_writing_strokes(pnum, y_min=0.74, min_w=0.2)
        if y <= 0.92
    ]
    # Хвост после «:» — короткий справа; дальше полные строки.
    heads = [(y, x, w) for y, x, w in wish_strokes if 0.35 <= w <= 0.55 and x >= 0.45]
    fulls = [(y, x, w) for y, x, w in wish_strokes if w >= 0.7]
    # Хвост PDF после «:»; +0.008 на отрисовке (applyDiaryUniformLineInset).
    hy, hx, _hw = sorted(heads, key=lambda t: t[0])[0] if heads else (0.7698, 0.5381, 0.35)
    head_x = round(min(hx, 0.5381), 4)
    head = {
        'x': head_x,
        'y': hy,
        'width': round(max(0.91 - head_x, 0.35), 4),
        'height': 0.028,
        'hasLabel': False,
        'inputKind': 'line',
        'continuationGroup': 13,
    }
    cont_ys = [y for y, x, w in sorted(fulls)[:3]]
    if len(cont_ys) < 3:
        cont_ys = [0.8065, 0.8448, 0.8821][:3]
    wishes = [head] + [
        {
            'x': 0.0901,
            'y': y,
            'width': 0.8201,
            'height': 0.028,
            'hasLabel': False,
            'inputKind': 'line',
            'continuationGroup': 13,
        }
        for y in cont_ys
    ]
    return answer + wishes

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

def pdf_writing_strokes(pnum, y_min=0.2, min_w=0.08, max_h=0.015):
    page = pdf[pnum - 1]
    W, H = page.rect.width, page.rect.height
    raw = []
    for d in page.get_drawings():
        r = d['rect']
        w, h = r.width / W, (r.y1 - r.y0) / H
        y, x = r.y1 / H, r.x0 / W
        if w >= min_w and h <= max_h and y > y_min:
            raw.append((round(y, 4), round(x, 4), round(w, 4)))
    return sorted(set(raw))

def strokes_to_slots(strokes):
    slots = []
    for i, (y, x, w) in enumerate(strokes):
        slots.append({
            'x': x,
            'y': y,
            'width': w,
            'height': 0.028,
            'hasLabel': False,
            'inputKind': 'line',
            'continuationGroup': i + 1,
        })
    return slots

def my_day_slots(pnum=16):
    strokes = [(y, x, w) for y, x, w in pdf_writing_strokes(pnum) if w >= 0.5][:11]
    return strokes_to_slots(strokes)

def hobby_slots():
    strokes = [(y, x, w) for y, x, w in pdf_writing_strokes(13) if w >= 0.2][:18]
    return strokes_to_slots(strokes)

def dreams_slots():
    """Стр. 15 «Мечты»: 3 левых блока + правый столбец + «Самое сокровенное».
    Порядок как у полей формы (не сортируем по Y).
    """
    left_x, left_w = 0.14785, 0.34319
    right_x, right_w = 0.5932, 0.27072
    bottom_x, bottom_w = 0.1418, 0.4862
    h = 0.028
    left_blocks = [
        [0.23172, 0.27618, 0.32064],
        [0.39228, 0.44612, 0.49058],
        [0.58602, 0.65988, 0.70434, 0.7488],
    ]
    right_ys = [
        0.23172, 0.27618, 0.32064, 0.3651, 0.40842, 0.45288, 0.49734,
        0.54512, 0.58602, 0.63745, 0.6819, 0.72636,
    ]
    bottom_ys = [0.9014]
    slots = []
    cg = 0
    for block in left_blocks:
        cg += 1
        for y in block:
            slots.append({
                'x': left_x, 'y': y, 'width': left_w, 'height': h,
                'hasLabel': False, 'inputKind': 'block', 'continuationGroup': cg,
            })
    cg += 1
    for y in right_ys:
        slots.append({
            'x': right_x, 'y': y, 'width': right_w, 'height': h,
            'hasLabel': False, 'inputKind': 'block', 'continuationGroup': cg,
        })
    cg += 1
    for y in bottom_ys:
        slots.append({
            'x': bottom_x, 'y': y, 'width': bottom_w, 'height': h,
            'hasLabel': False, 'inputKind': 'block', 'continuationGroup': cg,
        })
    return slots

def pets_slots():
    strokes = [
        (y, x, w)
        for y, x, w in pdf_writing_strokes(17)
        if not (y > 0.88 and w < 0.15)
        and not (w < 0.22 and x >= 0.55)
    ][:12]
    return strokes_to_slots(strokes)

def school_slots():
    return strokes_to_slots(pdf_writing_strokes(31)[:14])

def mood_slots():
    return strokes_to_slots(pdf_writing_strokes(24)[:11])

def style_slots():
    return strokes_to_slots(pdf_writing_strokes(26)[:16])

def finalize_answer_slots(slots, prefer_line=True):
    for i, s in enumerate(slots):
        s['continuationGroup'] = i + 1
        s['hasLabel'] = False
        if prefer_line or s['width'] < 0.62:
            s['inputKind'] = 'line'
        else:
            s['inputKind'] = 'block'
    return slots

def thin_writing_strokes(pnum, y_min=0.16, y_max=0.92, min_w=0.12):
    """Только тонкие штрихи линий ответа (h≈0); h>0.01 — контуры букв вопросов."""
    page = pdf[pnum - 1]
    W, H = page.rect.width, page.rect.height
    strokes = []
    for d in page.get_drawings():
        r = d['rect']
        w = r.width / W
        h = (r.y1 - r.y0) / H
        sy = r.y1 / H
        sx = r.x0 / W
        if sy < y_min or sy > y_max:
            continue
        if h > 0.01 or w < min_w:
            continue
        strokes.append((sy, sx, w, 0.028))
    strokes.sort()
    rows = []
    for sy, x, w, h in strokes:
        if not rows or sy - rows[-1]['y'] > 0.01:
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
    return rows

def travel_slots():
    """Все тонкие линии ответа (хвосты после вопроса + полные строки), без контуров текста."""
    return finalize_answer_slots(thin_writing_strokes(21))

def food_slots():
    """Стр. 38 «Еда»: хвосты справа после «:»/? + полные строки; без подчёркиваний под вопросами (h≈0.026)."""
    return finalize_answer_slots(thin_writing_strokes(38, y_min=0.14, y_max=0.92, min_w=0.12))

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
    '15': dreams_slots(),
    '16': my_day_slots(16),
    '17': pets_slots(),
    '21': travel_slots(),
    '24': mood_slots(),
    '26': style_slots(),
    '31': school_slots(),
    '38': food_slots(),
}
for p in MY_DAY:
    if p != 16:
        brown[str(p)] = my_day_slots(p)
for p in WEEKLY:
    brown[str(p)] = questionnaire_slots(p, y_gap=0.022, y_min=0.12)
brown['37'] = weekly_with_note_slots()
for p in FRIENDS:
    brown[str(p)] = friend_questionnaire_slots(p)

out = ${JSON.stringify(path.join(__dirname, 'diary-brown-slot-overrides-data.json'))}
Path(out).write_text(json.dumps(brown, indent=2), encoding='utf-8')
print('Wrote', out, 'pages', len(brown))
`;

const venvPyUnix = path.join(projectRoot, '.venv/bin/python3');
const venvPyWin = path.join(projectRoot, '.venv/Scripts/python.exe');
const pyCmd = fs.existsSync(venvPyUnix)
  ? venvPyUnix
  : fs.existsSync(venvPyWin)
    ? venvPyWin
    : process.env.PYTHON || 'python';
execSync(pyCmd, { input: py, cwd: projectRoot, stdio: ['pipe', 'inherit', 'inherit'] });
