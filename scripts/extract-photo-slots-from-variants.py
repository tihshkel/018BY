#!/usr/bin/env python3
"""Extract normalized photo slot coordinates from preview variant manifests.

Uses layout templates scaled into album safe zones. Output is merged into
constants/photo-slots.ts via scripts/merge-photo-slots.js.

node scripts/export-photo-pages-manifest.js  # prerequisite
python3 scripts/extract-photo-slots-from-variants.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "constants/generated/photo-slot-overrides.json"

# Safe zones (x, y top-left, width, height) — mirror constants/photo-slots.ts
SAFE_ZONES = {
    "pregnancy_60": {"x": 0.11, "y": 0.26, "width": 0.78, "height": 0.5},
    "kids_48_event": {"x": 0.08, "y": 0.2, "width": 0.84, "height": 0.6},
    "kids_p1": {"x": 0.19, "y": 0.17, "width": 0.62, "height": 0.14},
    "kids_p3": {"x": 0.15, "y": 0.27, "width": 0.7, "height": 0.22},
    "kids_p4": {"x": 0.12, "y": 0.08, "width": 0.76, "height": 0.28},
}

GAP = 0.03
MARGIN_X = 0.02

# Template slots relative to safe zone (0–1 top-left)
TEMPLATES: dict[str, list[dict]] = {
    "one_large": [{"x": 0.02, "y": 0.08, "w": 0.96, "h": 0.84, "ar": [4, 3]}],
    "one_horizontal": [{"x": 0.02, "y": 0.1, "w": 0.96, "h": 0.8, "ar": [4, 3]}],
    "two_photos": [
        {"x": 0.02, "y": 0.04, "w": 0.96, "h": 0.44, "ar": [4, 3]},
        {"x": 0.02, "y": 0.52, "w": 0.96, "h": 0.44, "ar": [4, 3]},
    ],
    "two_horizontal": [
        {"x": 0.02, "y": 0.06, "w": 0.96, "h": 0.42, "ar": [4, 3]},
        {"x": 0.02, "y": 0.52, "w": 0.96, "h": 0.42, "ar": [4, 3]},
    ],
    "two_vertical": [
        {"x": 0.02, "y": 0.08, "w": 0.46, "h": 0.84, "ar": [3, 4]},
        {"x": 0.52, "y": 0.08, "w": 0.46, "h": 0.84, "ar": [3, 4]},
    ],
    "three_hero": [
        {"x": 0.02, "y": 0.04, "w": 0.96, "h": 0.52, "ar": [4, 3]},
        {"x": 0.02, "y": 0.58, "w": 0.46, "h": 0.38, "ar": [3, 4]},
        {"x": 0.52, "y": 0.58, "w": 0.46, "h": 0.38, "ar": [3, 4]},
    ],
    "four_grid": [
        {"x": 0.02, "y": 0.04, "w": 0.46, "h": 0.44, "ar": [1, 1]},
        {"x": 0.52, "y": 0.04, "w": 0.46, "h": 0.44, "ar": [1, 1]},
        {"x": 0.02, "y": 0.52, "w": 0.46, "h": 0.44, "ar": [1, 1]},
        {"x": 0.52, "y": 0.52, "w": 0.46, "h": 0.44, "ar": [1, 1]},
    ],
    "four_vertical": [
        {"x": 0.04, "y": 0.04, "w": 0.2, "h": 0.9, "ar": [3, 4]},
        {"x": 0.28, "y": 0.04, "w": 0.2, "h": 0.9, "ar": [3, 4]},
        {"x": 0.52, "y": 0.04, "w": 0.2, "h": 0.9, "ar": [3, 4]},
        {"x": 0.76, "y": 0.04, "w": 0.2, "h": 0.9, "ar": [3, 4]},
    ],
    "one_horizontal_common": [{"x": 0.02, "y": 0.1, "w": 0.96, "h": 0.8, "ar": [4, 3]}],
    "two_vertical_separate": [
        {"x": 0.02, "y": 0.08, "w": 0.46, "h": 0.84, "ar": [3, 4]},
        {"x": 0.52, "y": 0.08, "w": 0.46, "h": 0.84, "ar": [3, 4]},
    ],
}

MANIFESTS = {
    "pregnancy_60": ROOT
    / "assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/preview_variants/pregnancy_60_variants_manifest.json",
    "kids_48": ROOT
    / "assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/preview_variants/kids_48_variants_manifest.json",
}

KIDS_SPECIAL_PAGES = {
    1: "kids_p1",
    3: "kids_p3",
    4: "kids_p4",
}


def scale_slot(safe: dict, rel: dict) -> dict:
    x = safe["x"] + rel["x"] * safe["width"]
    w = rel["w"] * safe["width"]
    h = rel["h"] * safe["height"]
    top_y = safe["y"] + rel["y"] * safe["height"]
    center_y = top_y + h / 2
    slot = {"x": round(x, 4), "y": round(center_y, 4), "width": round(w, 4), "height": round(h, 4)}
    if "ar" in rel:
        slot["aspectRatio"] = rel["ar"]
    return slot


def safe_for_page(album_id: str, page: int) -> dict:
    if album_id == "pregnancy_60":
        return SAFE_ZONES["pregnancy_60"]
    if album_id == "kids_48":
        key = KIDS_SPECIAL_PAGES.get(page)
        if key:
            return SAFE_ZONES[key]
        return SAFE_ZONES["kids_48_event"]
    return SAFE_ZONES["kids_48_event"]


def build_overrides() -> dict:
    overrides: dict = {}

    for album_id, manifest_path in MANIFESTS.items():
        if not manifest_path.exists():
            print(f"Skip {album_id}: missing manifest {manifest_path}")
            continue
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        album_overrides: dict = {}

        for page_str, variants in manifest.items():
            page = int(page_str)
            safe = safe_for_page(album_id, page)
            page_variants = []

            for variant_id in variants.keys():
                template = TEMPLATES.get(variant_id)
                if not template:
                    continue
                slots = [scale_slot(safe, rel) for rel in template]
                page_variants.append({"variantId": variant_id, "slots": slots})

            if page_variants:
                album_overrides[page_str] = {"variants": page_variants}

        overrides[album_id] = album_overrides

    return overrides


def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    data = build_overrides()
    OUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    page_count = sum(len(v) for v in data.values())
    print(f"Wrote {OUT_PATH} ({page_count} pages)")


if __name__ == "__main__":
    main()
