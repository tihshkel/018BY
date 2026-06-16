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
]


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


def extract_album(config: dict) -> dict[str, dict]:
    source_dir: Path = config["source_dir"]
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

        pages[str(page_no)] = {
            "variants": [
                {
                    "variantId": "one_horizontal",
                    "slots": [slot],
                }
            ]
        }

    return pages


def main() -> None:
    result: dict[str, dict] = {}
    for config in ALBUMS:
        album_pages = extract_album(config)
        result[config["album_id"]] = album_pages
        print(f"{config['album_id']}: {len(album_pages)} pages with photo placeholder")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
