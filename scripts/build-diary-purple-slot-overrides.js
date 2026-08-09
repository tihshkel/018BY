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
    # Правила — static non_editable, без полей ввода.
    return []

def girl_profile_slots():
    all_rows = questionnaire_slots(5, y_gap=0.034, y_min=0.225)
    main = [s for s in all_rows if s['y'] <= 0.72][:11]
    career_rows = [s for s in all_rows if s['y'] >= 0.755 and s['width'] > 0.5]
    slots = list(main)
    if career_rows:
        slots.append({**career_rows[0], 'inputKind': 'line'})
    return finalize_answer_slots(slots[:12])

def parent_profile_slots(pnum):
    rows = questionnaire_slots(pnum, y_gap=0.034, y_min=0.20)
    # 12 ответов-хвостов до блока «Пожелания…»
    answer = [s for s in rows if s['y'] < 0.76][:12]
    # PDF: 1-я строка пожеланий — правый хвост после подписи; ниже 2 полные линии.
    # Старый код брал левую полосу подписи (x≈0.09) → текст налазил на статику.
    if pnum == 6:
        wish_raw = [
            (0.5127, 0.7717, 0.4047, True),
            (0.0863, 0.8069, 0.8307, False),
            (0.0865, 0.8429, 0.8313, False),
        ]
    else:
        wish_raw = [
            (0.5244, 0.7717, 0.3934, True),
            (0.0871, 0.8069, 0.8307, False),
            (0.0865, 0.8429, 0.8313, False),
        ]
    wishes = []
    for i, (x, y, w, tail) in enumerate(wish_raw):
        slot = slot_dict(y, x, w, 0.028, len(answer) + i, 'line')
        if tail:
            slot['inlineLabelTail'] = True
        wishes.append(slot)
    return finalize_answer_slots(answer + wishes, prefer_line=True)

def hobby_slots():
    # PDF p8: не брать полосу под интро (0.1749) и подписи-fill слева.
    # 2+2+1 верхних ответа + 11 хвостов «любимый …».
    raw = [
        # хобби: хвост + полная
        (0.4018, 0.2288, 0.5178, True),
        (0.0863, 0.2627, 0.8350, False),
        # спорт: короткий хвост после длинного вопроса + полная
        (0.7068, 0.2996, 0.2130, True),
        (0.0874, 0.3311, 0.8335, False),
        # одна: только полная линия под вопросом (хвоста в PDF нет)
        (0.0874, 0.4047, 0.8335, False),
        # избранное — правые хвосты после подписей
        (0.3703, 0.4382, 0.5499, True),  # фильм
        (0.4230, 0.4756, 0.4972, True),  # сериал
        (0.2857, 0.5095, 0.6345, True),  # актёр
        (0.3052, 0.5430, 0.6150, True),  # актриса
        (0.3750, 0.5812, 0.5452, True),  # мультфильм
        (0.3926, 0.6122, 0.5230, True),  # книга
        (0.4874, 0.6476, 0.4303, True),  # писатель
        (0.5433, 0.6817, 0.3745, True),  # стиль музыки (не левый fill 0.6922)
        (0.2934, 0.7176, 0.6245, True),  # певица
        (0.3042, 0.7477, 0.6136, True),  # певец
        (0.4421, 0.7846, 0.4768, True),  # группа
    ]
    slots = []
    for i, (x, y, w, tail) in enumerate(raw):
        slot = slot_dict(y, x, w, 0.028, i, 'line')
        if tail:
            slot['inlineLabelTail'] = True
        slots.append(slot)
    return finalize_answer_slots(slots, prefer_line=True)

