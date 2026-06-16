#!/usr/bin/env python3
"""Detect circular photo / gender-fill slots in kids_48 designer PDFs.

Outputs constants/generated/pdf-circle-slots.json

  .venv/bin/python3 scripts/extract-circle-slots-from-pdf.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "constants/generated/pdf-circle-slots.json"
SOURCE_DIR = ROOT / "in albums/pdf new"
PAGE_REGEX = re.compile(r"Сва_(\d+)\.pdf$", re.IGNORECASE)

FAMILY_TREE_NAMED_SLOTS: list[tuple[str, str]] = [
    ("child", "child"),
    ("mother_great_grandmother", "mother"),
    ("mother_great_grandfather", "mother"),
    ("mother_grandmother", "mother"),
    ("mother_grandfather", "mother"),
    ("father_great_grandmother", "father"),
    ("father_great_grandfather", "father"),
    ("father_grandmother", "father"),
    ("father_grandfather", "father"),
]

GENDER_FILLS = [
    {
        "id": "mother_boy",
        "fieldId": "kids_48_p3_mother_guess",
        "option": "Мальчик",
        "fillColor": "#89CFF0",
        "cx": 0.2352,
        "cy": 0.8543,
        "diameter": 0.0714,
    },
    {
        "id": "mother_girl",
        "fieldId": "kids_48_p3_mother_guess",
        "option": "Девочка",
        "fillColor": "#F194A2",
        "cx": 0.3445,
        "cy": 0.8543,
        "diameter": 0.0714,
    },
    {
        "id": "father_boy",
        "fieldId": "kids_48_p3_father_guess",
        "option": "Мальчик",
        "fillColor": "#89CFF0",
        "cx": 0.6732,
        "cy": 0.8543,
        "diameter": 0.0714,
    },
    {
        "id": "father_girl",
        "fieldId": "kids_48_p3_father_guess",
        "option": "Девочка",
        "fillColor": "#F194A2",
        "cx": 0.7808,
        "cy": 0.8543,
        "diameter": 0.0714,
    },
]


def is_peach_fill(color: tuple[float, ...] | None) -> bool:
    if color is None or len(color) < 3:
        return False
    return color[0] > 0.95 and color[1] > 0.65 and color[2] > 0.35


def is_peach_stroke(color: tuple[float, ...] | None) -> bool:
    if color is None or len(color) < 3:
        return False
    return color[0] > 0.95 and color[1] > 0.65 and color[2] > 0.35


def detect_family_tree_circles(page: fitz.Page) -> list[dict]:
    pw = page.rect.width
    ph = page.rect.height
    candidates: list[tuple[float, float, float]] = []

    for drawing in page.get_drawings():
        rect_raw = drawing.get("rect")
        if not rect_raw:
            continue
        if drawing.get("type") != "fs":
            continue
        fill = drawing.get("fill")
        if not is_peach_fill(fill):
            continue

        rect = fitz.Rect(rect_raw)
        norm_w = rect.width / pw
        norm_h = rect.height / ph
        if norm_w < 0.05 or norm_h < 0.05:
            continue
        if abs(norm_w - norm_h) / max(norm_w, norm_h) > 0.15:
            continue

        cx = (rect.x0 + rect.x1) / 2 / pw
        cy = (rect.y0 + rect.y1) / 2 / ph
        diameter = (norm_w + norm_h) / 2
        candidates.append((cx, cy, diameter))

    # Deduplicate near-identical positions
    unique: list[tuple[float, float, float]] = []
    for cx, cy, diameter in sorted(candidates, key=lambda item: (item[1], item[0])):
        if any(abs(cx - u[0]) < 0.008 and abs(cy - u[1]) < 0.008 for u in unique):
            continue
        unique.append((cx, cy, diameter))

    # Assign slot ids by tree geometry: child on top, left branch = mother, right = father
    child = min(unique, key=lambda item: item[1])
    remaining = [item for item in unique if item is not child]
    mother_branch = sorted([item for item in remaining if item[0] < 0.45], key=lambda item: item[1])
    father_branch = sorted([item for item in remaining if item[0] > 0.55], key=lambda item: item[1])
    center_branch = sorted(
        [item for item in remaining if item not in mother_branch and item not in father_branch],
        key=lambda item: (item[1], item[0]),
    )

    ordered: list[tuple[float, float, float]] = [child]
    ordered.extend(mother_branch[:4])
    ordered.extend(father_branch[:4])
    ordered.extend(mother_branch[4:])
    ordered.extend(father_branch[4:])
    ordered.extend(center_branch)

    slots: list[dict] = []
    for index, (cx, cy, diameter) in enumerate(ordered):
        if index < len(FAMILY_TREE_NAMED_SLOTS):
            slot_id, branch = FAMILY_TREE_NAMED_SLOTS[index]
        else:
            extra_index = index - len(FAMILY_TREE_NAMED_SLOTS) + 1
            side = "mother" if cx < 0.45 else "father" if cx > 0.55 else "child"
            slot_id, branch = (f"extra_{extra_index:02d}", side)
        slots.append(
            {
                "slotId": slot_id,
                "branch": branch,
                "x": round(cx, 4),
                "y": round(cy, 4),
                "width": round(diameter, 4),
                "height": round(diameter, 4),
                "shape": "circle",
            }
        )

    return slots


def open_page(page_no: int) -> fitz.Page | None:
    if not SOURCE_DIR.exists():
        return None
    for pdf_path in SOURCE_DIR.glob("*.pdf"):
        match = PAGE_REGEX.search(pdf_path.name)
        if not match or int(match.group(1)) != page_no:
            continue
        doc = fitz.open(pdf_path)
        page = doc[0]
        return page
    return None


def main() -> None:
    page5 = open_page(5)
    if page5 is None:
        print("Missing kids_48 page 5 PDF", file=sys.stderr)
        sys.exit(1)

    tree_slots = detect_family_tree_circles(page5)
    print(f"kids_48 p5: {len(tree_slots)} circle photo slots")

    result = {
        "kids_48": {
            "3": {"genderFills": GENDER_FILLS},
            "5": {
                "slots": tree_slots,
                "variants": [
                    {
                        "variantId": "tree",
                        "slots": tree_slots,
                    }
                ],
            },
        }
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
