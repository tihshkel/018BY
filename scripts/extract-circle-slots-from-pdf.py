#!/usr/bin/env python3
"""Detect circular photo / gender-fill slots in kids_48 designer PDFs.

Outputs constants/generated/pdf-circle-slots.json

Uses the same combined PDF as page PNGs and line-slots (not per-page exports).

  .venv/bin/python3 scripts/extract-circle-slots-from-pdf.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "constants/generated/pdf-circle-slots.json"
COMBINED_PDF = ROOT / "in albums" / "Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр.pdf"

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

GENDER_FILL_SPECS = [
    ("mother_boy", "kids_48_p3_mother_guess", "Мальчик", "#89CFF0"),
    ("mother_girl", "kids_48_p3_mother_guess", "Девочка", "#F194A2"),
    ("father_boy", "kids_48_p3_father_guess", "Мальчик", "#89CFF0"),
    ("father_girl", "kids_48_p3_father_guess", "Девочка", "#F194A2"),
]

# Slight bleed so the fill fully covers the yellow ring on the design PNG.
GENDER_FILL_BLEED = 1.08
FAMILY_TREE_INNER_RATIO = 0.94


def is_yellow_ring_pixel(r: int, g: int, b: int) -> bool:
    return r > 180 and g > 120 and b < 130


def detect_gender_circles_from_pixmap(page: fitz.Page) -> list[dict]:
    """Calibrate gender fills from rendered page (matches design PNG rings)."""
    scale = 2100 / page.rect.width
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale))
    w, h = pix.width, pix.height
    samples = pix.samples

    vector_circles = detect_circle_candidates(page, min_y=0.72, max_y=0.96)
    if len(vector_circles) < 4:
        raise RuntimeError(f"Expected 4 gender circles on page 3, found {len(vector_circles)}")

    ordered_hints = sorted(vector_circles, key=lambda item: item[0])[:4]
    fills: list[dict] = []

    for (spec, hint) in zip(GENDER_FILL_SPECS, ordered_hints, strict=True):
        fill_id, field_id, option, fill_color = spec
        tcx = hint[0]
        pts: list[tuple[float, float]] = []

        for y in range(int(h * 0.78), int(h * 0.93)):
            for x in range(w):
                i = (y * w + x) * 3
                r, g, b = samples[i], samples[i + 1], samples[i + 2]
                if not is_yellow_ring_pixel(r, g, b):
                    continue
                nx, ny = x / w, y / h
                if abs(nx - tcx) > 0.055:
                    continue
                pts.append((nx, ny))

        if len(pts) >= 20:
            cx = sum(p[0] for p in pts) / len(pts)
            cy = sum(p[1] for p in pts) / len(pts)
            max_r = max(((p[0] - cx) ** 2 + (p[1] - cy) ** 2) ** 0.5 for p in pts)
            diameter = 2 * max_r * GENDER_FILL_BLEED
        else:
            cx, cy, diameter = hint
            diameter *= GENDER_FILL_BLEED

        fills.append(
            {
                "id": fill_id,
                "fieldId": field_id,
                "option": option,
                "fillColor": fill_color,
                "cx": round(cx, 4),
                "cy": round(cy, 4),
                "diameter": round(diameter, 4),
            }
        )

    return fills


def detect_gender_circles(page: fitz.Page) -> list[dict]:
    return detect_gender_circles_from_pixmap(page)


def is_peach_fill(color: tuple[float, ...] | None) -> bool:
    if color is None or len(color) < 3:
        return False
    return color[0] > 0.95 and color[1] > 0.65 and color[2] > 0.35


def detect_circle_candidates(page: fitz.Page, *, min_y: float, max_y: float) -> list[tuple[float, float, float]]:
    pw = page.rect.width
    ph = page.rect.height
    candidates: list[tuple[float, float, float]] = []

    for drawing in page.get_drawings():
        rect_raw = drawing.get("rect")
        if not rect_raw:
            continue
        rect = fitz.Rect(rect_raw)
        norm_w = rect.width / pw
        norm_h = rect.height / ph
        if norm_w < 0.04 or norm_h < 0.04:
            continue
        if abs(norm_w - norm_h) / max(norm_w, norm_h) > 0.25:
            continue

        cx = (rect.x0 + rect.x1) / 2 / pw
        cy = (rect.y0 + rect.y1) / 2 / ph
        if cy < min_y or cy > max_y:
            continue
        diameter = (norm_w + norm_h) / 2
        candidates.append((cx, cy, diameter))

    unique: list[tuple[float, float, float]] = []
    for cx, cy, diameter in sorted(candidates, key=lambda item: (item[1], item[0])):
        if any(abs(cx - u[0]) < 0.008 and abs(cy - u[1]) < 0.008 for u in unique):
            continue
        unique.append((cx, cy, diameter))

    return unique


def refine_circle_from_yellow_ring(
    hint_cx: float,
    hint_cy: float,
    hint_diameter: float,
    samples: bytes,
    w: int,
    h: int,
) -> tuple[float, float, float]:
    """Snap slot center/diameter to the visible yellow ring on the rendered page."""
    search_r = hint_diameter * 0.7
    xmin = max(0, int((hint_cx - search_r) * w))
    xmax = min(w, int((hint_cx + search_r) * w))
    ymin = max(0, int((hint_cy - search_r) * h))
    ymax = min(h, int((hint_cy + search_r) * h))
    pts: list[tuple[float, float]] = []

    for y in range(ymin, ymax):
        for x in range(xmin, xmax):
            i = (y * w + x) * 3
            r, g, b = samples[i], samples[i + 1], samples[i + 2]
            if not is_yellow_ring_pixel(r, g, b):
                continue
            pts.append((x / w, y / h))

    if len(pts) < 24:
        return hint_cx, hint_cy, hint_diameter

    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    max_r = max(((p[0] - cx) ** 2 + (p[1] - cy) ** 2) ** 0.5 for p in pts)
    diameter = 2 * max_r * FAMILY_TREE_INNER_RATIO
    return cx, cy, diameter


def detect_family_tree_circles(page: fitz.Page) -> list[dict]:
    pw = page.rect.width
    ph = page.rect.height
    peach: list[tuple[float, float, float]] = []
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
        peach.append((cx, cy, diameter))

    unique: list[tuple[float, float, float]] = []
    for cx, cy, diameter in sorted(peach, key=lambda item: (item[1], item[0])):
        if any(abs(cx - u[0]) < 0.008 and abs(cy - u[1]) < 0.008 for u in unique):
            continue
        unique.append((cx, cy, diameter))

    if not unique:
        raise RuntimeError("No family-tree peach circles detected on page 5")

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

    scale = 2100 / page.rect.width
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale))
    w, h = pix.width, pix.height
    samples = pix.samples

    slots: list[dict] = []
    for index, (cx, cy, diameter) in enumerate(ordered):
        cx, cy, diameter = refine_circle_from_yellow_ring(cx, cy, diameter, samples, w, h)
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


def open_combined_page(page_no: int) -> fitz.Page:
    if not COMBINED_PDF.exists():
        raise FileNotFoundError(f"Missing combined kids PDF: {COMBINED_PDF}")
    doc = fitz.open(COMBINED_PDF)
    if page_no < 1 or page_no > doc.page_count:
        raise IndexError(f"Page {page_no} out of range (1..{doc.page_count})")
    return doc[page_no - 1]


def main() -> None:
    page3 = open_combined_page(3)
    page5 = open_combined_page(5)

    gender_fills = detect_gender_circles(page3)
    tree_slots = detect_family_tree_circles(page5)
    print(f"kids_48 p3: {len(gender_fills)} gender fill targets")
    print(f"kids_48 p5: {len(tree_slots)} circle photo slots")

    result = {
        "kids_48": {
            "3": {"genderFills": gender_fills},
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