def my_day_slots(pnum=9):
    # Полные линии слева (не правый хвост «Напиши или…»). 8 story + 4 smile.
    # Координаты: tip 6858f3d (PDF writing strokes), smile обрезан по блоку (~4 линии).
    story = [
        (0.1107, 0.2756, 0.8085),
        (0.1107, 0.3112, 0.8085),
        (0.1107, 0.3488, 0.8085),
        (0.1107, 0.3819, 0.8085),
        (0.1107, 0.4165, 0.8085),
        (0.1107, 0.4494, 0.8085),
        (0.1107, 0.4806, 0.8085),
        (0.1107, 0.5162, 0.8085),
    ]
    smile = [
        (0.1475, 0.7292, 0.7315),
        (0.1475, 0.7648, 0.7315),
        (0.1475, 0.8024, 0.7315),
        (0.1475, 0.8361, 0.7315),
    ]
    if pnum >= 34:
        story = [
            (0.1107, 0.2756, 0.8085),
            (0.1107, 0.3099, 0.8085),
            (0.1107, 0.3443, 0.8085),
            (0.1107, 0.3787, 0.8085),
            (0.1107, 0.4131, 0.8085),
            (0.1107, 0.4474, 0.8085),
            (0.1107, 0.4818, 0.8085),
            (0.1107, 0.5162, 0.8085),
        ]
    raw = story + smile
    return finalize_answer_slots(
        [slot_dict(y, x, w, 0.028, i, 'line') for i, (x, y, w) in enumerate(raw)],
        prefer_line=True,
    )

def pets_slots():
    # PDF p10: только правые хвосты / полные линии ответа.
    # Не брать fill под вопросами и футер-цитату (y≈0.84–0.88).
    raw = [
        (0.3689, 0.3047, 0.5468, True),   # любишь животных?
        (0.6606, 0.3408, 0.2539, True),   # какие нравятся (хвост после длинного Q)
        (0.3602, 0.3729, 0.5560, True),   # есть питомцы?
        (0.3131, 0.4062, 0.6031, True),   # клички
        (0.4881, 0.4429, 0.4282, True),   # порода
        (0.6280, 0.4757, 0.2882, True),   # история — хвост
        (0.0867, 0.5074, 0.8296, False),  # история — полная 1
        (0.0867, 0.5410, 0.8296, False),  # история — полная 2
        (0.6192, 0.5821, 0.2970, True),   # уход — хвост
        (0.0869, 0.6149, 0.8293, False),  # уход — полная
        (0.0869, 0.6864, 0.8304, False),  # кого завести — полная под Q
    ]
    slots = []
    for i, (x, y, w, tail) in enumerate(raw):
        slot = slot_dict(y, x, w, 0.028, i, 'line')
        if tail:
            slot['inlineLabelTail'] = True
        slots.append(slot)
    return finalize_answer_slots(slots, prefer_line=True)

def social_slots():
    # PDF p12: правые хвосты после вопросов + полные продолжения + Instagram/VK/TikTok.
    # Не брать fill под вопросами/интро (иначе текст налазит на статику).
    raw = [
        (0.6325, 0.2851, 0.2867, True),   # много времени в интернете?
        (0.6595, 0.3208, 0.2597, True),   # чем занимаешься?
        (0.0855, 0.3915, 0.8336, False),  # самое интересное (полная под Q)
        (0.6691, 0.4227, 0.2500, True),   # любимая соцсеть?
        (0.4865, 0.4912, 0.4391, True),   # youtube-каналы
        (0.3949, 0.5242, 0.5242, True),   # блогеры — хвост
        (0.0869, 0.5573, 0.8322, False),  # блогеры — полная
        (0.4981, 0.5929, 0.4210, True),   # нравится фотографировать?
        (0.5442, 0.6272, 0.3749, True),   # что фотографируешь — хвост
        (0.0859, 0.6667, 0.8332, False),  # что фотографируешь — полная
        (0.4845, 0.7106, 0.4347, True),   # ники — хвост
        (0.0861, 0.7498, 0.8330, False),  # ники — полная
        (0.2479, 0.8016, 0.3395, True),   # Instagram
        (0.2572, 0.8408, 0.3302, True),   # ВКонтакте
        (0.2258, 0.8808, 0.3616, True),   # TikTok
    ]
    slots = []
    for i, (x, y, w, tail) in enumerate(raw):
        slot = slot_dict(y, x, w, 0.028, i, 'line')
        if tail:
            slot['inlineLabelTail'] = True
        slots.append(slot)
    return finalize_answer_slots(slots, prefer_line=True)

