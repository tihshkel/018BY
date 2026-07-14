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
    # Страница «Правила» — только чтение, без полей ввода.
    return []

def girl_profile_slots():
    all_rows = questionnaire_slots(5, y_gap=0.034, y_min=0.225)
    main = [s for s in all_rows if s['y'] <= 0.72][:11]
    # Хвост после «?» на строке вопроса + продолжение на следующей линии.
    slots = list(main)
    slots.append(slot_dict(0.7309, 0.6604, 0.2527, 0.028, len(slots), 'line'))
    slots.append(slot_dict(0.7701, 0.0954, 0.8176, 0.028, len(slots) - 1, 'line'))
    return finalize_answer_slots(slots)

def parent_profile_slots(pnum):
    slots = questionnaire_slots(pnum, y_gap=0.034, y_min=0.20)
    answer = finalize_answer_slots(slots[:12])
    # Хвост после «Пожелания хозяйке дневника:» + 3 строки ниже.
    # x без +0.008 — отступ даёт applyDiaryUniformLineInset при отрисовке.
    wishes = [
        slot_dict(0.7709, 0.508, 0.409, 0.028, 12, 'line'),
        slot_dict(0.8069, 0.0863, 0.8307, 0.028, 12, 'line'),
        slot_dict(0.8429, 0.0863, 0.8307, 0.028, 12, 'line'),
        slot_dict(0.8789, 0.0863, 0.8307, 0.028, 12, 'line'),
    ]
    return answer + wishes

def hobby_slots():
    # 17 штрихов: хобби×2, спорт×2 (хвост+полная), одна×2, затем 11 одиночных.
    return strokes_to_slots(pdf_writing_strokes(8, y_min=0.2, min_w=0.08)[:17])

def pdf_writing_strokes(pnum, y_min=0.2, min_w=0.08, max_h=0.015):
    """Горизонтальные штрихи полей ввода из PDF (y = низ линии)."""
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
        slots.append(slot_dict(y, x, w, 0.028, i, 'line'))
        slots[-1]['continuationGroup'] = i + 1
        slots[-1]['hasLabel'] = False
    return slots

def my_day_slots(pnum=9):
    # 8 строк «за сегодня» (x≈0.11) + 7 строк «улыбаться» (x≈0.15); без нижней кромки блока.
    strokes = [
        (y, x, w)
        for y, x, w in pdf_writing_strokes(pnum, y_min=0.25)
        if y < 0.96 and w >= 0.5
    ]
    return strokes_to_slots(strokes[:15])

def pets_slots():
    return strokes_to_slots(pdf_writing_strokes(10)[:11])

def social_slots():
    return strokes_to_slots(pdf_writing_strokes(12)[:15])

def mood_slots():
    return strokes_to_slots(pdf_writing_strokes(14)[:13])

def style_slots():
    # 8 ответов-хвостов + 4 «модные мечты»; разделитель ~0.663 не берём.
    strokes = pdf_writing_strokes(16)
    answers = [s for s in strokes if s[0] < 0.62][:8]
    dreams = [s for s in strokes if s[0] > 0.75][:4]
    return strokes_to_slots(answers + dreams)

def first_love_slots():
    return strokes_to_slots(pdf_writing_strokes(18)[:15])

def school_slots():
    return strokes_to_slots(pdf_writing_strokes(22)[:14])

def sunday_slots():
    # Верхний блок: 5 полей, первая линия письма ≈0.1789 (не 0.2229).
    top = [
        (0.0865, 0.1789, 0.8318),
        (0.0865, 0.2229, 0.8318),
        (0.0865, 0.2669, 0.8318),
        (0.2993, 0.3108, 0.619),
        (0.3477, 0.3548, 0.5706),
    ]
    return finalize_answer_slots(
        [slot_dict(y, x, w, 0.028, i, 'line') for i, (x, y, w) in enumerate(top)],
        prefer_line=True,
    )

def friend_wish_slots(pnum):
    """2 линии пожеланий: хвост после «:» + продолжение с шагом ~0.034."""
    head = friend_wish_head_slot(pnum)
    cont_y = round(head['y'] + 0.034, 4)
    # Не залезать на ряд Instagram (~0.82); «Ники…» ≈0.7887 — не Instagram.
    cont_y = min(cont_y, 0.805)
    cont = slot_dict(cont_y, 0.0886, 0.55, 0.028, 17, 'line')
    head['continuationGroup'] = 17
    cont['continuationGroup'] = 17
    return [head, cont]

