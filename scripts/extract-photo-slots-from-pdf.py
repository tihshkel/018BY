#!/usr/bin/env python3
"""Detect «Место для фото» placeholder frames in designer PDFs (gray stroke rounded rect).

Outputs constants/generated/pdf-photo-slots.json for runtime photo-block enrichment.

Requires: .venv with pymupdf (python3 -m venv .venv && .venv/bin/pip install pymupdf)

  .venv/bin/python3 scripts/extract-photo-slots-from-pdf.py
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "constants/generated/pdf-photo-slots.json"

ALBUMS = [
    {
        "album_id": "pregnancy_60",
        "source_dir": ROOT / "in albums/беременность 180х240",
        "page_regex": re.compile(r"(\d+)\s+бва\.pdf$", re.IGNORECASE),
        "max_page": 60,
    },
    {
        "album_id": "kids_48",
        "source_dir": ROOT / "in albums/pdf new",
        "page_regex": re.compile(r"Сва_(\d+)\.pdf$", re.IGNORECASE),
        "max_page": 48,
    },
    {
        "album_id": "diary_interior_brown",
        "source_dir": ROOT / "in albums/ЛД 180х240",
        "page_regex": re.compile(r"(\d+)\s*\.pdf$", re.IGNORECASE),
        "max_page": 60,
    },
    {
        "album_id": "diary_interior_purple",
        "source_dir": ROOT / "in albums/ЛД А5",
        "page_regex": re.compile(r"(\d+)\s*\.pdf$", re.IGNORECASE),
        "max_page": 40,
    },
    {
        "album_id": "pregnancy_a5",
        "block_pdf": ROOT / "in albums/Блок БЕРЕМЕННОСТЬ A5 другой блок.pdf",
        "max_page": 48,
    },
    {
        "album_id": "holidays_birthday_60",
        "block_pdf": ROOT / "in albums/Блок ДНЕЙ РОЖДЕНИЯ готов.pdf",
        "max_page": 60,
    },
]


def normalize_path(path: Path) -> Path:
    if path.exists():
        return path
    parent = path.parent
    if not parent.exists():
        return path
    target_name = unicodedata.normalize("NFC", path.name)
    for child in parent.iterdir():
        if unicodedata.normalize("NFC", child.name) == target_name:
            return child
    return path


def is_photo_stroke(color: tuple[float, ...] | None, stroke_w: float | None) -> bool:
    if color is None or stroke_w is None:
        return False
    if stroke_w < 0.1:
        return False
    return all(0.45 < channel < 0.58 for channel in color[:3])


def detect_photo_slot(page: fitz.Page) -> dict[str, float] | None:
    pw = page.rect.width
    ph = page.rect.height
    candidates: list[tuple[float, float, float, float, float]] = []

    for drawing in page.get_drawings():
        rect_raw = drawing.get("rect")
        if not rect_raw:
            continue
        if not is_photo_stroke(drawing.get("color"), drawing.get("width")):
            continue

        rect = fitz.Rect(rect_raw)
        norm_w = rect.width / pw
        norm_h = rect.height / ph
        if not (0.35 < norm_w < 0.95 and 0.08 < norm_h < 0.8):
            continue

        center_x = (rect.x0 + rect.x1) / 2 / pw
        center_y = (rect.y0 + rect.y1) / 2 / ph
        left_x = center_x - norm_w / 2
        score = norm_w * norm_h
        candidates.append((score, left_x, center_y, norm_w, norm_h))

    if not candidates:
        return None

    _, left_x, center_y, norm_w, norm_h = max(candidates, key=lambda item: item[0])
    aspect = 4 / 3 if norm_w >= norm_h else 3 / 4
    return {
        "x": round(left_x, 4),
        "y": round(center_y, 4),
        "width": round(norm_w, 4),
        "height": round(norm_h, 4),
        "aspectRatio": [4, 3] if aspect >= 1 else [3, 4],
    }


def slot_entry(slot: dict[str, float]) -> dict:
    return {
        "variants": [
            {
                "variantId": "one_horizontal",
                "slots": [slot],
            }
        ]
    }


def extract_album_from_folder(config: dict) -> dict[str, dict]:
    source_dir = normalize_path(config["source_dir"])
    pages: dict[str, dict] = {}

    if not source_dir.exists():
        print(f"Skip {config['album_id']}: missing {source_dir}", file=sys.stderr)
        return pages

    for pdf_path in sorted(source_dir.glob("*.pdf")):
        match = config["page_regex"].search(pdf_path.name)
        if not match:
            continue
        page_no = int(match.group(1))
        if page_no < 1 or page_no > config["max_page"]:
            continue

        doc = fitz.open(pdf_path)
        slot = detect_photo_slot(doc[0])
        doc.close()
        if not slot:
            continue

        pages[str(page_no)] = slot_entry(slot)

    return pages


def extract_album_from_block_pdf(config: dict) -> dict[str, dict]:
    block_pdf = normalize_path(config["block_pdf"])
    pages: dict[str, dict] = {}

    if not block_pdf.exists():
        print(f"Skip {config['album_id']}: missing {block_pdf}", file=sys.stderr)
        return pages

    doc = fitz.open(block_pdf)
    max_page = min(config["max_page"], doc.page_count)
    for page_no in range(1, max_page + 1):
        slot = detect_photo_slot(doc[page_no - 1])
        if not slot:
            continue
        pages[str(page_no)] = slot_entry(slot)
    doc.close()

    return pages


def extract_album(config: dict) -> dict[str, dict]:
    if "block_pdf" in config:
        return extract_album_from_block_pdf(config)
    return extract_album_from_folder(config)


def derive_pregnancy_a5_from_60(pregnancy_60: dict[str, dict]) -> dict[str, dict]:
    """Map pregnancy_60 PDF slots onto A5 weekly pages when block PDF has no detectable frames."""

    def week_for_a5_page(page_no: int) -> int | None:
        if 5 <= page_no <= 13:
            return page_no + 1
        if 15 <= page_no <= 28:
            return page_no
        if 30 <= page_no <= 43:
            return page_no - 1
        return None

    def page_60_for_week(week: int) -> int | None:
        if 6 <= week <= 14:
            return week + 3
        if 15 <= week <= 28:
            return week + 4
        if 29 <= week <= 42:
            return week + 5
        return None

    pages: dict[str, dict] = {}
    for page_no in range(1, 49):
        week = week_for_a5_page(page_no)
        if week is None:
            continue
        source_page = page_60_for_week(week)
        if source_page is None:
            continue
        slot = pregnancy_60.get(str(source_page))
        if slot:
            pages[str(page_no)] = slot

    if pregnancy_60.get("56"):
        pages["48"] = pregnancy_60["56"]
    elif pregnancy_60.get("57"):
        pages["48"] = pregnancy_60["57"]

    return pages


PREGNANCY_60_PHOTO_OVERRIDES: dict[str, dict] = {
    "6": {
        "variants": [
            {
                "variantId": "one_horizontal",
                "slots": [
                    {
                        "x": 0.125,
                        "y": 0.732,
                        "width": 0.75,
                        "height": 0.22,
                        "aspectRatio": [4, 3],
                    }
                ],
            }
        ]
    },
}


def apply_pregnancy_60_overrides(pages: dict[str, dict]) -> None:
    for page_key, layout in PREGNANCY_60_PHOTO_OVERRIDES.items():
        pages[page_key] = layout


def main() -> None:
    result: dict[str, dict] = {}
    for config in ALBUMS:
        album_pages = extract_album(config)
        if config["album_id"] == "pregnancy_60":
            apply_pregnancy_60_overrides(album_pages)
        result[config["album_id"]] = album_pages
        print(f"{config['album_id']}: {len(album_pages)} pages with photo placeholder")

    if not result.get("pregnancy_a5") and result.get("pregnancy_60"):
        result["pregnancy_a5"] = derive_pregnancy_a5_from_60(result["pregnancy_60"])
        print(
            f"pregnancy_a5: {len(result['pregnancy_a5'])} pages derived from pregnancy_60 slots",
        )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