def mood_slots():
    # PDF p14: хвосты после вопросов + полные продолжения + список 1–4.
    # Не брать fill интро (y≈0.20–0.27) и полосы под вопросами.
    raw = [
        (0.4327, 0.3188, 0.4864, True),   # что/кто смешит?
        (0.3576, 0.3540, 0.5615, True),   # любишь комедии?
        (0.3943, 0.3884, 0.5248, True),   # любимая комедия
        (0.6192, 0.4241, 0.2999, True),   # youtube? — хвост
        (0.0844, 0.4574, 0.8348, False),  # youtube — полная
        (0.5598, 0.4947, 0.3596, True),   # какие видео? — хвост
        (0.0844, 0.5275, 0.8348, False),  # какие видео — полная
        (0.5327, 0.5603, 0.3866, True),   # кто самый весёлый? — хвост
        (0.0871, 0.5957, 0.8296, False),  # кто самый весёлый — полная
        (0.1120, 0.6640, 0.8047, False),  # список 1
        (0.1120, 0.6993, 0.8047, False),  # список 2
        (0.1167, 0.7314, 0.8000, False),  # список 3
        (0.1120, 0.7656, 0.8047, False),  # список 4
    ]
    slots = []
    for i, (x, y, w, tail) in enumerate(raw):
        slot = slot_dict(y, x, w, 0.028, i, 'line')
        if tail:
            slot['inlineLabelTail'] = True
        slots.append(slot)
    return finalize_answer_slots(slots, prefer_line=True)

def style_slots():
    # PDF p16: тонкие stroke-линии после вопросов + 4 линии «модных мечт».
    # Не брать fill статики (интро y≈0.22–0.26, подписи вопросов, промпт мечт y≈0.73–0.77)
    # и разделитель y=0.6632.
    raw = [
        (0.5347, 0.3114, 0.3844, True),   # следишь за трендами?
        (0.5640, 0.3460, 0.3541, True),   # удобная одежда?
        (0.7059, 0.3807, 0.2133, True),   # сочетания цветов?
        (0.4925, 0.4154, 0.4267, True),   # для дома
        (0.4925, 0.4501, 0.4267, True),   # для праздника
        (0.6222, 0.4847, 0.2970, True),   # прогулка с друзьями
        (0.4372, 0.5194, 0.4819, True),   # для школы
        (0.6073, 0.5541, 0.3118, True),   # украшения?
        (0.0850, 0.8044, 0.5957, False),  # модные мечты 1
        (0.0850, 0.8531, 0.5957, False),  # модные мечты 2
        (0.0850, 0.9026, 0.5957, False),  # модные мечты 3
        (0.0850, 0.9573, 0.5957, False),  # модные мечты 4
    ]
    slots = []
    for i, (x, y, w, tail) in enumerate(raw):
        slot = slot_dict(y, x, w, 0.028, i, 'line')
        if tail:
            slot['inlineLabelTail'] = True
        slots.append(slot)
    return finalize_answer_slots(slots, prefer_line=True)

def first_love_slots():
    # PDF p18: тонкие stroke-линии после вопросов + продолжения + блок внизу у сердца.
    # Не брать fill интро (y≈0.22–0.25) и ободряющий абзац (y≈0.64–0.70).
    raw = [
        (0.6601, 0.3084, 0.2605, True),   # качества в людях — хвост
        (0.0882, 0.3399, 0.8325, False),  # качества — полная
        (0.5764, 0.3744, 0.3443, True),   # любовь с первого взгляда?
        (0.4183, 0.4048, 0.5023, True),   # что такое любовь? — хвост
        (0.0882, 0.4446, 0.8324, False),  # что такое любовь — полная
        (0.5649, 0.4685, 0.3558, True),   # симпатичный в классе?
        (0.7213, 0.5004, 0.1993, True),   # знаки внимания? — хвост
        (0.0871, 0.5327, 0.8336, False),  # знаки внимания — полная
        (0.5095, 0.5649, 0.4111, True),   # кому ты нравишься?
        (0.3772, 0.5949, 0.5435, True),   # почему так считаешь?
        (0.0875, 0.7336, 0.8312, False),  # дополнительно 1
        (0.0875, 0.7764, 0.6321, False),  # дополнительно 2
        (0.0875, 0.8192, 0.6321, False),  # дополнительно 3
        (0.0875, 0.8620, 0.6321, False),  # дополнительно 4
        (0.0875, 0.9048, 0.6321, False),  # дополнительно 5
    ]
    slots = []
    for i, (x, y, w, tail) in enumerate(raw):
        slot = slot_dict(y, x, w, 0.028, i, 'line')
        if tail:
            slot['inlineLabelTail'] = True
        slots.append(slot)
    return finalize_answer_slots(slots, prefer_line=True)