def friend_wish_head_slot(pnum):
    """Хвост сразу после «Пожелания хозяйке анкеты:»."""
    strokes = pdf_writing_strokes(pnum, y_min=0.74, min_w=0.35, max_h=0.02)
    heads = [
        (y, x, w)
        for y, x, w in strokes
        if 0.74 <= y <= 0.77 and 0.35 <= x <= 0.55 and 0.35 <= w <= 0.55
    ]
    if heads:
        y, x, w = sorted(heads, key=lambda t: t[0])[0]
        return slot_dict(y, x, w, 0.028, 16, 'line')
    return slot_dict(0.7532, 0.4382, 0.4815, 0.028, 16, 'line')

def friend_questionnaire_slots(pnum):
    """16 полей анкеты: одна сетка как на стр. 28.

    На 29/30/33 PDF отдаёт меньше штрихов (иллюстрация закрывает линии),
    а добор из ref_main раньше давал дубли Y → наслоение текстов.
    """
    main_y_max = 0.695
    ref_main = [
        s for s in questionnaire_slots(28, y_gap=0.034, y_min=0.15) if s['y'] < main_y_max
    ][:16]
    # Всегда 16 равномерных рядов со стр. 28; x/w можно чуть подкрутить с текущей стр.
    page_rows = sorted(
        [s for s in questionnaire_slots(pnum, y_gap=0.034, y_min=0.15) if s['y'] < main_y_max],
        key=lambda s: s['y'],
    )
    singles = []
    for i, ref in enumerate(ref_main):
        slot = dict(ref)
        slot['continuationGroup'] = i + 1
        # Если на странице есть близкий штрих — взять его x/width (подпись может быть другой длины).
        if page_rows:
            nearest = min(page_rows, key=lambda s: abs(s['y'] - ref['y']))
            if abs(nearest['y'] - ref['y']) < 0.02:
                slot['x'] = nearest['x']
                slot['width'] = nearest['width']
                if nearest.get('inputKind'):
                    slot['inputKind'] = nearest['inputKind']
        singles.append(slot)

    wishes = friend_wish_slots(pnum)

    # Instagram / VK / TikTok — у иконок (0.848/0.882/0.913), на штрихах ниже «Ники…».
    # Не 0.8219: это линия слишком высоко (текст налазит на «Ники…»).
    social = [
        slot_dict(0.8568, 0.28, 0.55, 0.028, 18, 'line'),
        slot_dict(0.8925, 0.28, 0.55, 0.028, 19, 'line'),
        slot_dict(0.9253, 0.28, 0.55, 0.028, 20, 'line'),
    ]

    result = finalize_answer_slots(singles[:16] + wishes + social)
    if len(result) >= 18:
        result[16]['continuationGroup'] = 17
        result[17]['continuationGroup'] = 17
    return result

def weekly_two_day_slots(pnum):
    """6 линий верхнего дня + 6 нижнего (без декоративной/лишней 7-й сверху)."""
    strokes = pdf_writing_strokes(pnum, y_min=0.12, min_w=0.4)
    if not strokes:
        return finalize_answer_slots(questionnaire_slots(pnum, y_gap=0.022, y_min=0.12)[:12], prefer_line=True)
    ys = sorted(strokes, key=lambda t: t[0])
    split_at = 1
    max_gap = 0.0
    for i in range(1, len(ys)):
        gap = ys[i][0] - ys[i - 1][0]
        if gap > max_gap:
            max_gap = gap
            split_at = i
    top = ys[:split_at][:6]
    bottom = ys[split_at:][:6]
    merged = top + bottom
    return strokes_to_slots(merged)

MY_DAY = [9, 11, 13, 15, 17, 19, 23, 34, 35, 36, 37, 38, 39]
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
    '16': style_slots(),
    '18': first_love_slots(),
    '22': school_slots(),
    '24': weekly_two_day_slots(24),
    '25': weekly_two_day_slots(25),
    '26': weekly_two_day_slots(26),
    '27': sunday_slots(),
}
for p in MY_DAY:
    if p != 9:
        purple[str(p)] = my_day_slots(p)
for p in FRIENDS:
    purple[str(p)] = friend_questionnaire_slots(p)

out = ${JSON.stringify(path.join(__dirname, 'diary-purple-slot-overrides-data.json'))}
Path(out).write_text(json.dumps(purple, indent=2), encoding='utf-8')
print('Wrote', out, 'pages', len(purple))
`;

const venvPyUnix = path.join(projectRoot, '.venv/bin/python3');
const venvPyWin = path.join(projectRoot, '.venv/Scripts/python.exe');
const pyCmd = fs.existsSync(venvPyUnix)
  ? venvPyUnix
  : fs.existsSync(venvPyWin)
    ? venvPyWin
    : process.env.PYTHON || 'python';
execSync(pyCmd, { input: py, cwd: projectRoot, stdio: ['pipe', 'inherit', 'inherit'] });