def school_slots():
    # PDF p22: тонкие stroke-линии после вопросов + продолжения + 4 линии события.
    # Не брать fill интро (y≈0.22–0.29) и промпт «Расскажи…» (y≈0.74–0.77).
    raw = [
        (0.4990, 0.3470, 0.4218, True),   # нравится учиться? — хвост
        (0.0867, 0.3836, 0.8325, False),  # нравится учиться — полная
        (0.4386, 0.4262, 0.4803, True),   # любимый предмет
        (0.3192, 0.4715, 0.5999, True),   # любимый учитель
        (0.5179, 0.5155, 0.4012, True),   # сколько человек в классе?
        (0.5382, 0.5595, 0.3809, True),   # с кем дружишь?
        (0.6512, 0.6035, 0.2679, True),   # мероприятия — хвост
        (0.0856, 0.6474, 0.8336, False),  # мероприятия — полная
        (0.6743, 0.6914, 0.2448, True),   # на перемене — хвост
        (0.0870, 0.7322, 0.8336, False),  # на перемене — полная
        (0.0875, 0.8201, 0.5529, False),  # событие 1
        (0.0875, 0.8641, 0.5529, False),  # событие 2
        (0.0875, 0.9081, 0.5529, False),  # событие 3
        (0.0875, 0.9527, 0.5529, False),  # событие 4
    ]
    slots = []
    for i, (x, y, w, tail) in enumerate(raw):
        slot = slot_dict(y, x, w, 0.028, i, 'line')
        if tail:
            slot['inlineLabelTail'] = True
        slots.append(slot)
    return finalize_answer_slots(slots, prefer_line=True)

def sunday_slots():
    # PDF p27: 6 линий в блоке «Воскресенье» + 9 линий заметок ниже.
    # Старый фильтр y_min=0.20 отрезал первую строку (0.1789) → текст со 2-й;
    # wide[:5] без низа → пустой блок под воскресеньем.
    raw = [
        (0.0865, 0.1789, 0.8318),
        (0.0865, 0.2229, 0.8318),
        (0.0865, 0.2669, 0.8318),
        (0.2993, 0.3108, 0.6190),
        (0.3477, 0.3548, 0.5706),
        (0.3232, 0.3988, 0.5923),
        (0.1107, 0.5833, 0.7798),
        (0.1107, 0.6181, 0.7798),
        (0.1107, 0.6528, 0.7798),
        (0.1107, 0.6876, 0.7798),
        (0.1107, 0.7224, 0.7798),
        (0.1107, 0.7572, 0.7798),
        (0.1107, 0.7920, 0.7798),
        (0.1107, 0.8267, 0.7798),
        (0.1107, 0.8615, 0.7798),
    ]
    return finalize_answer_slots(
        [slot_dict(y, x, w, 0.028, i, 'line') for i, (x, y, w) in enumerate(raw)],
        prefer_line=True,
    )

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
    '16': style_slots(),
    '18': first_love_slots(),
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
const venvPyWin = path.join(projectRoot, '.venv/Scripts/python.exe');
const pyCmd = fs.existsSync(venvPy)
  ? venvPy
  : fs.existsSync(venvPyWin)
    ? venvPyWin
    : process.platform === 'win32'
      ? 'python'
      : 'python3';
execSync(pyCmd, { input: py, cwd: projectRoot, stdio: ['pipe', 'inherit', 'inherit'] });
